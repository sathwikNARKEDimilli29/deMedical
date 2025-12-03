// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./UserRegistry.sol";
import "./CreditScore.sol";

/**
 * @title InsurancePool
 * @dev Manages insurance pools with proportional contributions and claims
 * 
 * GOVERNANCE AND INCENTIVES:
 * - Claims are settled through proportional distribution based on member contributions
 * - 60% community consensus required for claim approval (APPROVAL_THRESHOLD)
 * - Removes centralized denial through democratic voting
 * - Members vote on claims, and approval requires 60% of votes
 * - Proportional payout ensures fairness based on contribution percentage
 * 
 * SCHELLING POINT VOTING MECHANISM:
 * - Solves the game-theory problem: voters no longer benefit from voting "No" on all claims
 * - Voters who align with the FINAL CONSENSUS (majority) receive rewards from reward pool
 * - Reward pool is separate from insurance pool (funded by creator/members)
 * - Voter reward = (rewardPool * voterContribution) / totalConsensusVoterContribution
 * - Incentivizes honest, good-faith voting rather than selfish voting
 */
contract InsurancePool is ReentrancyGuard {
    
    UserRegistry public userRegistry;
    CreditScore public creditScore;
    
    struct Pool {
        uint256 id;
        string name;
        string description;
        address creator;
        uint256 targetAmount;
        uint256 totalContributed;
        uint256 minContribution;
        uint256 maxMembers;
        uint256 memberCount;
        uint256 createdAt;
        bool isActive;
        PoolType poolType;
        uint256 rewardPool; // Separate pool for voting rewards (Schelling Point)
    }
    
    enum PoolType { HEALTH, LIFE, ACCIDENT, CRITICAL_ILLNESS }
    
    struct Member {
        address memberAddress;
        uint256 contribution;
        uint256 joinedAt;
        bool isActive;
    }
    
    struct Claim {
        uint256 id;
        uint256 poolId;
        address claimant;
        uint256 amount;
        string description;
        string ipfsHash; // Documents on IPFS
        uint256 submittedAt;
        ClaimStatus status;
        uint256 approvalCount;
        uint256 rejectionCount;
        bool rewardsDistributed; // Track if Schelling Point rewards distributed
        uint256 rewardPoolAllocated; // Amount allocated for this claim's rewards
    }
    
    enum ClaimStatus { PENDING, APPROVED, REJECTED, PAID }
    
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => Member)) public poolMembers;
    mapping(uint256 => address[]) public poolMembersList;
    mapping(uint256 => Claim) public claims;
    mapping(uint256 => mapping(address => bool)) public claimVotes; // Has voted
    mapping(uint256 => mapping(address => bool)) public claimVoteChoice; // True = approve, False = reject
    mapping(uint256 => mapping(address => uint256)) public votingRewards; // Earned rewards per claim
    
    uint256 public poolCount;
    uint256 public claimCount;
    uint256 public constant APPROVAL_THRESHOLD = 60; // 60% approval needed
    
    event PoolCreated(uint256 indexed poolId, address indexed creator, string name);
    event MemberJoined(uint256 indexed poolId, address indexed member, uint256 contribution);
    event ContributionAdded(uint256 indexed poolId, address indexed member, uint256 amount);
    event ClaimSubmitted(uint256 indexed claimId, uint256 indexed poolId, address indexed claimant, uint256 amount);
    event ClaimVoted(uint256 indexed claimId, address indexed voter, bool approve);
    event ClaimProcessed(uint256 indexed claimId, ClaimStatus status);
    event ClaimPaid(uint256 indexed claimId, address indexed claimant, uint256 amount);
    event RewardPoolFunded(uint256 indexed poolId, address indexed funder, uint256 amount);
    event VotingRewardClaimed(uint256 indexed claimId, address indexed voter, uint256 reward);
    
    constructor(address _userRegistry, address _creditScore) {
        userRegistry = UserRegistry(_userRegistry);
        creditScore = CreditScore(_creditScore);
    }
    
    function createPool(
        string memory _name,
        string memory _description,
        uint256 _targetAmount,
        uint256 _minContribution,
        uint256 _maxMembers,
        PoolType _poolType
    ) external nonReentrant returns (uint256) {
        require(userRegistry.isUserKYCVerified(msg.sender), "KYC verification required");
        require(_targetAmount > 0, "Target amount must be positive");
        require(_maxMembers > 0, "Max members must be positive");
        
        poolCount++;
        
        pools[poolCount] = Pool({
            id: poolCount,
            name: _name,
            description: _description,
            creator: msg.sender,
            targetAmount: _targetAmount,
            totalContributed: 0,
            minContribution: _minContribution,
            maxMembers: _maxMembers,
            memberCount: 0,
            createdAt: block.timestamp,
            isActive: true,
            poolType: _poolType,
            rewardPool: 0
        });
        
        emit PoolCreated(poolCount, msg.sender, _name);
        return poolCount;
    }
    
    function joinPool(uint256 _poolId) external payable nonReentrant {
        require(userRegistry.isUserKYCVerified(msg.sender), "KYC verification required");
        Pool storage pool = pools[_poolId];
        require(pool.isActive, "Pool is not active");
        require(pool.memberCount < pool.maxMembers, "Pool is full");
        require(msg.value >= pool.minContribution, "Contribution below minimum");
        require(!poolMembers[_poolId][msg.sender].isActive, "Already a member");
        
        poolMembers[_poolId][msg.sender] = Member({
            memberAddress: msg.sender,
            contribution: msg.value,
            joinedAt: block.timestamp,
            isActive: true
        });
        
        poolMembersList[_poolId].push(msg.sender);
        pool.memberCount++;
        pool.totalContributed += msg.value;
        
        emit MemberJoined(_poolId, msg.sender, msg.value);
    }
    
    function addContribution(uint256 _poolId) external payable nonReentrant {
        require(poolMembers[_poolId][msg.sender].isActive, "Not a pool member");
        Pool storage pool = pools[_poolId];
        require(pool.isActive, "Pool is not active");
        
        poolMembers[_poolId][msg.sender].contribution += msg.value;
        pool.totalContributed += msg.value;
        
        emit ContributionAdded(_poolId, msg.sender, msg.value);
    }
    
    function submitClaim(
        uint256 _poolId,
        uint256 _amount,
        string memory _description,
        string memory _ipfsHash
    ) external nonReentrant returns (uint256) {
        require(poolMembers[_poolId][msg.sender].isActive, "Not a pool member");
        Pool storage pool = pools[_poolId];
        require(pool.isActive, "Pool is not active");
        require(_amount <= pool.totalContributed, "Claim exceeds pool balance");
        
        claimCount++;
        
        claims[claimCount] = Claim({
            id: claimCount,
            poolId: _poolId,
            claimant: msg.sender,
            amount: _amount,
            description: _description,
            ipfsHash: _ipfsHash,
            submittedAt: block.timestamp,
            status: ClaimStatus.PENDING,
            approvalCount: 0,
            rejectionCount: 0,
            rewardsDistributed: false,
            rewardPoolAllocated: 0
        });
        
        emit ClaimSubmitted(claimCount, _poolId, msg.sender, _amount);
        return claimCount;
    }
    
    function voteClaim(uint256 _claimId, bool _approve) external nonReentrant {
        Claim storage claim = claims[_claimId];
        require(poolMembers[claim.poolId][msg.sender].isActive, "Not a pool member");
        require(claim.status == ClaimStatus.PENDING, "Claim not pending");
        require(!claimVotes[_claimId][msg.sender], "Already voted");
        require(msg.sender != claim.claimant, "Cannot vote on own claim");
        
        claimVotes[_claimId][msg.sender] = true;
        claimVoteChoice[_claimId][msg.sender] = _approve; // Record vote choice for Schelling Point
        
        if (_approve) {
            claim.approvalCount++;
        } else {
            claim.rejectionCount++;
        }
        
        emit ClaimVoted(_claimId, msg.sender, _approve);
        
        // Check if voting threshold reached
        Pool storage pool = pools[claim.poolId];
        uint256 totalVotes = claim.approvalCount + claim.rejectionCount;
        uint256 requiredVotes = (pool.memberCount - 1) / 2; // At least 50% of members voted
        
        if (totalVotes >= requiredVotes) {
            uint256 approvalPercentage = (claim.approvalCount * 100) / totalVotes;
            
            if (approvalPercentage >= APPROVAL_THRESHOLD) {
                claim.status = ClaimStatus.APPROVED;
                emit ClaimProcessed(_claimId, ClaimStatus.APPROVED);
            } else {
                claim.status = ClaimStatus.REJECTED;
                emit ClaimProcessed(_claimId, ClaimStatus.REJECTED);
            }
            
            // Allocate reward pool for this claim (Schelling Point mechanism)
            _allocateVotingRewards(_claimId);
        }
    }
    
    function processClaim(uint256 _claimId) external nonReentrant {
        Claim storage claim = claims[_claimId];
        require(claim.status == ClaimStatus.APPROVED, "Claim not approved");
        
        Pool storage pool = pools[claim.poolId];
        
        // Calculate proportional payout based on claimant's contribution
        Member memory claimantMember = poolMembers[claim.poolId][claim.claimant];
        uint256 claimantShare = (claimantMember.contribution * 10000) / pool.totalContributed; // Basis points
        uint256 payoutAmount = (claim.amount * claimantShare) / 10000;
        
        require(pool.totalContributed >= payoutAmount, "Insufficient pool balance");
        
        pool.totalContributed -= payoutAmount;
        claim.status = ClaimStatus.PAID;
        
        // Transfer funds
        (bool success, ) = claim.claimant.call{value: payoutAmount}("");
        require(success, "Transfer failed");
        
        emit ClaimPaid(_claimId, claim.claimant, payoutAmount);
    }
    
    function getPoolInfo(uint256 _poolId) external view returns (Pool memory) {
        return pools[_poolId];
    }
    
    function getMemberInfo(uint256 _poolId, address _member) external view returns (Member memory) {
        return poolMembers[_poolId][_member];
    }
    
    function getPoolMembers(uint256 _poolId) external view returns (address[] memory) {
        return poolMembersList[_poolId];
    }
    
    function getClaimInfo(uint256 _claimId) external view returns (Claim memory) {
        return claims[_claimId];
    }
    
    function getMemberContributionPercentage(uint256 _poolId, address _member) external view returns (uint256) {
        Pool memory pool = pools[_poolId];
        Member memory member = poolMembers[_poolId][_member];
        
        if (pool.totalContributed == 0) return 0;
        return (member.contribution * 10000) / pool.totalContributed; // Basis points
    }
    
    /**
     * @dev Fund the reward pool for voting incentives (Schelling Point mechanism)
     * @param _poolId Pool ID to fund
     */
    function fundRewardPool(uint256 _poolId) external payable {
        Pool storage pool = pools[_poolId];
        require(pool.isActive, "Pool is not active");
        require(msg.value > 0, "Must send ETH to fund reward pool");
        
        pool.rewardPool += msg.value;
        
        emit RewardPoolFunded(_poolId, msg.sender, msg.value);
    }
    
    /**
     * @dev Internal function to allocate voting rewards based on Schelling Point
     * @param _claimId Claim ID that was just resolved
     */
    function _allocateVotingRewards(uint256 _claimId) internal {
        Claim storage claim = claims[_claimId];
        Pool storage pool = pools[claim.poolId];
        
        // Only allocate if reward pool has funds
        if (pool.rewardPool == 0) return;
        
        // Determine consensus (what the majority voted)
        uint256 totalVotes = claim.approvalCount + claim.rejectionCount;
        bool consensus = (claim.approvalCount * 100 / totalVotes) >= APPROVAL_THRESHOLD;
        
        // Calculate total contribution weight of voters who voted WITH consensus
        uint256 consensusWeight = 0;
        address[] memory members = poolMembersList[claim.poolId];
        
        for (uint256 i = 0; i < members.length; i++) {
            address voter = members[i];
            
            // Skip if didn't vote or is the claimant
            if (!claimVotes[_claimId][voter] || voter == claim.claimant) continue;
            
            // Check if voted with consensus
            bool votedApprove = claimVoteChoice[_claimId][voter];
            if (votedApprove == consensus) {
                consensusWeight += poolMembers[claim.poolId][voter].contribution;
            }
        }
        
        // If no one voted with consensus, don't distribute rewards
        if (consensusWeight == 0) return;
        
        // Allocate 5% of reward pool for this claim (or min 0.01 ETH, whichever is less)
        uint256 rewardAmount = pool.rewardPool / 20; // 5% of reward pool
        if (rewardAmount > 0.01 ether) {
            rewardAmount = 0.01 ether;
        }
        if (rewardAmount > pool.rewardPool) {
            rewardAmount = pool.rewardPool;
        }
        
        claim.rewardPoolAllocated = rewardAmount;
        pool.rewardPool -= rewardAmount;
        
        // Calculate individual rewards proportional to contribution
        for (uint256 i = 0; i < members.length; i++) {
            address voter = members[i];
            
            if (!claimVotes[_claimId][voter] || voter == claim.claimant) continue;
            
            bool votedApprove = claimVoteChoice[_claimId][voter];
            if (votedApprove == consensus) {
                uint256 voterContribution = poolMembers[claim.poolId][voter].contribution;
                uint256 voterReward = (rewardAmount * voterContribution) / consensusWeight;
                votingRewards[_claimId][voter] = voterReward;
            }
        }
        
        claim.rewardsDistributed = true;
    }
    
    /**
     * @dev Claim voting reward for a specific claim
     * @param _claimId Claim ID to claim reward from
     */
    function claimVotingReward(uint256 _claimId) external nonReentrant {
        Claim storage claim = claims[_claimId];
        require(
            claim.status == ClaimStatus.APPROVED || claim.status == ClaimStatus.REJECTED || claim.status == ClaimStatus.PAID,
            "Claim not finalized"
        );
        require(claimVotes[_claimId][msg.sender], "Did not vote on this claim");
        
        uint256 reward = votingRewards[_claimId][msg.sender];
        require(reward > 0, "No reward available");
        
        votingRewards[_claimId][msg.sender] = 0; // Prevent double claiming
        
        // Transfer reward
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Reward transfer failed");
        
        emit VotingRewardClaimed(_claimId, msg.sender, reward);
    }
    
    /**
     * @dev Calculate potential voting reward for a claim (before claiming)
     * @param _claimId Claim ID
     * @param _voter Voter address
     */
    function calculateVotingReward(uint256 _claimId, address _voter) external view returns (uint256) {
        return votingRewards[_claimId][_voter];
    }
    
    /**
     * @dev Get reward pool balance for a pool
     * @param _poolId Pool ID
     */
    function getRewardPoolBalance(uint256 _poolId) external view returns (uint256) {
        return pools[_poolId].rewardPool;
    }
}
