// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IUserRegistry {
    function isKYCVerified(address user) external view returns (bool);
}

interface ICreditScore {
    function updateScore(address user, int256 change, string memory reason) external;
}

/**
 * @title CrowdFunding
 * @dev Decentralized crowdfunding for medical expenses with milestone-based fund releases
 */
contract CrowdFunding is Ownable, ReentrancyGuard {
    
    IUserRegistry public userRegistry;
    ICreditScore public creditScore;
    
    enum CampaignStatus { PENDING_APPROVAL, ACTIVE, SUCCESSFUL, FAILED, CANCELLED }
    enum Category { SURGERY, TREATMENT, MEDICATION, EMERGENCY, THERAPY, DIAGNOSTICS, OTHER }
    
    struct Milestone {
        string description;
        uint256 amount;
        bool isReleased;
        uint256 releaseDate;
        string proofIpfsHash; // Proof of completion (medical reports, bills, etc.)
    }
    
    struct Campaign {
        uint256 campaignId;
        address creator;
        string title;
        string description;
        Category category;
        uint256 goalAmount;
        uint256 raisedAmount;
        uint256 deadline;
        string[] documents; // IPFS hashes for medical documents
        CampaignStatus status;
        bool isApproved;
        bool allOrNothing; // true = refund if goal not met, false = keep all
        uint256 approvalVotes;
        uint256 rejectionVotes;
        uint256 createdAt;
        uint256 contributorsCount;
    }
    
    struct Contribution {
        address contributor;
        uint256 amount;
        uint256 timestamp;
        bool refunded;
    }
    
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Milestone[]) public campaignMilestones;
    mapping(uint256 => Contribution[]) public campaignContributions;
    mapping(uint256 => mapping(address => uint256)) public contributorAmount;
    mapping(uint256 => mapping(address => bool)) public hasVotedForApproval;
    mapping(address => uint256[]) public creatorCampaigns;
    mapping(address => uint256[]) public contributorCampaigns;
    
    uint256 public campaignCount;
    uint256 public totalFundsRaised;
    uint256 public approvalThreshold = 60; // 60% approval needed
    uint256 public minApprovalVotes = 3; // Minimum votes for approval
    
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 goalAmount,
        uint256 deadline
    );
    event ContributionReceived(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );
    event CampaignApprovalVote(
        uint256 indexed campaignId,
        address indexed voter,
        bool approved
    );
    event CampaignApproved(uint256 indexed campaignId);
    event MilestoneReleased(
        uint256 indexed campaignId,
        uint256 milestoneIndex,
        uint256 amount
    );
    event RefundIssued(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );
    event CampaignStatusChanged(
        uint256 indexed campaignId,
        CampaignStatus newStatus
    );
    event FundsWithdrawn(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );
    
    constructor(
        address _userRegistryAddress,
        address _creditScoreAddress
    ) Ownable(msg.sender) {
        userRegistry = IUserRegistry(_userRegistryAddress);
        creditScore = ICreditScore(_creditScoreAddress);
    }
    
    /**
     * @dev Create a new crowdfunding campaign
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        Category _category,
        uint256 _goalAmount,
        uint256 _durationDays,
        string[] memory _documents,
        bool _allOrNothing,
        Milestone[] memory _milestones
    ) external returns (uint256) {
        require(userRegistry.isKYCVerified(msg.sender), "KYC verification required");
        require(bytes(_title).length > 0, "Title required");
        require(_goalAmount > 0, "Goal must be positive");
        require(_durationDays >= 7 && _durationDays <= 365, "Duration must be 7-365 days");
        require(_milestones.length > 0, "At least one milestone required");
        
        // Validate milestones sum to goal
        uint256 totalMilestoneAmount = 0;
        for (uint256 i = 0; i < _milestones.length; i++) {
            totalMilestoneAmount += _milestones[i].amount;
        }
        require(totalMilestoneAmount == _goalAmount, "Milestones must sum to goal");
        
        campaignCount++;
        uint256 deadline = block.timestamp + (_durationDays * 1 days);
        
        campaigns[campaignCount] = Campaign({
            campaignId: campaignCount,
            creator: msg.sender,
            title: _title,
            description: _description,
            category: _category,
            goalAmount: _goalAmount,
            raisedAmount: 0,
            deadline: deadline,
            documents: _documents,
            status: CampaignStatus.PENDING_APPROVAL,
            isApproved: false,
            allOrNothing: _allOrNothing,
            approvalVotes: 0,
            rejectionVotes: 0,
            createdAt: block.timestamp,
            contributorsCount: 0
        });
        
        // Store milestones
        for (uint256 i = 0; i < _milestones.length; i++) {
            campaignMilestones[campaignCount].push(_milestones[i]);
        }
        
        creatorCampaigns[msg.sender].push(campaignCount);
        
        emit CampaignCreated(
            campaignCount,
            msg.sender,
            _title,
            _goalAmount,
            deadline
        );
        
        return campaignCount;
    }
    
    /**
     * @dev Vote to approve or reject a campaign
     */
    function voteForCampaignApproval(uint256 _campaignId, bool _approve) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.PENDING_APPROVAL, "Not pending approval");
        require(!hasVotedForApproval[_campaignId][msg.sender], "Already voted");
        require(msg.sender != campaign.creator, "Creator cannot vote");
        
        hasVotedForApproval[_campaignId][msg.sender] = true;
        
        if (_approve) {
            campaign.approvalVotes++;
        } else {
            campaign.rejectionVotes++;
        }
        
        emit CampaignApprovalVote(_campaignId, msg.sender, _approve);
        
        // Auto-approve if threshold met
        uint256 totalVotes = campaign.approvalVotes + campaign.rejectionVotes;
        if (totalVotes >= minApprovalVotes) {
            uint256 approvalPercentage = (campaign.approvalVotes * 100) / totalVotes;
            if (approvalPercentage >= approvalThreshold) {
                campaign.isApproved = true;
                campaign.status = CampaignStatus.ACTIVE;
                emit CampaignApproved(_campaignId);
                emit CampaignStatusChanged(_campaignId, CampaignStatus.ACTIVE);
            }
        }
    }
    
    /**
     * @dev Manual approval by admin (to kickstart campaigns)
     */
    function approveCampaign(uint256 _campaignId) external onlyOwner {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.PENDING_APPROVAL, "Not pending approval");
        
        campaign.isApproved = true;
        campaign.status = CampaignStatus.ACTIVE;
        
        emit CampaignApproved(_campaignId);
        emit CampaignStatusChanged(_campaignId, CampaignStatus.ACTIVE);
    }
    
    /**
     * @dev Contribute to a campaign
     */
    function contribute(uint256 _campaignId) external payable nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.ACTIVE, "Campaign not active");
        require(block.timestamp <= campaign.deadline, "Campaign expired");
        require(msg.value > 0, "Must contribute amount");
        
        // Record contribution
        if (contributorAmount[_campaignId][msg.sender] == 0) {
            campaign.contributorsCount++;
            contributorCampaigns[msg.sender].push(_campaignId);
        }
        
        contributorAmount[_campaignId][msg.sender] += msg.value;
        campaignContributions[_campaignId].push(Contribution({
            contributor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            refunded: false
        }));
        
        campaign.raisedAmount += msg.value;
        totalFundsRaised += msg.value;
        
        emit ContributionReceived(_campaignId, msg.sender, msg.value);
        
        // Check if goal reached
        if (campaign.raisedAmount >= campaign.goalAmount) {
            campaign.status = CampaignStatus.SUCCESSFUL;
            emit CampaignStatusChanged(_campaignId, CampaignStatus.SUCCESSFUL);
            
            // Improve creator's credit score
            creditScore.updateScore(
                campaign.creator,
                10,
                "Successful crowdfunding campaign"
            );
        }
    }
    
    /**
     * @dev Release milestone funds to campaign creator
     */
    function releaseMilestone(
        uint256 _campaignId,
        uint256 _milestoneIndex,
        string memory _proofIpfsHash
    ) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "Only creator");
        require(
            campaign.status == CampaignStatus.SUCCESSFUL ||
            (!campaign.allOrNothing && campaign.raisedAmount > 0),
            "Cannot release funds"
        );
        
        Milestone storage milestone = campaignMilestones[_campaignId][_milestoneIndex];
        require(!milestone.isReleased, "Already released");
        require(campaign.raisedAmount >= milestone.amount, "Insufficient funds");
        
        milestone.isReleased = true;
        milestone.releaseDate = block.timestamp;
        milestone.proofIpfsHash = _proofIpfsHash;
        
        uint256 releaseAmount = milestone.amount;
        
        // Transfer funds to creator
        (bool success, ) = campaign.creator.call{value: releaseAmount}("");
        require(success, "Transfer failed");
        
        emit MilestoneReleased(_campaignId, _milestoneIndex, releaseAmount);
        emit FundsWithdrawn(_campaignId, campaign.creator, releaseAmount);
    }
    
    /**
     * @dev Request refund for failed all-or-nothing campaign
     */
    function requestRefund(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.allOrNothing, "Not all-or-nothing campaign");
        require(
            (block.timestamp > campaign.deadline && campaign.raisedAmount < campaign.goalAmount) ||
            campaign.status == CampaignStatus.CANCELLED,
            "Refund not available"
        );
        
        uint256 contributedAmount = contributorAmount[_campaignId][msg.sender];
        require(contributedAmount > 0, "No contribution found");
        
        // Mark campaign as failed if deadline passed
        if (campaign.status == CampaignStatus.ACTIVE) {
            campaign.status = CampaignStatus.FAILED;
            emit CampaignStatusChanged(_campaignId, CampaignStatus.FAILED);
        }
        
        // Reset contributor amount
        contributorAmount[_campaignId][msg.sender] = 0;
        
        // Transfer refund
        (bool success, ) = msg.sender.call{value: contributedAmount}("");
        require(success, "Refund failed");
        
        emit RefundIssued(_campaignId, msg.sender, contributedAmount);
    }
    
    /**
     * @dev Cancel campaign (only before approval or with no contributions)
     */
    function cancelCampaign(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "Only creator");
        require(
            campaign.status == CampaignStatus.PENDING_APPROVAL ||
            (campaign.status == CampaignStatus.ACTIVE && campaign.contributorsCount == 0),
            "Cannot cancel with contributions"
        );
        
        campaign.status = CampaignStatus.CANCELLED;
        emit CampaignStatusChanged(_campaignId, CampaignStatus.CANCELLED);
    }
    
    /**
     * @dev Finalize expired campaigns
     */
    function finalizeCampaign(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp > campaign.deadline, "Campaign not expired");
        require(campaign.status == CampaignStatus.ACTIVE, "Already finalized");
        
        if (campaign.raisedAmount >= campaign.goalAmount) {
            campaign.status = CampaignStatus.SUCCESSFUL;
            // Credit score already updated on goal reach
        } else {
            campaign.status = CampaignStatus.FAILED;
            // Penalize creator for failed campaign
            creditScore.updateScore(
                campaign.creator,
                -5,
                "Failed crowdfunding campaign"
            );
        }
        
        emit CampaignStatusChanged(_campaignId, campaign.status);
    }
    
    // View functions
    
    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        return campaigns[_campaignId];
    }
    
    function getCampaignMilestones(uint256 _campaignId) external view returns (Milestone[] memory) {
        return campaignMilestones[_campaignId];
    }
    
    function getCampaignContributions(uint256 _campaignId) external view returns (Contribution[] memory) {
        return campaignContributions[_campaignId];
    }
    
    function getCreatorCampaigns(address _creator) external view returns (uint256[] memory) {
        return creatorCampaigns[_creator];
    }
    
    function getContributorCampaigns(address _contributor) external view returns (uint256[] memory) {
        return contributorCampaigns[_contributor];
    }
    
    function getContributorAmount(uint256 _campaignId, address _contributor) external view returns (uint256) {
        return contributorAmount[_campaignId][_contributor];
    }
    
    function getCampaignProgress(uint256 _campaignId) external view returns (
        uint256 raised,
        uint256 goal,
        uint256 percentage,
        uint256 contributors,
        uint256 timeRemaining
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        raised = campaign.raisedAmount;
        goal = campaign.goalAmount;
        percentage = goal > 0 ? (raised * 100) / goal : 0;
        contributors = campaign.contributorsCount;
        
        if (block.timestamp >= campaign.deadline) {
            timeRemaining = 0;
        } else {
            timeRemaining = campaign.deadline - block.timestamp;
        }
    }
    
    // Admin functions
    
    function updateApprovalThreshold(uint256 _newThreshold) external onlyOwner {
        require(_newThreshold > 0 && _newThreshold <= 100, "Invalid threshold");
        approvalThreshold = _newThreshold;
    }
    
    function updateMinApprovalVotes(uint256 _minVotes) external onlyOwner {
        require(_minVotes > 0, "Invalid min votes");
        minApprovalVotes = _minVotes;
    }
    
    // Emergency functions
    
    function emergencyPauseCampaign(uint256 _campaignId) external onlyOwner {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.ACTIVE, "Not active");
        campaign.status = CampaignStatus.CANCELLED;
        emit CampaignStatusChanged(_campaignId, CampaignStatus.CANCELLED);
    }
}
