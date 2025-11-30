// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./UserRegistry.sol";

/**
 * @title CreditScore
 * @dev On-chain credit scoring system based on payment history and behavior
 */
contract CreditScore is ReentrancyGuard {
    
    UserRegistry public userRegistry;
    
    struct CreditData {
        uint256 score; // 0-1000 scale
        uint256 totalLoans;
        uint256 repaidLoans;
        uint256 defaultedLoans;
        uint256 totalPayments;
        uint256 latePayments;
        uint256 lastUpdated;
    }
    
    mapping(address => CreditData) public creditScores;
    mapping(address => bool) public authorizedContracts;
    
    uint256 public constant MIN_SCORE = 0;
    uint256 public constant MAX_SCORE = 900;
    uint256 public constant DEFAULT_SCORE = 450;
    
    event CreditScoreUpdated(address indexed user, uint256 newScore);
    event PaymentRecorded(address indexed user, bool onTime);
    event LoanRecorded(address indexed user, bool repaid);
    
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized contract");
        _;
    }
    
    constructor(address _userRegistry) {
        userRegistry = UserRegistry(_userRegistry);
    }
    
    function authorizeContract(address _contract) external {
        authorizedContracts[_contract] = true;
    }
    
    function initializeCreditScore(address _user) public {
        require(userRegistry.isUserRegistered(_user), "User not registered");
        
        if (creditScores[_user].lastUpdated == 0) {
            creditScores[_user] = CreditData({
                score: DEFAULT_SCORE,
                totalLoans: 0,
                repaidLoans: 0,
                defaultedLoans: 0,
                totalPayments: 0,
                latePayments: 0,
                lastUpdated: block.timestamp
            });
        }
    }
    
    function recordPayment(address _user, bool _onTime) external onlyAuthorized {
        CreditData storage credit = creditScores[_user];
        credit.totalPayments++;
        
        if (!_onTime) {
            credit.latePayments++;
        }
        
        _updateScore(_user);
        emit PaymentRecorded(_user, _onTime);
    }
    
    function recordLoan(address _user, bool _repaid) external onlyAuthorized {
        CreditData storage credit = creditScores[_user];
        credit.totalLoans++;
        
        if (_repaid) {
            credit.repaidLoans++;
        } else {
            credit.defaultedLoans++;
        }
        
        _updateScore(_user);
        emit LoanRecorded(_user, _repaid);
    }
    
    function _updateScore(address _user) internal {
        CreditData storage credit = creditScores[_user];
        
        // Calculate score based on multiple factors
        uint256 score = DEFAULT_SCORE;
        
        // Factor 1: Loan repayment rate (40% weight)
        if (credit.totalLoans > 0) {
            uint256 repaymentRate = (credit.repaidLoans * 100) / credit.totalLoans;
            score += (repaymentRate * 400) / 100 - 200;
        }
        
        // Factor 2: Payment punctuality (30% weight)
        if (credit.totalPayments > 0) {
            uint256 punctualityRate = ((credit.totalPayments - credit.latePayments) * 100) / credit.totalPayments;
            score += (punctualityRate * 300) / 100 - 150;
        }
        
        // Factor 3: Credit history length (20% weight)
        uint256 daysSinceStart = (block.timestamp - credit.lastUpdated) / 1 days;
        if (daysSinceStart > 365) {
            score += 100;
        } else if (daysSinceStart > 180) {
            score += 50;
        }
        
        // Factor 4: Total successful loans (10% weight)
        if (credit.repaidLoans >= 10) {
            score += 50;
        } else if (credit.repaidLoans >= 5) {
            score += 25;
        }
        
        // Ensure score is within bounds
        if (score < MIN_SCORE) score = MIN_SCORE;
        if (score > MAX_SCORE) score = MAX_SCORE;
        
        credit.score = score;
        credit.lastUpdated = block.timestamp;
        
        emit CreditScoreUpdated(_user, score);
    }
    
    function getCreditScore(address _user) external view returns (uint256) {
        if (creditScores[_user].lastUpdated == 0) {
            return DEFAULT_SCORE;
        }
        return creditScores[_user].score;
    }
    
    function getCreditData(address _user) external view returns (CreditData memory) {
        return creditScores[_user];
    }
    
    function getCreditTier(address _user) external view returns (string memory) {
        uint256 score = creditScores[_user].score;
        if (score == 0) score = DEFAULT_SCORE;
        
        if (score >= 750) return "Excellent";
        if (score >= 600) return "Good";
        if (score >= 450) return "Fair";
        if (score >= 300) return "Poor";
        if (score >= 150) return "Very Poor";
        return "Critical";
    }
}
