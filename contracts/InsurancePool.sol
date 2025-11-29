// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./UserRegistry.sol";
import "./CreditScore.sol";

/**
 * @title InsurancePool
 * @dev Manages insurance pools with proportional contributions and claims
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
    }
    
    enum ClaimStatus { PENDING, APPROVED, REJECTED, PAID }
    
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => Member)) public poolMembers;
    mapping(uint256 => address[]) public poolMembersList;
    mapping(uint256 => Claim) public claims;
    mapping(uint256 => mapping(address => bool)) public claimVotes;
    
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
            poolType: _poolType
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
            rejectionCount: 0
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
}
