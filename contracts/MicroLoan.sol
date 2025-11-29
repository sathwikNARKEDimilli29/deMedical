// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./UserRegistry.sol";
import "./CreditScore.sol";

/**
 * @title MicroLoan
 * @dev Healthcare micro-loans with credit score integration
 */
contract MicroLoan is ReentrancyGuard {
    
    UserRegistry public userRegistry;
    CreditScore public creditScore;
    
    struct Loan {
        uint256 id;
        address borrower;
        uint256 principal;
        uint256 interestRate; // Basis points (100 = 1%)
        uint256 duration; // In days
        uint256 amountRepaid;
        uint256 startTime;
        uint256 dueDate;
        LoanStatus status;
        string purpose;
        string ipfsHash; // Medical bills/documents
    }
    
    enum LoanStatus { PENDING, ACTIVE, REPAID, DEFAULTED }
    
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;
    
    uint256 public loanCount;
    uint256 public constant MIN_CREDIT_SCORE = 400;
    uint256 public constant MAX_LOAN_AMOUNT = 10 ether;
    uint256 public constant MIN_LOAN_AMOUNT = 0.01 ether;
    uint256 public poolBalance;
    
    event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanApproved(uint256 indexed loanId);
    event LoanRepayment(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanRepaid(uint256 indexed loanId);
    event LoanDefaulted(uint256 indexed loanId);
    event PoolFunded(address indexed funder, uint256 amount);
    
    constructor(address _userRegistry, address _creditScore) {
        userRegistry = UserRegistry(_userRegistry);
        creditScore = CreditScore(_creditScore);
    }
    
    function fundPool() external payable {
        poolBalance += msg.value;
        emit PoolFunded(msg.sender, msg.value);
    }
    
    function requestLoan(
        uint256 _amount,
        uint256 _duration,
        string memory _purpose,
        string memory _ipfsHash
    ) external nonReentrant returns (uint256) {
        require(userRegistry.isUserKYCVerified(msg.sender), "KYC verification required");
        require(_amount >= MIN_LOAN_AMOUNT && _amount <= MAX_LOAN_AMOUNT, "Invalid loan amount");
        require(_duration >= 7 && _duration <= 365, "Duration must be 7-365 days");
        
        uint256 userCreditScore = creditScore.getCreditScore(msg.sender);
        if (userCreditScore == 0) {
            creditScore.initializeCreditScore(msg.sender);
            userCreditScore = 500; // Default score
        }
        
        require(userCreditScore >= MIN_CREDIT_SCORE, "Credit score too low");
        
        // Calculate interest rate based on credit score
        uint256 interestRate = calculateInterestRate(userCreditScore);
        
        loanCount++;
        
        loans[loanCount] = Loan({
            id: loanCount,
            borrower: msg.sender,
            principal: _amount,
            interestRate: interestRate,
            duration: _duration,
            amountRepaid: 0,
            startTime: 0,
            dueDate: 0,
            status: LoanStatus.PENDING,
            purpose: _purpose,
            ipfsHash: _ipfsHash
        });
        
        borrowerLoans[msg.sender].push(loanCount);
        
        emit LoanRequested(loanCount, msg.sender, _amount);
        
        // Auto-approve if sufficient pool balance
        if (poolBalance >= _amount) {
            _approveLoan(loanCount);
        }
        
        return loanCount;
    }
    
    function _approveLoan(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.PENDING, "Loan not pending");
        require(poolBalance >= loan.principal, "Insufficient pool balance");
        
        loan.status = LoanStatus.ACTIVE;
        loan.startTime = block.timestamp;
        loan.dueDate = block.timestamp + (loan.duration * 1 days);
        
        poolBalance -= loan.principal;
        
        // Transfer loan amount to borrower
        (bool success, ) = loan.borrower.call{value: loan.principal}("");
        require(success, "Transfer failed");
        
        emit LoanApproved(_loanId);
    }
    
    function repayLoan(uint256 _loanId) external payable nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Not the borrower");
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");
        
        uint256 totalOwed = calculateTotalOwed(_loanId);
        uint256 remaining = totalOwed - loan.amountRepaid;
        
        require(msg.value <= remaining, "Overpayment");
        
        loan.amountRepaid += msg.value;
        poolBalance += msg.value;
        
        bool onTime = block.timestamp <= loan.dueDate;
        
        emit LoanRepayment(_loanId, msg.sender, msg.value);
        
        // Record payment for credit score
        creditScore.recordPayment(msg.sender, onTime);
        
        if (loan.amountRepaid >= totalOwed) {
            loan.status = LoanStatus.REPAID;
            creditScore.recordLoan(msg.sender, true);
            emit LoanRepaid(_loanId);
        }
    }
    
    function markDefault(uint256 _loanId) external {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");
        require(block.timestamp > loan.dueDate + 30 days, "Not yet defaulted");
        
        loan.status = LoanStatus.DEFAULTED;
        creditScore.recordLoan(loan.borrower, false);
        
        emit LoanDefaulted(_loanId);
    }
    
    function calculateInterestRate(uint256 _creditScore) public pure returns (uint256) {
        // Better credit score = lower interest rate
        // Score 900: 5% APR
        // Score 500: 15% APR
        // Score 300: 25% APR
        
        if (_creditScore >= 800) return 500; // 5%
        if (_creditScore >= 700) return 800; // 8%
        if (_creditScore >= 600) return 1200; // 12%
        if (_creditScore >= 500) return 1500; // 15%
        if (_creditScore >= 400) return 2000; // 20%
        return 2500; // 25%
    }
    
    function calculateTotalOwed(uint256 _loanId) public view returns (uint256) {
        Loan memory loan = loans[_loanId];
        
        // Simple interest calculation
        uint256 interest = (loan.principal * loan.interestRate * loan.duration) / (365 * 10000);
        return loan.principal + interest;
    }
    
    function getLoanInfo(uint256 _loanId) external view returns (Loan memory) {
        return loans[_loanId];
    }
    
    function getBorrowerLoans(address _borrower) external view returns (uint256[] memory) {
        return borrowerLoans[_borrower];
    }
    
    function getLoanDetails(uint256 _loanId) external view returns (
        uint256 totalOwed,
        uint256 remaining,
        uint256 daysRemaining,
        bool isOverdue
    ) {
        Loan memory loan = loans[_loanId];
        totalOwed = calculateTotalOwed(_loanId);
        remaining = totalOwed - loan.amountRepaid;
        
        if (block.timestamp >= loan.dueDate) {
            daysRemaining = 0;
            isOverdue = true;
        } else {
            daysRemaining = (loan.dueDate - block.timestamp) / 1 days;
            isOverdue = false;
        }
    }
}
