// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./UserRegistry.sol";
import "./CreditScore.sol";
import "./InsurancePool.sol";

/**
 * @title MicroLoan
 * @dev Healthcare micro-loans with collateral, co-signer support, and insurance pool backing
 */
contract MicroLoan is ReentrancyGuard {
    
    UserRegistry public userRegistry;
    CreditScore public creditScore;
    InsurancePool public insurancePool;
    
    enum LoanType { UNSECURED, COLLATERALIZED, COSIGNED, POOL_BACKED }
    
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
        LoanType loanType;
        string purpose;
        string ipfsHash; // Medical bills/documents
        // Collateral fields
        uint256 collateralAmount;
        // Co-signer fields
        address coSigner;
        uint256 coSignerLiability;
        // Insurance pool fields
        uint256 insurancePoolId;
        uint256 insuranceReserve;
    }
    
    enum LoanStatus { PENDING, ACTIVE, REPAID, DEFAULTED, LIQUIDATED }
    
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public coSignerLoans;
    mapping(address => bool) public blacklistedFromPoolLoans;
    
    uint256 public loanCount;
    uint256 public constant MIN_CREDIT_SCORE = 300;
    uint256 public constant MAX_LOAN_AMOUNT = 10 ether;
    uint256 public constant MIN_LOAN_AMOUNT = 0.01 ether;
    uint256 public constant COLLATERAL_RATIO = 50; // 50% collateral required
    uint256 public constant GRACE_PERIOD = 7 days;
    uint256 public poolBalance;
    
    event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount, LoanType loanType);
    event LoanApproved(uint256 indexed loanId);
    event LoanRepayment(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanRepaid(uint256 indexed loanId);
    event LoanDefaulted(uint256 indexed loanId);
    event CollateralSeized(uint256 indexed loanId, uint256 amount);
    event CoSignerCalled(uint256 indexed loanId, address indexed coSigner, uint256 amount);
    event InsurancePoolClaimed(uint256 indexed loanId, uint256 amount);
    event PoolFunded(address indexed funder, uint256 amount);
    
    constructor(address _userRegistry, address _creditScore, address _insurancePool) {
        userRegistry = UserRegistry(_userRegistry);
        creditScore = CreditScore(_creditScore);
        insurancePool = InsurancePool(_insurancePool);
    }
    
    function fundPool() external payable {
        poolBalance += msg.value;
        emit PoolFunded(msg.sender, msg.value);
    }
    
    // 1. UNSECURED LOAN
    function requestLoan(
        uint256 _amount,
        uint256 _duration,
        string memory _purpose,
        string memory _ipfsHash
    ) external nonReentrant returns (uint256) {
        return _createLoan(_amount, _duration, _purpose, _ipfsHash, LoanType.UNSECURED, address(0), 0);
    }
    
    // 2. COLLATERALIZED LOAN
    function requestCollateralizedLoan(
        uint256 _amount,
        uint256 _duration,
        string memory _purpose,
        string memory _ipfsHash
    ) external payable nonReentrant returns (uint256) {
        uint256 requiredCollateral = (_amount * COLLATERAL_RATIO) / 100;
        require(msg.value >= requiredCollateral, "Insufficient collateral");
        
        return _createLoan(_amount, _duration, _purpose, _ipfsHash, LoanType.COLLATERALIZED, address(0), 0);
    }
    
    // 3. CO-SIGNED LOAN
    function requestCoSignedLoan(
        uint256 _amount,
        uint256 _duration,
        string memory _purpose,
        string memory _ipfsHash,
        address _coSigner
    ) external nonReentrant returns (uint256) {
        require(_coSigner != address(0) && _coSigner != msg.sender, "Invalid co-signer");
        require(userRegistry.isUserKYCVerified(_coSigner), "Co-signer not KYC verified");
        
        uint256 coSignerScore = creditScore.getCreditScore(_coSigner);
        require(coSignerScore >= 600, "Co-signer credit score too low");
        
        return _createLoan(_amount, _duration, _purpose, _ipfsHash, LoanType.COSIGNED, _coSigner, 0);
    }
    
    // 4. POOL-BACKED LOAN
    function requestPoolBackedLoan(
        uint256 _amount,
        uint256 _duration,
        string memory _purpose,
        string memory _ipfsHash,
        uint256 _poolId
    ) external nonReentrant returns (uint256) {
        require(!blacklistedFromPoolLoans[msg.sender], "Blacklisted from pool-backed loans");
        
        // Verify pool has sufficient funds
        InsurancePool.Pool memory pool = insurancePool.getPoolInfo(_poolId);
        uint256 insuranceAmount = (_amount * 120) / 100; // 120% coverage
        require(pool.totalContributed >= insuranceAmount, "Insufficient pool balance");
        
        return _createLoan(_amount, _duration, _purpose, _ipfsHash, LoanType.POOL_BACKED, address(0), _poolId);
    }
    
    function _createLoan(
        uint256 _amount,
        uint256 _duration,
        string memory _purpose,
        string memory _ipfsHash,
        LoanType _loanType,
        address _coSigner,
        uint256 _poolId
    ) internal returns (uint256) {
        require(userRegistry.isUserKYCVerified(msg.sender), "KYC verification required");
        require(_amount >= MIN_LOAN_AMOUNT && _amount <= MAX_LOAN_AMOUNT, "Invalid loan amount");
        require(_duration >= 7 && _duration <= 365, "Duration must be 7-365 days");
        
        uint256 userCreditScore = creditScore.getCreditScore(msg.sender);
        if (userCreditScore == 0) {
            creditScore.initializeCreditScore(msg.sender);
            userCreditScore = 500;
        }
        
        require(userCreditScore >= MIN_CREDIT_SCORE, "Credit score too low");
        
        // Calculate interest rate based on credit score and loan type
        uint256 interestRate = _calculateInterestRateByType(userCreditScore, _loanType);
        
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
            loanType: _loanType,
            purpose: _purpose,
            ipfsHash: _ipfsHash,
            collateralAmount: _loanType == LoanType.COLLATERALIZED ? msg.value : 0,
            coSigner: _coSigner,
            coSignerLiability: 0,
            insurancePoolId: _poolId,
            insuranceReserve: 0
        });
        
        borrowerLoans[msg.sender].push(loanCount);
        
        if (_coSigner != address(0)) {
            coSignerLoans[_coSigner].push(loanCount);
        }
        
        emit LoanRequested(loanCount, msg.sender, _amount, _loanType);
        
        // Auto-approve if sufficient pool balance
        if (poolBalance >= _amount) {
            _approveLoan(loanCount);
        }
        
        return loanCount;
    }
    
    function _calculateInterestRateByType(uint256 _creditScore, LoanType _loanType) internal pure returns (uint256) {
        uint256 baseRate = calculateInterestRate(_creditScore);
        
        // Apply discounts based on loan type
        if (_loanType == LoanType.COLLATERALIZED) {
            return (baseRate * 65) / 100; // 35% discount
        } else if (_loanType == LoanType.COSIGNED) {
            return (baseRate * 80) / 100; // 20% discount
        } else if (_loanType == LoanType.POOL_BACKED) {
            return (baseRate * 75) / 100; // 25% discount
        }
        
        return baseRate; // UNSECURED - no discount
    }
    
    function _approveLoan(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.PENDING, "Loan not pending");
        require(poolBalance >= loan.principal, "Insufficient pool balance");
        
        loan.status = LoanStatus.ACTIVE;
        loan.startTime = block.timestamp;
        loan.dueDate = block.timestamp + (loan.duration * 1 days);
        
        poolBalance -= loan.principal;
        
        // Reserve insurance if pool-backed
        if (loan.loanType == LoanType.POOL_BACKED) {
            loan.insuranceReserve = (loan.principal * 120) / 100;
            // Note: Actual pool locking would be done via InsurancePool contract
        }
        
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
            
            // Return collateral if applicable
            if (loan.loanType == LoanType.COLLATERALIZED && loan.collateralAmount > 0) {
                uint256 collateral = loan.collateralAmount;
                loan.collateralAmount = 0;
                (bool success, ) = loan.borrower.call{value: collateral}("");
                require(success, "Collateral return failed");
            }
            
            // Update co-signer credit if applicable
            if (loan.loanType == LoanType.COSIGNED && loan.coSigner != address(0)) {
                creditScore.recordPayment(loan.coSigner, true);
            }
            
            emit LoanRepaid(_loanId);
        }
    }
    
    function markDefault(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");
        require(block.timestamp > loan.dueDate + GRACE_PERIOD, "Grace period active");
        
        loan.status = LoanStatus.DEFAULTED;
        creditScore.recordLoan(loan.borrower, false);
        
        emit LoanDefaulted(_loanId);
        
        // Handle default based on loan type
        if (loan.loanType == LoanType.COLLATERALIZED) {
            _seizeCollateral(_loanId);
        } else if (loan.loanType == LoanType.COSIGNED) {
            _callCoSigner(_loanId);
        } else if (loan.loanType == LoanType.POOL_BACKED) {
            _claimInsurance(_loanId);
        }
    }
    
    function _seizeCollateral(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        require(loan.collateralAmount > 0, "No collateral");
        
        uint256 seized = loan.collateralAmount;
        loan.collateralAmount = 0;
        loan.status = LoanStatus.LIQUIDATED;
        
        // Transfer collateral to pool
        poolBalance += seized;
        
        emit CollateralSeized(_loanId, seized);
    }
    
    function _callCoSigner(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        require(loan.coSigner != address(0), "No co-signer");
        
        uint256 totalOwed = calculateTotalOwed(_loanId);
        uint256 remaining = totalOwed - loan.amountRepaid;
        
        loan.coSignerLiability = remaining;
        
        // Notify co-signer (in practice, this would trigger off-chain notification)
        emit CoSignerCalled(_loanId, loan.coSigner, remaining);
        
        // Reduce co-signer credit score
        creditScore.recordLoan(loan.coSigner, false);
    }
    
    function coSignerPayment(uint256 _loanId) external payable nonReentrant {
        Loan storage loan = loans[_loanId];
        require(msg.sender == loan.coSigner, "Not the co-signer");
        require(loan.status == LoanStatus.DEFAULTED, "Loan not defaulted");
        require(loan.coSignerLiability > 0, "No liability");
        
        uint256 payment = msg.value <= loan.coSignerLiability ? msg.value : loan.coSignerLiability;
        
        loan.coSignerLiability -= payment;
        loan.amountRepaid += payment;
        poolBalance += payment;
        
        if (loan.coSignerLiability == 0) {
            loan.status = LoanStatus.REPAID;
        }
    }
    
    function _claimInsurance(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        require(loan.insurancePoolId > 0, "No insurance pool");
        
        uint256 totalOwed = calculateTotalOwed(_loanId);
        uint256 loss = totalOwed - loan.amountRepaid;
        
        // Mark as liquidated
        loan.status = LoanStatus.LIQUIDATED;
        
        // Blacklist borrower from future pool-backed loans
        blacklistedFromPoolLoans[loan.borrower] = true;
        
        // In practice, this would call the InsurancePool contract to process claim
        // For now, we emit an event
        emit InsurancePoolClaimed(_loanId, loss);
        
        // The pool would compensate for the loss
        poolBalance += loss; // Simulated insurance payout
    }
    
    function calculateInterestRate(uint256 _creditScore) public pure returns (uint256) {
        if (_creditScore >= 800) return 500; // 5%
        if (_creditScore >= 700) return 800; // 8%
        if (_creditScore >= 600) return 1200; // 12%
        if (_creditScore >= 500) return 1500; // 15%
        if (_creditScore >= 400) return 1800; // 18%
        if (_creditScore >= 300) return 2000; // 20%
        if (_creditScore >= 200) return 2200; // 22%
        if (_creditScore >= 100) return 2400; // 24%
        return 2500; // 25%
    }
    
    function calculateTotalOwed(uint256 _loanId) public view returns (uint256) {
        Loan memory loan = loans[_loanId];
        uint256 interest = (loan.principal * loan.interestRate * loan.duration) / (365 * 10000);
        return loan.principal + interest;
    }
    
    function getLoanInfo(uint256 _loanId) external view returns (Loan memory) {
        return loans[_loanId];
    }
    
    function getBorrowerLoans(address _borrower) external view returns (uint256[] memory) {
        return borrowerLoans[_borrower];
    }
    
    function getCoSignerLoans(address _coSigner) external view returns (uint256[] memory) {
        return coSignerLoans[_coSigner];
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
