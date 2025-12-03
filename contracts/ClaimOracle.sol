// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ClaimOracle
 * @dev Oracle integration for medical claim verification
 * 
 * VERIFICATION METHODS:
 * 1. Chainlink Oracle (Production): External API calls to hospital systems
 * 2. ZK-Email (Emerging): Verify digital signatures from hospital emails
 * 3. Simulation Mode (Development): Admin manual verification for testing
 * 
 * ANTI-FRAUD MECHANISM:
 * - Addresses the problem: How do random pool members verify a PDF medical bill?
 * - Photoshop exists, fake documents are easy to create
 * - Without trusted verification, cartels could upload fake bills and vote "Yes"
 * 
 * SOLUTION:
 * - Hospital APIs provide cryptographic proof of treatment
 * - ZK-Email verifies hospital email digital signatures
 * - Multi-source verification reduces fraud risk
 * 
 * NOTE: This is a stub implementation with simulation mode for local development.
 * Production deployment requires Chainlink subscription and hospital API integrations.
 */
contract ClaimOracle is Ownable {
    
    enum VerificationStatus {
        PENDING,        // Awaiting verification
        VERIFYING,      // Oracle request in progress
        VERIFIED,       // Claim verified as authentic
        REJECTED,       // Claim rejected as fraudulent
        FAILED         // Verification process failed
    }
    
    enum VerificationMethod {
        CHAINLINK_API,  // Chainlink oracle external API call
        ZK_EMAIL,       // Zero-knowledge email verification
        SIMULATION      // Simulation mode for development
    }
    
    struct ClaimVerification {
        uint256 claimId;
        address claimant;
        string ipfsHash;        // Document hash to verify
        VerificationStatus status;
        VerificationMethod method;
        uint256 requestedAt;
        uint256 verifiedAt;
        string verificationProof; // IPFS hash of verification proof
        address verifier;         // Address that verified (oracle or admin)
    }
    
    // Mapping: claimId => ClaimVerification
    mapping(uint256 => ClaimVerification) public verifications;
    
    // Oracle request tracking
    mapping(bytes32 => uint256) public oracleRequestToClaim; // Chainlink request ID => claim ID
    
    // Authorized verifiers (for simulation mode)
    mapping(address => bool) public authorizedVerifiers;
    
    // Settings
    bool public simulationMode = true; // Start in simulation mode for development
    address public insurancePoolContract;
    
    // Events
    event VerificationRequested(
        uint256 indexed claimId,
        address indexed claimant,
        VerificationMethod method
    );
    event VerificationCompleted(
        uint256 indexed claimId,
        VerificationStatus status,
        string proof
    );
    event OracleRequestSent(uint256 indexed claimId, bytes32 requestId);
    event OracleResponseReceived(bytes32 indexed requestId, uint256 claimId);
    event SimulationModeToggled(bool enabled);
    
    constructor() Ownable(msg.sender) {
        authorizedVerifiers[msg.sender] = true;
    }
    
    /**
     * @dev Set the insurance pool contract address
     */
    function setInsurancePoolContract(address _contract) external onlyOwner {
        insurancePoolContract = _contract;
    }
    
    /**
     * @dev Toggle simulation mode on/off
     */
    function setSimulationMode(bool _enabled) external onlyOwner {
        simulationMode = _enabled;
        emit SimulationModeToggled(_enabled);
    }
    
    /**
     * @dev Add authorized verifier (for simulation mode)
     */
    function addAuthorizedVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = true;
    }
    
    /**
     * @dev Remove authorized verifier
     */
    function removeAuthorizedVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = false;
    }
    
    /**
     * @dev Request verification for a claim
     * @param _claimId Claim ID to verify
     * @param _claimant Address of claimant
     * @param _ipfsHash IPFS hash of medical documents
     * @param _method Verification method to use
     */
    function requestVerification(
        uint256 _claimId,
        address _claimant,
        string memory _ipfsHash,
        VerificationMethod _method
    ) external returns (bool) {
        // Only insurance pool contract can request verification
        require(
            msg.sender == insurancePoolContract || msg.sender == owner(),
            "Only insurance pool or owner can request verification"
        );
        
        // Check if already verified or in progress
        require(
            verifications[_claimId].status == VerificationStatus.PENDING ||
            verifications[_claimId].requestedAt == 0,
            "Verification already requested"
        );
        
        // Create verification record
        verifications[_claimId] = ClaimVerification({
            claimId: _claimId,
            claimant: _claimant,
            ipfsHash: _ipfsHash,
            status: VerificationStatus.VERIFYING,
            method: _method,
            requestedAt: block.timestamp,
            verifiedAt: 0,
            verificationProof: "",
            verifier: address(0)
        });
        
        emit VerificationRequested(_claimId, _claimant, _method);
        
        // Route to appropriate verification method
        if (simulationMode || _method == VerificationMethod.SIMULATION) {
            // In simulation mode, wait for manual verification
            return true;
        } else if (_method == VerificationMethod.CHAINLINK_API) {
            return _requestChainlinkVerification(_claimId, _ipfsHash);
        } else if (_method == VerificationMethod.ZK_EMAIL) {
            return _requestZKEmailVerification(_claimId, _ipfsHash);
        }
        
        return false;
    }
    
    /**
     * @dev Request verification via Chainlink oracle (stub for production)
     * NOTE: This is a placeholder. Production requires:
     * 1. Chainlink VRF/Any-API setup
     * 2. LINK token funding
     * 3. Hospital API integration
     */
    function _requestChainlinkVerification(
        uint256 _claimId,
        string memory _ipfsHash
    ) internal returns (bool) {
        // STUB IMPLEMENTATION
        // In production, this would:
        // 1. Create Chainlink request
        // 2. Call hospital API with _ipfsHash
        // 3. Store request ID mapping
        // 4. Wait for oracle callback
        
        // For now, just emit event
        bytes32 requestId = keccak256(abi.encodePacked(_claimId, _ipfsHash, block.timestamp));
        oracleRequestToClaim[requestId] = _claimId;
        
        emit OracleRequestSent(_claimId, requestId);
        
        return true;
    }
    
    /**
     * @dev Request verification via ZK-Email (stub for production)
     * NOTE: This is a placeholder for future ZK-Email integration
     */
    function _requestZKEmailVerification(
        uint256 _claimId,
        string memory // _ipfsHash
    ) internal returns (bool) {
        // STUB IMPLEMENTATION
        // In production, this would verify hospital email signatures
        
        emit VerificationRequested(_claimId, verifications[_claimId].claimant, VerificationMethod.ZK_EMAIL);
        
        return true;
    }
    
    /**
     * @dev Chainlink oracle callback (stub for production)
     * NOTE: In production, this would be called by Chainlink oracle
     */
    function fulfillVerification(
        bytes32 _requestId,
        bool _isVerified,
        string memory _proof
    ) external {
        // STUB: In production, add Chainlink oracle verification
        // require(msg.sender == chainlinkOracleAddress, "Only oracle can fulfill");
        
        uint256 claimId = oracleRequestToClaim[_requestId];
        require(claimId > 0, "Invalid request ID");
        
        ClaimVerification storage verification = verifications[claimId];
        
        verification.status = _isVerified ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;
        verification.verifiedAt = block.timestamp;
        verification.verificationProof = _proof;
        verification.verifier = msg.sender;
        
        emit OracleResponseReceived(_requestId, claimId);
        emit VerificationCompleted(claimId, verification.status, _proof);
    }
    
    /**
     * @dev Simulation mode: Admin manually verifies claim
     * @param _claimId Claim ID to verify
     * @param _isVerified True if verified, false if rejected
     * @param _proof IPFS hash of verification proof/notes
     */
    function simulateVerification(
        uint256 _claimId,
        bool _isVerified,
        string memory _proof
    ) external {
        require(simulationMode, "Not in simulation mode");
        require(
            authorizedVerifiers[msg.sender] || msg.sender == owner(),
            "Not authorized to verify"
        );
        
        ClaimVerification storage verification = verifications[_claimId];
        require(verification.requestedAt > 0, "No verification requested");
        require(
            verification.status == VerificationStatus.PENDING ||
            verification.status == VerificationStatus.VERIFYING,
            "Already verified"
        );
        
        verification.status = _isVerified ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;
        verification.verifiedAt = block.timestamp;
        verification.verificationProof = _proof;
        verification.verifier = msg.sender;
        
        emit VerificationCompleted(_claimId, verification.status, _proof);
    }
    
    /**
     * @dev Get verification status for a claim
     */
    function getVerificationStatus(uint256 _claimId) external view returns (
        VerificationStatus status,
        VerificationMethod method,
        string memory proof,
        uint256 verifiedAt
    ) {
        ClaimVerification memory verification = verifications[_claimId];
        return (
            verification.status,
            verification.method,
            verification.verificationProof,
            verification.verifiedAt
        );
    }
    
    /**
     * @dev Check if claim is verified
     */
    function isClaimVerified(uint256 _claimId) external view returns (bool) {
        return verifications[_claimId].status == VerificationStatus.VERIFIED;
    }
    
    /**
     * @dev Check if claim verification is pending
     */
    function isVerificationPending(uint256 _claimId) external view returns (bool) {
        VerificationStatus status = verifications[_claimId].status;
        return status == VerificationStatus.PENDING || status == VerificationStatus.VERIFYING;
    }
    
    /**
     * @dev Get full verification details
     */
    function getVerificationDetails(uint256 _claimId) external view returns (ClaimVerification memory) {
        return verifications[_claimId];
    }
}
