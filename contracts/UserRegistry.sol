// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UserRegistry
 * @dev Manages user registration and KYC status
 */
contract UserRegistry is Ownable, ReentrancyGuard {
    
    struct User {
        address walletAddress;
        bool isRegistered;
        bool isKYCVerified;
        uint256 registrationTime;
        string ipfsHash; // IPFS hash for user documents
    }
    
    mapping(address => User) public users;
    mapping(address => bool) public kycVerifiers;
    
    event UserRegistered(address indexed userAddress, uint256 timestamp);
    event KYCVerified(address indexed userAddress, address indexed verifier);
    event KYCRevoked(address indexed userAddress, address indexed verifier);
    
    constructor() Ownable(msg.sender) {}
    
    modifier onlyKYCVerifier() {
        require(kycVerifiers[msg.sender], "Not authorized as KYC verifier");
        _;
    }
    
    function registerUser(string memory _ipfsHash) external {
        require(!users[msg.sender].isRegistered, "User already registered");
        
        users[msg.sender] = User({
            walletAddress: msg.sender,
            isRegistered: true,
            isKYCVerified: false,
            registrationTime: block.timestamp,
            ipfsHash: _ipfsHash
        });
        
        emit UserRegistered(msg.sender, block.timestamp);
    }
    
    function addKYCVerifier(address _verifier) external onlyOwner {
        kycVerifiers[_verifier] = true;
    }
    
    function removeKYCVerifier(address _verifier) external onlyOwner {
        kycVerifiers[_verifier] = false;
    }
    
    function verifyKYC(address _user) external onlyKYCVerifier {
        require(users[_user].isRegistered, "User not registered");
        users[_user].isKYCVerified = true;
        emit KYCVerified(_user, msg.sender);
    }
    
    function revokeKYC(address _user) external onlyKYCVerifier {
        require(users[_user].isRegistered, "User not registered");
        users[_user].isKYCVerified = false;
        emit KYCRevoked(_user, msg.sender);
    }
    
    function isUserRegistered(address _user) external view returns (bool) {
        return users[_user].isRegistered;
    }
    
    function isUserKYCVerified(address _user) external view returns (bool) {
        return users[_user].isKYCVerified;
    }
    
    function getUserInfo(address _user) external view returns (User memory) {
        return users[_user];
    }
}
