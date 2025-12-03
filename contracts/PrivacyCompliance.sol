// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PrivacyCompliance
 * @dev Documents privacy guarantees and GDPR compliance for De-Medical platform
 * 
 * CRITICAL PRIVACY NOTICE:
 * - This contract stores ONLY cryptographic hashes (IPFS CIDs) on-chain
 * - Personally Identifiable Information (PII) is stored OFF-CHAIN on IPFS
 * - On-chain hashes serve as tamper-proof references, NOT as PII storage
 * 
 * GDPR COMPLIANCE CONSIDERATIONS:
 * - Hash-as-PII Debate: There is ongoing legal debate whether cryptographic
 *   hashes of personal data constitute PII under GDPR Article 4(1)
 * - Right to Erasure (GDPR Article 17): Blockchain immutability creates
 *   technical challenges for data deletion. Our mitigation:
 *   1. Only hashes are on-chain (not raw PII)
 *   2. Off-chain IPFS data can be unpinned/deleted
 *   3. Without IPFS data, on-chain hashes are meaningless
 * 
 * DATA CONTROLLER RESPONSIBILITIES:
 * - Platform operators must maintain IPFS infrastructure
 * - Users have right to request deletion of off-chain data
 * - Privacy policy must be clearly communicated
 */
contract PrivacyCompliance is Ownable {
    
    struct PrivacyPolicy {
        string policyHash; // IPFS hash of privacy policy document
        uint256 version;
        uint256 effectiveDate;
        bool isActive;
    }
    
    struct DataProcessingRecord {
        address user;
        string dataType; // e.g., "USER_REGISTRATION", "MEDICAL_CLAIM", "LOAN_APPLICATION"
        string ipfsHash; // Hash of the data stored off-chain
        uint256 timestamp;
        bool offChainDeleted; // Marks if IPFS data has been deleted
    }
    
    // Privacy policy versions
    mapping(uint256 => PrivacyPolicy) public privacyPolicies;
    uint256 public currentPolicyVersion;
    
    // User privacy acceptance tracking
    mapping(address => mapping(uint256 => bool)) public policyAcceptance;
    mapping(address => uint256) public userAcceptedVersion;
    
    // Data processing transparency
    mapping(bytes32 => DataProcessingRecord) public dataRecords;
    mapping(address => bytes32[]) public userDataRecords;
    
    // Events for transparency and auditability
    event PrivacyPolicyUpdated(uint256 indexed version, string policyHash, uint256 effectiveDate);
    event PolicyAccepted(address indexed user, uint256 indexed version, uint256 timestamp);
    event DataProcessed(address indexed user, string dataType, string ipfsHash, bytes32 recordId);
    event DataDeletionRequested(address indexed user, bytes32 recordId, uint256 timestamp);
    event OffChainDataDeleted(bytes32 indexed recordId, uint256 timestamp);
    
    constructor() Ownable(msg.sender) {
        // Initialize with default privacy policy
        _updatePrivacyPolicy(
            "QmPrivacyPolicyV1", // Placeholder IPFS hash
            block.timestamp
        );
    }
    
    /**
     * @dev Update privacy policy (only owner)
     * @param _policyHash IPFS hash of new privacy policy document
     * @param _effectiveDate When the policy becomes effective
     */
    function updatePrivacyPolicy(
        string memory _policyHash,
        uint256 _effectiveDate
    ) external onlyOwner {
        require(_effectiveDate >= block.timestamp, "Effective date must be in future");
        require(bytes(_policyHash).length > 0, "Policy hash required");
        
        _updatePrivacyPolicy(_policyHash, _effectiveDate);
    }
    
    function _updatePrivacyPolicy(string memory _policyHash, uint256 _effectiveDate) internal {
        currentPolicyVersion++;
        
        privacyPolicies[currentPolicyVersion] = PrivacyPolicy({
            policyHash: _policyHash,
            version: currentPolicyVersion,
            effectiveDate: _effectiveDate,
            isActive: true
        });
        
        emit PrivacyPolicyUpdated(currentPolicyVersion, _policyHash, _effectiveDate);
    }
    
    /**
     * @dev User accepts current privacy policy
     */
    function acceptPrivacyPolicy() external {
        require(
            !policyAcceptance[msg.sender][currentPolicyVersion],
            "Already accepted current policy"
        );
        
        policyAcceptance[msg.sender][currentPolicyVersion] = true;
        userAcceptedVersion[msg.sender] = currentPolicyVersion;
        
        emit PolicyAccepted(msg.sender, currentPolicyVersion, block.timestamp);
    }
    
    /**
     * @dev Record data processing event (called by other contracts)
     * @param _user User whose data is being processed
     * @param _dataType Type of data (e.g., "MEDICAL_CLAIM")
     * @param _ipfsHash IPFS hash where actual data is stored OFF-CHAIN
     */
    function recordDataProcessing(
        address _user,
        string memory _dataType,
        string memory _ipfsHash
    ) external returns (bytes32) {
        // Generate unique record ID
        bytes32 recordId = keccak256(
            abi.encodePacked(_user, _dataType, _ipfsHash, block.timestamp)
        );
        
        dataRecords[recordId] = DataProcessingRecord({
            user: _user,
            dataType: _dataType,
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            offChainDeleted: false
        });
        
        userDataRecords[_user].push(recordId);
        
        emit DataProcessed(_user, _dataType, _ipfsHash, recordId);
        
        return recordId;
    }
    
    /**
     * @dev User requests deletion of their off-chain data (GDPR Article 17)
     * Note: On-chain hash cannot be deleted, but off-chain IPFS data can be unpinned
     * @param _recordId Record ID of data to delete
     */
    function requestDataDeletion(bytes32 _recordId) external {
        DataProcessingRecord storage record = dataRecords[_recordId];
        require(record.user == msg.sender, "Not your data");
        require(!record.offChainDeleted, "Already deleted");
        
        emit DataDeletionRequested(msg.sender, _recordId, block.timestamp);
    }
    
    /**
     * @dev Platform confirms off-chain data has been deleted (owner only)
     * @param _recordId Record ID of deleted data
     */
    function confirmOffChainDeletion(bytes32 _recordId) external onlyOwner {
        DataProcessingRecord storage record = dataRecords[_recordId];
        require(!record.offChainDeleted, "Already marked as deleted");
        
        record.offChainDeleted = true;
        
        emit OffChainDataDeleted(_recordId, block.timestamp);
    }
    
    /**
     * @dev Check if user has accepted current privacy policy
     */
    function hasAcceptedCurrentPolicy(address _user) external view returns (bool) {
        return policyAcceptance[_user][currentPolicyVersion];
    }
    
    /**
     * @dev Get current privacy policy
     */
    function getCurrentPolicy() external view returns (PrivacyPolicy memory) {
        return privacyPolicies[currentPolicyVersion];
    }
    
    /**
     * @dev Get user's data processing records
     */
    function getUserDataRecords(address _user) external view returns (bytes32[] memory) {
        return userDataRecords[_user];
    }
    
    /**
     * @dev Get specific data record
     */
    function getDataRecord(bytes32 _recordId) external view returns (DataProcessingRecord memory) {
        return dataRecords[_recordId];
    }
    
    /**
     * @dev Get GDPR compliance summary for user
     */
    function getComplianceSummary(address _user) external view returns (
        bool hasAcceptedPolicy,
        uint256 acceptedVersion,
        uint256 totalRecords,
        uint256 deletedRecords
    ) {
        hasAcceptedPolicy = policyAcceptance[_user][currentPolicyVersion];
        acceptedVersion = userAcceptedVersion[_user];
        
        bytes32[] memory records = userDataRecords[_user];
        totalRecords = records.length;
        deletedRecords = 0;
        
        for (uint256 i = 0; i < records.length; i++) {
            if (dataRecords[records[i]].offChainDeleted) {
                deletedRecords++;
            }
        }
    }
}
