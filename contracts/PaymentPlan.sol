// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./UserRegistry.sol";
import "./CreditScore.sol";

/**
 * @title PaymentPlan
 * @dev Handles BNPL (Buy Now Pay Later) and SNPL (Save Now Pay Later) for medical expenses
 */
contract PaymentPlan is ReentrancyGuard {
    
    UserRegistry public userRegistry;
    CreditScore public creditScore;
    
    struct BNPLPlan {
        uint256 id;
        address user;
        uint256 totalAmount;
        uint256 paidAmount;
        uint256 installmentAmount;
        uint256 numberOfInstallments;
        uint256 paidInstallments;
        uint256 startDate;
        uint256 nextDueDate;
        uint256 interestRate; // Basis points
        bool isActive;
        string purpose;
        string ipfsHash;
    }
    
    struct SNPLPlan {
        uint256 id;
        address user;
        uint256 targetAmount;
        uint256 savedAmount;
        uint256 monthlyDeposit;
        uint256 startDate;
        uint256 targetDate;
        uint256 lastDepositDate;
        bool isCompleted;
        string purpose;
    }
    
    mapping(uint256 => BNPLPlan) public bnplPlans;
    mapping(uint256 => SNPLPlan) public snplPlans;
    mapping(address => uint256[]) public userBNPLPlans;
    mapping(address => uint256[]) public userSNPLPlans;
    
    uint256 public bnplCount;
    uint256 public snplCount;
    uint256 public constant LATE_FEE_PERCENT = 500; // 5%
    uint256 public poolBalance;
    
    event BNPLCreated(uint256 indexed planId, address indexed user, uint256 amount);
    event BNPLPayment(uint256 indexed planId, address indexed user, uint256 amount);
    event BNPLCompleted(uint256 indexed planId);
    event SNPLCreated(uint256 indexed planId, address indexed user, uint256 targetAmount);
    event SNPLDeposit(uint256 indexed planId, address indexed user, uint256 amount);
    event SNPLCompleted(uint256 indexed planId);
    event LateFeeCharged(uint256 indexed planId, uint256 feeAmount);
    
    constructor(address _userRegistry, address _creditScore) {
        userRegistry = UserRegistry(_userRegistry);
        creditScore = CreditScore(_creditScore);
    }
    
    function fundPool() external payable {
        poolBalance += msg.value;
    }
    
    function createBNPL(
        uint256 _amount,
        uint256 _numberOfInstallments,
        string memory _purpose,
        string memory _ipfsHash
    ) external nonReentrant returns (uint256) {
        require(userRegistry.isUserKYCVerified(msg.sender), "KYC verification required");
        require(_amount > 0, "Amount must be positive");
        require(_numberOfInstallments >= 2 && _numberOfInstallments <= 12, "2-12 installments allowed");
        
        uint256 userCreditScore = creditScore.getCreditScore(msg.sender);
        if (userCreditScore == 0) {
            creditScore.initializeCreditScore(msg.sender);
            userCreditScore = 500;
        }
        
        require(userCreditScore >= 450, "Credit score too low for BNPL");
        require(poolBalance >= _amount, "Insufficient pool balance");
        
        // Calculate interest based on credit score
        uint256 interestRate = calculateBNPLInterestRate(userCreditScore);
        uint256 totalWithInterest = _amount + (_amount * interestRate) / 10000;
        uint256 installmentAmount = totalWithInterest / _numberOfInstallments;
        
        bnplCount++;
        
        bnplPlans[bnplCount] = BNPLPlan({
            id: bnplCount,
            user: msg.sender,
            totalAmount: totalWithInterest,
            paidAmount: 0,
            installmentAmount: installmentAmount,
            numberOfInstallments: _numberOfInstallments,
            paidInstallments: 0,
            startDate: block.timestamp,
            nextDueDate: block.timestamp + 30 days,
            interestRate: interestRate,
            isActive: true,
            purpose: _purpose,
            ipfsHash: _ipfsHash
        });
        
        userBNPLPlans[msg.sender].push(bnplCount);
        
        // Transfer amount to user
        poolBalance -= _amount;
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit BNPLCreated(bnplCount, msg.sender, _amount);
        return bnplCount;
    }
    
    function payBNPLInstallment(uint256 _planId) external payable nonReentrant {
        BNPLPlan storage plan = bnplPlans[_planId];
        require(plan.user == msg.sender, "Not plan owner");
        require(plan.isActive, "Plan not active");
        
        uint256 dueAmount = plan.installmentAmount;
        
        // Check if payment is late
        bool isLate = block.timestamp > plan.nextDueDate;
        if (isLate) {
            uint256 lateFee = (dueAmount * LATE_FEE_PERCENT) / 10000;
            dueAmount += lateFee;
            emit LateFeeCharged(_planId, lateFee);
        }
        
        require(msg.value >= dueAmount, "Insufficient payment");
        
        plan.paidAmount += msg.value;
        plan.paidInstallments++;
        plan.nextDueDate += 30 days;
        poolBalance += msg.value;
        
        emit BNPLPayment(_planId, msg.sender, msg.value);
        
        // Record payment for credit score
        creditScore.recordPayment(msg.sender, !isLate);
        
        // Check if plan completed
        if (plan.paidInstallments >= plan.numberOfInstallments || plan.paidAmount >= plan.totalAmount) {
            plan.isActive = false;
            emit BNPLCompleted(_planId);
        }
        
        // Refund excess
        if (msg.value > dueAmount) {
            (bool success, ) = msg.sender.call{value: msg.value - dueAmount}("");
            require(success, "Refund failed");
        }
    }
    
    function createSNPL(
        uint256 _targetAmount,
        uint256 _monthlyDeposit,
        uint256 _durationMonths,
        string memory _purpose
    ) external nonReentrant returns (uint256) {
        require(userRegistry.isUserRegistered(msg.sender), "User not registered");
        require(_targetAmount > 0, "Target amount must be positive");
        require(_monthlyDeposit > 0, "Monthly deposit must be positive");
        require(_durationMonths >= 3 && _durationMonths <= 24, "3-24 months allowed");
        
        snplCount++;
        
        snplPlans[snplCount] = SNPLPlan({
            id: snplCount,
            user: msg.sender,
            targetAmount: _targetAmount,
            savedAmount: 0,
            monthlyDeposit: _monthlyDeposit,
            startDate: block.timestamp,
            targetDate: block.timestamp + (_durationMonths * 30 days),
            lastDepositDate: 0,
            isCompleted: false,
            purpose: _purpose
        });
        
        userSNPLPlans[msg.sender].push(snplCount);
        
        emit SNPLCreated(snplCount, msg.sender, _targetAmount);
        return snplCount;
    }
    
    function depositToSNPL(uint256 _planId) external payable nonReentrant {
        SNPLPlan storage plan = snplPlans[_planId];
        require(plan.user == msg.sender, "Not plan owner");
        require(!plan.isCompleted, "Plan already completed");
        require(msg.value > 0, "Deposit must be positive");
        
        plan.savedAmount += msg.value;
        plan.lastDepositDate = block.timestamp;
        poolBalance += msg.value;
        
        emit SNPLDeposit(_planId, msg.sender, msg.value);
        
        // Check if target reached
        if (plan.savedAmount >= plan.targetAmount) {
            plan.isCompleted = true;
            emit SNPLCompleted(_planId);
        }
    }
    
    function withdrawSNPL(uint256 _planId) external nonReentrant {
        SNPLPlan storage plan = snplPlans[_planId];
        require(plan.user == msg.sender, "Not plan owner");
        require(plan.isCompleted, "Target not reached");
        require(plan.savedAmount > 0, "No funds to withdraw");
        
        uint256 amount = plan.savedAmount;
        plan.savedAmount = 0;
        poolBalance -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    function calculateBNPLInterestRate(uint256 _creditScore) public pure returns (uint256) {
        // Better credit score = lower interest rate
        if (_creditScore >= 800) return 300; // 3%
        if (_creditScore >= 700) return 500; // 5%
        if (_creditScore >= 600) return 800; // 8%
        if (_creditScore >= 500) return 1000; // 10%
        return 1500; // 15%
    }
    
    function getBNPLInfo(uint256 _planId) external view returns (BNPLPlan memory) {
        return bnplPlans[_planId];
    }
    
    function getSNPLInfo(uint256 _planId) external view returns (SNPLPlan memory) {
        return snplPlans[_planId];
    }
    
    function getUserBNPLPlans(address _user) external view returns (uint256[] memory) {
        return userBNPLPlans[_user];
    }
    
    function getUserSNPLPlans(address _user) external view returns (uint256[] memory) {
        return userSNPLPlans[_user];
    }
    
    function getBNPLProgress(uint256 _planId) external view returns (
        uint256 totalAmount,
        uint256 paidAmount,
        uint256 remainingAmount,
        uint256 nextInstallment,
        bool isOverdue
    ) {
        BNPLPlan memory plan = bnplPlans[_planId];
        totalAmount = plan.totalAmount;
        paidAmount = plan.paidAmount;
        remainingAmount = totalAmount - paidAmount;
        nextInstallment = plan.installmentAmount;
        isOverdue = block.timestamp > plan.nextDueDate && plan.isActive;
    }
}
