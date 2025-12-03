const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BugBounty Contract", function () {
  let bugBounty;
  let owner, researcher1, researcher2, researcher3;
  
  beforeEach(async function () {
    [owner, researcher1, researcher2, researcher3] = await ethers.getSigners();
    
    // Deploy BugBounty with initial rewards for all severity levels
    const BugBounty = await ethers.getContractFactory("BugBounty");
    const initialRewards = [
      ethers.parseEther("0.1"),   // INFORMATIONAL
      ethers.parseEther("0.5"),   // LOW
      ethers.parseEther("1"),     // MEDIUM
      ethers.parseEther("2"),     // HIGH
      ethers.parseEther("5")      // CRITICAL
    ];
    bugBounty = await BugBounty.deploy(initialRewards);
    await bugBounty.waitForDeployment();
    
    // Fund the contract
    await owner.sendTransaction({
      to: await bugBounty.getAddress(),
      value: ethers.parseEther("20")
    });
  });
  
  describe("Researcher Registration", function () {
    it("Should register a new researcher", async function () {
      await bugBounty.connect(researcher1).registerResearcher("Alice", "alice@security.com");
      
      const info = await bugBounty.getResearcher(researcher1.address);
      expect(info.name).to.equal("Alice");
      expect(info.email).to.equal("alice@security.com");
      expect(info.isActive).to.be.true;
      expect(info.totalReports).to.equal(0);
      expect(info.totalEarnings).to.equal(0);
    });
    
    it("Should prevent duplicate registration", async function () {
      await bugBounty.connect(researcher1).registerResearcher("Alice", "alice@security.com");
      
      await expect(
        bugBounty.connect(researcher1).registerResearcher("Alice2", "alice2@security.com")
      ).to.be.revertedWith("Already registered");
    });
  });
  
  describe("Bug Report Submission", function () {
    beforeEach(async function () {
      await bugBounty.connect(researcher1).registerResearcher("Alice", "alice@security.com");
    });
    
    it("Should submit a bug report", async function () {
      const tx = await bugBounty.connect(researcher1).submitReport(
        "SQL Injection vulnerability",
        "QmTestHash123",
        3 // HIGH severity
      );
      
      const report = await bugBounty.getReport(1);
      expect(report.researcher).to.equal(researcher1.address);
      expect(report.title).to.equal("SQL Injection vulnerability");
      expect(report.initialSeverity).to.equal(3);
      expect(report.status).to.equal(0); // SUBMITTED
    });
    
    it("Should fail if not registered", async function () {
      await expect(
        bugBounty.connect(researcher2).submitReport(
          "Bug report",
          "QmTestHash",
          2
        )
      ).to.be.revertedWith("Register as researcher first");
    });
    
    it("Should fail with invalid inputs", async function () {
      await expect(
        bugBounty.connect(researcher1).submitReport("", "QmTestHash", 2)
      ).to.be.revertedWith("Title required");
      
      await expect(
        bugBounty.connect(researcher1).submitReport("Title", "", 2)
      ).to.be.revertedWith("IPFS hash required");
    });
  });
  
  describe("Bug Report Triaging", function () {
    beforeEach(async function () {
      await bugBounty.connect(researcher1).registerResearcher("Alice", "alice@security.com");
      await bugBounty.connect(researcher1).submitReport(
        "XSS vulnerability",
        "QmTestHash456",
        2 // MEDIUM
      );
    });
    
    it("Should triage a report", async function () {
      await bugBounty.triageReport(1, 3); // Upgrade to HIGH
      
      const report = await bugBounty.getReport(1);
      expect(report.severity).to.equal(3);
      expect(report.status).to.equal(1); // TRIAGED
    });
    
    it("Should only allow owner to triage", async function () {
      await expect(
        bugBounty.connect(researcher1).triageReport(1, 3)
      ).to.be.revertedWithCustomError(bugBounty, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("Bug Report Verification", function () {
    beforeEach(async function () {
      await bugBounty.connect(researcher1).registerResearcher("Alice", "alice@security.com");
      await bugBounty.connect(researcher1).submitReport(
        "Critical RCE",
        "QmTestHash789",
        4 // CRITICAL
      );
      await bugBounty.triageReport(1, 4);
    });
    
    it("Should verify and set reward", async function () {
      await bugBounty.verifyReport(1);
      
      const report = await bugBounty.getReport(1);
      expect(report.status).to.equal(2); // VERIFIED
      expect(report.reward).to.equal(ethers.parseEther("5")); // CRITICAL reward
    });
    
    it("Should only allow owner to verify", async function () {
      await expect(
        bugBounty.connect(researcher1).verifyReport(1)
      ).to.be.revertedWithCustomError(bugBounty, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("Bug Report Rejection", function () {
    beforeEach(async function () {
      await bugBounty.connect(researcher1).registerResearcher("Alice", "alice@security.com");
      await bugBounty.connect(researcher1).submitReport(
        "False positive",
        "QmTestHashFalse",
        1
      );
      await bugBounty.triageReport(1, 1);
    });
    
    it("Should reject a report with reason", async function () {
      await bugBounty.rejectReport(1, "Not a valid security issue");
      
      const report = await bugBounty.getReport(1);
      expect(report.status).to.equal(3); // REJECTED
    });
  });
  
  describe("Reward Payment", function () {
    beforeEach(async function () {
      await bugBounty.connect(researcher1).registerResearcher("Alice", "alice@security.com");
      await bugBounty.connect(researcher1).submitReport(
        "High severity bug",
        "QmTestHashHigh",
        3
      );
      await bugBounty.triageReport(1, 3);
      await bugBounty.verifyReport(1);
    });
    
    it("Should pay reward to researcher", async function () {
      const balanceBefore = await ethers.provider.getBalance(researcher1.address);
      
      await bugBounty.payReward(1);
      
      const balanceAfter = await ethers.provider.getBalance(researcher1.address);
      const report = await bugBounty.getReport(1);
      
      expect(report.status).to.equal(4); // PAID
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });
    
    it("Should update researcher stats", async function () {
      await bugBounty.payReward(1);
      
      const researcher = await bugBounty.getResearcher(researcher1.address);
      expect(researcher.totalEarnings).to.equal(ethers.parseEther("2"));
    });
    
    it("Should prevent double payment", async function () {
      await bugBounty.payReward(1);
      
      await expect(
        bugBounty.payReward(1)
      ).to.be.revertedWith("Not verified");
    });
  });
  
  describe("Reward Updates", function () {
    it("Should allow owner to update rewards", async function () {
      await bugBounty.updateReward(4, ethers.parseEther("10")); // Update CRITICAL to 10 ETH
      
      const reward = await bugBounty.rewards(4);
      expect(reward).to.equal(ethers.parseEther("10"));
    });
    
    it("Should only allow owner to update rewards", async function () {
      await expect(
        bugBounty.connect(researcher1).updateReward(4, ethers.parseEther("10"))
      ).to.be.revertedWithCustomError(bugBounty, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("Multiple Reports Workflow", function () {
    it("Should handle multiple researchers and reports", async function () {
      // Register multiple researchers
      await bugBounty.connect(researcher1).registerResearcher("Alice", "alice@security.com");
      await bugBounty.connect(researcher2).registerResearcher("Bob", "bob@security.com");
      
      // Submit multiple reports
      await bugBounty.connect(researcher1).submitReport("Bug 1", "QmHash1", 2);
      await bugBounty.connect(researcher2).submitReport("Bug 2", "QmHash2", 3);
      await bugBounty.connect(researcher1).submitReport("Bug 3", "QmHash3", 1);
      
      const researcher1Info = await bugBounty.getResearcher(researcher1.address);
      const researcher2Info = await bugBounty.getResearcher(researcher2.address);
      
      expect(researcher1Info.totalReports).to.equal(2);
      expect(researcher2Info.totalReports).to.equal(1);
    });
  });
  
  describe("View Functions", function () {
    beforeEach(async function () {
      await bugBounty.connect(researcher1).registerResearcher("Alice", "alice@security.com");
      await bugBounty.connect(researcher1).submitReport("Test bug", "QmHash", 2);
    });
    
    it("Should get researcher info", async function () {
      const info = await bugBounty.getResearcher(researcher1.address);
      expect(info.name).to.equal("Alice");
    });
    
    it("Should get report details", async function () {
      const report = await bugBounty.getReport(1);
      expect(report.title).to.equal("Test bug");
    });
  });
});
