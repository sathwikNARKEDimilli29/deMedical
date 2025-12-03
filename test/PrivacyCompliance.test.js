const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PrivacyCompliance Contract", function () {
  let privacyCompliance;
  let owner, user1, user2, dataController;
  
  beforeEach(async function () {
    [owner, user1, user2, dataController] = await ethers.getSigners();
    
    // Deploy PrivacyCompliance
    const PrivacyCompliance = await ethers.getContractFactory("PrivacyCompliance");
    privacyCompliance = await PrivacyCompliance.deploy();
    await privacyCompliance.waitForDeployment();
  });
  
  describe("Privacy Policy Management", function () {
    it("Should have default privacy policy", async function () {
      const policy = await privacyCompliance.getCurrentPolicy();
      
      expect(policy.version).to.equal(1);
      expect(policy.isActive).to.be.true;
      expect(policy.policyHash).to.include("QmDefault");
    });
    
    it("Should update privacy policy", async function () {
      await privacyCompliance.updatePrivacyPolicy(
        "QmNewPolicy2024",
        Math.floor(Date.now() / 1000)
      );
      
      const policy = await privacyCompliance.getCurrentPolicy();
      expect(policy.version).to.equal(2);
      expect(policy.policyHash).to.equal("QmNewPolicy2024");
    });
    
    it("Should only allow owner to update policy", async function () {
      await expect(
        privacyCompliance.connect(user1).updatePrivacyPolicy(
          "QmUnauthorized",
          Math.floor(Date.now() / 1000)
        )
      ).to.be.revertedWithCustomError(privacyCompliance, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("User Consent Management", function () {
    it("Should allow user to accept privacy policy", async function () {
      await privacyCompliance.connect(user1).acceptPrivacyPolicy();
      
      const hasAccepted = await privacyCompliance.hasAcceptedCurrentPolicy(user1.address);
      expect(hasAccepted).to.be.true;
    });
    
    it("Should prevent duplicate acceptance", async function () {
      await privacyCompliance.connect(user1).acceptPrivacyPolicy();
      
      await expect(
        privacyCompliance.connect(user1).acceptPrivacyPolicy()
      ).to.be.revertedWith("Already accepted current policy");
    });
    
    it("Should require new acceptance after policy update", async function () {
      await privacyCompliance.connect(user1).acceptPrivacyPolicy();
      
      // Update policy
      await privacyCompliance.updatePrivacyPolicy(
        "QmNewPolicy",
        Math.floor(Date.now() / 1000)
      );
      
      // User should not have accepted new policy
      const hasAccepted = await privacyCompliance.hasAcceptedCurrentPolicy(user1.address);
      expect(hasAccepted).to.be.false;
      
      // Should be able to accept new policy
      await privacyCompliance.connect(user1).acceptPrivacyPolicy();
      const hasAcceptedNew = await privacyCompliance.hasAcceptedCurrentPolicy(user1.address);
      expect(hasAcceptedNew).to.be.true;
    });
  });
  
  describe("Data Processing Records", function () {
    beforeEach(async function () {
      await privacyCompliance.connect(user1).acceptPrivacyPolicy();
    });
    
    it("Should record data processing", async function () {
      const recordId = await privacyCompliance.recordDataProcessing(
        user1.address,
        "KYC Data",
        "QmKycData123"
      );
      
      const record = await privacyCompliance.getDataRecord(recordId);
      expect(record.user).to.equal(user1.address);
      expect(record.dataType).to.equal("KYC Data");
      expect(record.ipfsHash).to.equal("QmKycData123");
      expect(record.offChainDeleted).to.be.false;
    });
    
    it("Should track multiple data records for user", async function () {
      await privacyCompliance.recordDataProcessing(
        user1.address,
        "KYC Data",
        "QmKyc"
      );
      
      await privacyCompliance.recordDataProcessing(
        user1.address,
        "Medical Data",
        "QmMedical"
      );
      
      await privacyCompliance.recordDataProcessing(
        user1.address,
        "Financial Data",
        "QmFinancial"
      );
      
      const userRecords = await privacyCompliance.getUserDataRecords(user1.address);
      expect(userRecords.length).to.equal(3);
    });
    
    it("Should get user data summary", async function () {
      await privacyCompliance.recordDataProcessing(user1.address, "Type1", "QmData1");
      await privacyCompliance.recordDataProcessing(user1.address, "Type2", "QmData2");
      
      const [recordCount, deletedCount] = await privacyCompliance.getUserDataSummary(user1.address);
      
      expect(recordCount).to.equal(2);
      expect(deletedCount).to.equal(0);
    });
  });
  
  describe("GDPR Data Deletion (Article 17)", function () {
    let recordId;
    
    beforeEach(async function () {
      await privacyCompliance.connect(user1).acceptPrivacyPolicy();
      recordId = await privacyCompliance.recordDataProcessing(
        user1.address,
        "Sensitive Data",
        "QmSensitiveData"
      );
    });
    
    it("Should allow user to request data deletion", async function () {
      await privacyCompliance.connect(user1).requestDataDeletion(recordId);
      
      // Note: On-chain hash remains, but this marks for off-chain deletion
      // In real system, this would trigger off-chain IPFS unpinning
      const record = await privacyCompliance.getDataRecord(recordId);
      expect(record.offChainDeleted).to.be.false; // Not yet confirmed deleted
    });
    
    it("Should allow data controller to confirm deletion", async function () {
      await privacyCompliance.connect(user1).requestDataDeletion(recordId);
      await privacyCompliance.confirmOffChainDeletion(recordId);
      
      const record = await privacyCompliance.getDataRecord(recordId);
      expect(record.offChainDeleted).to.be.true;
    });
    
    it("Should update deletion count in summary", async function () {
      const recordId2 = await privacyCompliance.recordDataProcessing(
        user1.address,
        "Data2",
        "QmData2"
      );
      
      await privacyCompliance.connect(user1).requestDataDeletion(recordId);
      await privacyCompliance.confirmOffChainDeletion(recordId);
      
      const [totalRecords, deletedRecords] = await privacyCompliance.getUserDataSummary(user1.address);
      
      expect(totalRecords).to.equal(2);
      expect(deletedRecords).to.equal(1);
    });
    
    it("Should only allow user to request deletion of own data", async function () {
      await expect(
        privacyCompliance.connect(user2).requestDataDeletion(recordId)
      ).to.be.revertedWith("Not data owner");
    });
    
    it("Should only allow owner to confirm deletion", async function () {
      await privacyCompliance.connect(user1).requestDataDeletion(recordId);
      
      await expect(
        privacyCompliance.connect(user1).confirmOffChainDeletion(recordId)
      ).to.be.revertedWithCustomError(privacyCompliance, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("Multiple Users Workflow", function () {
    it("Should handle data for multiple users independently", async function () {
      // User1 accepts policy and adds data
      await privacyCompliance.connect(user1).acceptPrivacyPolicy();
      await privacyCompliance.recordDataProcessing(user1.address, "User1 Data", "QmUser1");
      
      // User2 accepts policy and adds data
      await privacyCompliance.connect(user2).acceptPrivacyPolicy();
      await privacyCompliance.recordDataProcessing(user2.address, "User2 Data", "QmUser2");
      
      const user1Records = await privacyCompliance.getUserDataRecords(user1.address);
      const user2Records = await privacyCompliance.getUserDataRecords(user2.address);
      
      expect(user1Records.length).to.equal(1);
      expect(user2Records.length).to.equal(1);
      expect(user1Records[0]).to.not.equal(user2Records[0]); // Different record IDs
    });
  });
  
  describe("Complete Privacy Lifecycle", function () {
    it("Should handle full privacy compliance workflow", async function () {
      // 1. User accepts privacy policy
      await privacyCompliance.connect(user1).acceptPrivacyPolicy();
      expect(await privacyCompliance.hasAcceptedCurrentPolicy(user1.address)).to.be.true;
      
      // 2. Data processing is recorded
      const recordId1 = await privacyCompliance.recordDataProcessing(
        user1.address,
        "KYC Data",
        "QmKYC123"
      );
      
      const recordId2 = await privacyCompliance.recordDataProcessing(
        user1.address,
        "Medical Data",
        "QmMedical456"
      );
      
      // 3. Check data summary
      let [total, deleted] = await privacyCompliance.getUserDataSummary(user1.address);
      expect(total).to.equal(2);
      expect(deleted).to.equal(0);
      
      // 4. User requests deletion of one record (GDPR Article 17)
      await privacyCompliance.connect(user1).requestDataDeletion(recordId1);
      
      // 5. Data controller confirms off-chain deletion
      await privacyCompliance.confirmOffChainDeletion(recordId1);
      
      // 6. Verify deletion status
      [total, deleted] = await privacyCompliance.getUserDataSummary(user1.address);
      expect(total).to.equal(2);
      expect(deleted).to.equal(1);
      
      const deletedRecord = await privacyCompliance.getDataRecord(recordId1);
      expect(deletedRecord.offChainDeleted).to.be.true;
      
      const activeRecord = await privacyCompliance.getDataRecord(recordId2);
      expect(activeRecord.offChainDeleted).to.be.false;
    });
  });
  
  describe("Privacy Policy Version Tracking", function () {
    it("Should track multiple policy versions", async function () {
      const version1 = await privacyCompliance.getCurrentPolicy();
      expect(version1.version).to.equal(1);
      
      await privacyCompliance.updatePrivacyPolicy("QmV2", Math.floor(Date.now() / 1000));
      const version2 = await privacyCompliance.getCurrentPolicy();
      expect(version2.version).to.equal(2);
      
      await privacyCompliance.updatePrivacyPolicy("QmV3", Math.floor(Date.now() / 1000));
      const version3 = await privacyCompliance.getCurrentPolicy();
      expect(version3.version).to.equal(3);
      
      // All versions should be active
      const policy1 = await privacyCompliance.privacyPolicies(1);
      const policy2 = await privacyCompliance.privacyPolicies(2);
      const policy3 = await privacyCompliance.privacyPolicies(3);
      
      expect(policy1.isActive).to.be.true;
      expect(policy2.isActive).to.be.true;
      expect(policy3.isActive).to.be.true;
    });
  });
  
  describe("Edge Cases", function () {
    it("Should handle non-existent record query", async function () {
      const invalidId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      const record = await privacyCompliance.getDataRecord(invalidId);
      
      expect(record.user).to.equal(ethers.ZeroAddress);
    });
    
    it("Should handle user with no data records", async function () {
      const records = await privacyCompliance.getUserDataRecords(user2.address);
      expect(records.length).to.equal(0);
      
      const [total, deleted] = await privacyCompliance.getUserDataSummary(user2.address);
      expect(total).to.equal(0);
      expect(deleted).to.equal(0);
    });
  });
});
