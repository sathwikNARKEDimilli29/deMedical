// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BugBounty
 * @dev Bug bounty program for security researchers to report vulnerabilities
 */
contract BugBounty is Ownable, ReentrancyGuard {
    
    enum Severity { INFORMATIONAL, LOW, MEDIUM, HIGH, CRITICAL }
    enum Status { SUBMITTED, TRIAGED, VERIFIED, REJECTED, PAID }
    
    struct Report {
        uint256 id;
        address researcher;
        string title;
        string ipfsHash; // Details stored on IPFS
        Severity severity;
        Status status;
        uint256 reward;
        uint256 submittedAt;
        uint256 resolvedAt;
        bool publiclyDisclosed;
    }
    
    struct Researcher {
        address researcherAddress;
        uint256 totalReports;
        uint256 validReports;
        uint256 totalRewards;
        uint256 rank;
        bool isActive;
    }
    
    mapping(uint256 => Report) public reports;
    mapping(address => Researcher) public researchers;
    mapping(address => uint256[]) public researcherReports;
    
    uint256 public reportCount;
    uint256 public totalPaidOut;
    
    // Reward structure (in wei)
    mapping(Severity => uint256) public rewards;
    
    event ResearcherRegistered(address indexed researcher);
    event ReportSubmitted(uint256 indexed reportId, address indexed researcher, Severity severity);
    event ReportTriaged(uint256 indexed reportId, Severity severity);
    event ReportVerified(uint256 indexed reportId, uint256 reward);
    event ReportRejected(uint256 indexed reportId, string reason);
    event RewardPaid(uint256 indexed reportId, address indexed researcher, uint256 amount);
    event RewardUpdated(Severity severity, uint256 newReward);
    event PublicDisclosure(uint256 indexed reportId);
    
    constructor(uint256[] memory _initialRewards) Ownable(msg.sender) {
        require(_initialRewards.length == 5, "Invalid rewards length");
        // Set initial rewards
        rewards[Severity.INFORMATIONAL] = _initialRewards[0];
        rewards[Severity.LOW] = _initialRewards[1];
        rewards[Severity.MEDIUM] = _initialRewards[2];
        rewards[Severity.HIGH] = _initialRewards[3];
        rewards[Severity.CRITICAL] = _initialRewards[4];
    }
    
    // Fund the bounty pool
    function fundBountyPool() external payable {
        require(msg.value > 0, "Must send funds");
    }
    
    // Researcher registration
    function registerResearcher() external {
        require(!researchers[msg.sender].isActive, "Already registered");
        
        researchers[msg.sender] = Researcher({
            researcherAddress: msg.sender,
            totalReports: 0,
            validReports: 0,
            totalRewards: 0,
            rank: 0,
            isActive: true
        });
        
        emit ResearcherRegistered(msg.sender);
    }
    
    // Submit a bug report
    function submitReport(
        string memory _title,
        string memory _ipfsHash,
        Severity _severity
    ) external returns (uint256) {
        require(researchers[msg.sender].isActive, "Register as researcher first");
        require(bytes(_title).length > 0, "Title required");
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        
        reportCount++;
        
        reports[reportCount] = Report({
            id: reportCount,
            researcher: msg.sender,
            title: _title,
            ipfsHash: _ipfsHash,
            severity: _severity,
            status: Status.SUBMITTED,
            reward: 0,
            submittedAt: block.timestamp,
            resolvedAt: 0,
            publiclyDisclosed: false
        });
        
        researcherReports[msg.sender].push(reportCount);
        researchers[msg.sender].totalReports++;
        
        emit ReportSubmitted(reportCount, msg.sender, _severity);
        
        return reportCount;
    }
    
    // Triage a report (admin only) - confirm/adjust severity
    function triageReport(uint256 _reportId, Severity _confirmedSeverity) external onlyOwner {
        Report storage report = reports[_reportId];
        require(report.status == Status.SUBMITTED, "Already triaged");
        
        report.severity = _confirmedSeverity;
        report.status = Status.TRIAGED;
        
        emit ReportTriaged(_reportId, _confirmedSeverity);
    }
    
    // Verify and approve a bug (admin only)
    function verifyReport(uint256 _reportId) external onlyOwner {
        Report storage report = reports[_reportId];
        require(report.status == Status.TRIAGED, "Not triaged");
        
        uint256 rewardAmount = rewards[report.severity];
        require(address(this).balance >= rewardAmount, "Insufficient bounty pool");
        
        report.status = Status.VERIFIED;
        report.reward = rewardAmount;
        
        researchers[report.researcher].validReports++;
        
        emit ReportVerified(_reportId, rewardAmount);
    }
    
    // Reject a report (admin only)
    function rejectReport(uint256 _reportId, string memory _reason) external onlyOwner {
        Report storage report = reports[_reportId];
        require(report.status == Status.SUBMITTED || report.status == Status.TRIAGED, "Invalid status");
        
        report.status = Status.REJECTED;
        report.resolvedAt = block.timestamp;
        
        emit ReportRejected(_reportId, _reason);
    }
    
    // Pay out reward (admin only, after fix is deployed)
    function payReward(uint256 _reportId) external onlyOwner nonReentrant {
        Report storage report = reports[_reportId];
        require(report.status == Status.VERIFIED, "Not verified");
        require(report.reward > 0, "No reward set");
        require(address(this).balance >= report.reward, "Insufficient balance");
        
        report.status = Status.PAID;
        report.resolvedAt = block.timestamp;
        
        researchers[report.researcher].totalRewards += report.reward;
        totalPaidOut += report.reward;
        
        // Transfer reward
        (bool success, ) = report.researcher.call{value: report.reward}("");
        require(success, "Transfer failed");
        
        emit RewardPaid(_reportId, report.researcher, report.reward);
    }
    
    // Publish responsible disclosure (after fix)
    function publishDisclosure(uint256 _reportId) external onlyOwner {
        Report storage report = reports[_reportId];
        require(report.status == Status.PAID, "Must be paid first");
        
        report.publiclyDisclosed = true;
        
        emit PublicDisclosure(_reportId);
    }
    
    // Update reward amounts (admin only)
    function updateReward(Severity _severity, uint256 _newReward) external onlyOwner {
        rewards[_severity] = _newReward;
        emit RewardUpdated(_severity, _newReward);
    }
    
    // Get report details
    function getReport(uint256 _reportId) external view returns (Report memory) {
        return reports[_reportId];
    }
    
    // Get researcher info
    function getResearcher(address _researcher) external view returns (Researcher memory) {
        return researchers[_researcher];
    }
    
    // Get all reports by researcher
    function getResearcherReports(address _researcher) external view returns (uint256[] memory) {
        return researcherReports[_researcher];
    }
    
    // Get leaderboard (top reporters by valid reports)
    function getLeaderboard() external view returns (address[] memory, uint256[] memory) {
        // Note: In production, this would be optimized with off-chain indexing
        // For now, returns empty arrays - implement ranking logic as needed
        address[] memory topResearchers = new address[](0);
        uint256[] memory validCounts = new uint256[](0);
        return (topResearchers, validCounts);
    }
    
    // Get bounty pool balance
    function getBountyPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // Emergency withdraw (owner only)
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdraw failed");
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}
