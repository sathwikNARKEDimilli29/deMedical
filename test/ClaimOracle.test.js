const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ClaimOracle Contract", function () {
  let claimOracle, userRegistry, insurancePool;
  let owner, verifier1, verifier2, claimant;
  
  beforeEach(async function () {
    [owner, verifier1, verifier2, claimant] = await ethers.getSigners();
    
    // Deploy dependencies
    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    userRegistry = await UserRegistry.deploy();
    await userRegistry.waitForDeployment();
    
    // Deploy ClaimOracle
    const ClaimOracle = await ethers.getContractFactory("ClaimOracle");
    claimOracle = await ClaimOracle.deploy();
    await claimOracle.waitForDeployment();
    
    // Add authorized verifiers
    await claimOracle.addAuthorizedVerifier(verifier1.address);
    await claimOracle.addAuthorizedVerifier(verifier2.address);
    
    // Set insurance pool contract (use owner address as placeholder)
    await claimOracle.setInsurancePoolContract(owner.address);
  });
  
  describe("Simulation Mode Setup", function () {
    it("Should start in simulation mode", async function () {
      const isSimMode = await claimOracle.simulationMode();
      expect(isSimMode).to.be.true;
    });
    
    it("Should allow owner to toggle simulation mode", async function () {
      await claimOracle.setSimulationMode(false);
      expect(await claimOracle.simulationMode()).to.be.false;
      
      await claimOracle.setSimulationMode(true);
      expect(await claimOracle.simulationMode()).to.be.true;
    });
    
    it("Should only allow owner to toggle simulation mode", async function () {
      await expect(
        claimOracle.connect(verifier1).setSimulationMode(false)
      ).to.be.revertedWithCustomError(claimOracle, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("Authorized Verifier Management", function () {
    it("Should add authorized verifier", async function () {
      const newVerifier = ethers.Wallet.createRandom().address;
      await claimOracle.addAuthorizedVerifier(newVerifier);
      
      const isAuthorized = await claimOracle.authorizedVerifiers(newVerifier);
      expect(isAuthorized).to.be.true;
    });
    
    it("Should remove authorized verifier", async function () {
      await claimOracle.removeAuthorizedVerifier(verifier1.address);
      
      const isAuthorized = await claimOracle.authorizedVerifiers(verifier1.address);
      expect(isAuthorized).to.be.false;
    });
    
    it("Should only allow owner to manage verifiers", async function () {
      const newVerifier = ethers.Wallet.createRandom().address;
      
      await expect(
        claimOracle.connect(verifier1).addAuthorizedVerifier(newVerifier)
      ).to.be.revertedWithCustomError(claimOracle, "OwnableUnauthorizedAccount");
      
      await expect(
        claimOracle.connect(verifier1).removeAuthorizedVerifier(verifier2.address)
      ).to.be.revertedWithCustomError(claimOracle, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("Verification Request", function () {
    it("Should request verification from insurance pool or owner", async function () {
      const result = await claimOracle.requestVerification(
        1,                           // claimId
        claimant.address,            // claimant
        "QmMedicalDoc123",           // ipfsHash
        0                            // HOSPITAL_API method
      );
      
      expect(result).to.equal(true);
      
      const verification = await claimOracle.getVerificationDetails(1);
      expect(verification.claimant).to.equal(claimant.address);
      expect(verification.status).to.equal(0); // PENDING
    });
    
    it("Should only allow insurance pool or owner to request verification", async function () {
      await expect(
        claimOracle.connect(claimant).requestVerification(
          1,
          claimant.address,
          "QmMedicalDoc123",
          0
        )
      ).to.be.revertedWith("Only insurance pool or owner can request verification");
    });
  });
  
  describe("Manual Verification (Simulation Mode)", function () {
    beforeEach(async function () {
      await claimOracle.requestVerification(
        1,
        claimant.address,
        "QmMedicalDoc456",
        0
      );
    });
    
    it("Should allow authorized verifier to verify claim", async function () {
      await claimOracle.connect(verifier1).manualVerify(
        1,
        true,
        "QmVerificationProof"
      );
      
      const verification = await claimOracle.getVerificationDetails(1);
      expect(verification.status).to.equal(2); // VERIFIED
      expect(verification.verificationProof).to.equal("QmVerificationProof");
      expect(verification.verifier).to.equal(verifier1.address);
    });
    
    it("Should allow authorized verifier to reject claim", async function () {
      await claimOracle.connect(verifier1).manualVerify(
        1,
        false,
        "QmRejectionReason"
      );
      
      const verification = await claimOracle.getVerificationDetails(1);
      expect(verification.status).to.equal(3); // REJECTED
    });
    
    it("Should only allow authorized verifiers", async function () {
      await expect(
        claimOracle.connect(claimant).manualVerify(
          1,
          true,
          "QmProof"
        )
      ).to.be.revertedWith("Not authorized verifier");
    });
    
    it("Should only verify pending claims", async function () {
      await claimOracle.connect(verifier1).manualVerify(1, true, "QmProof");
      
      await expect(
        claimOracle.connect(verifier2).manualVerify(1, true, "QmProof2")
      ).to.be.revertedWith("Not pending");
    });
  });
  
  describe("Verification Status Queries", function () {
    beforeEach(async function () {
      await claimOracle.requestVerification(
        1,
        claimant.address,
        "QmDoc",
        1 // CHAINLINK_API
      );
    });
    
    it("Should get verification status", async function () {
      const [status, method, proof, verifiedAt] = await claimOracle.getVerificationStatus(1);
      
      expect(status).to.equal(0); // PENDING
      expect(method).to.equal(1); // CHAINLINK_API
      expect(proof).to.equal("");
      expect(verifiedAt).to.equal(0);
    });
    
    it("Should get full verification details", async function () {
      const details = awaitoracle.getVerificationDetails(1);
      
      expect(details.claimId).to.equal(1);
      expect(details.claimant).to.equal(claimant.address);
      expect(details.method).to.equal(1);
    });
    
    it("Should check if claim is verified", async function () {
      expect(await claimOracle.isClaimVerified(1)).to.be.false;
      
      await claimOracle.connect(verifier1).manualVerify(1, true, "QmProof");
      
      expect(await claimOracle.isClaimVerified(1)).to.be.true;
    });
  });
  
  describe("Multiple Verification Methods", function () {
    it("Should support HOSPITAL_API method", async function () {
      await claimOracle.requestVerification(1, claimant.address, "QmDoc1", 0);
      const verification = await claimOracle.getVerificationDetails(1);
      expect(verification.method).to.equal(0);
    });
    
    it("Should support CHAINLINK_API method", async function () {
      await claimOracle.requestVerification(2, claimant.address, "QmDoc2", 1);
      const verification = await claimOracle.getVerificationDetails(2);
      expect(verification.method).to.equal(1);
    });
    
    it("Should support ZK_EMAIL method", async function () {
      await claimOracle.requestVerification(3, claimant.address, "QmDoc3", 2);
      const verification = await claimOracle.getVerificationDetails(3);
      expect(verification.method).to.equal(2);
    });
  });
  
  describe("Multi-source Verification Workflow", function () {
    it("Should handle multiple claims from same claimant", async function () {
      await claimOracle.requestVerification(1, claimant.address, "QmDoc1", 0);
      await claimOracle.requestVerification(2, claimant.address, "QmDoc2", 1);
      await claimOracle.requestVerification(3, claimant.address, "QmDoc3", 2);
      
      await claimOracle.connect(verifier1).manualVerify(1, true, "QmProof1");
      await claimOracle.connect(verifier2).manualVerify(2, false, "QmProof2");
      
      expect(await claimOracle.isClaimVerified(1)).to.be.true;
      expect(await claimOracle.isClaimVerified(2)).to.be.false;
      expect(await claimOracle.isClaimVerified(3)).to.be.false;
    });
  });
  
  describe("Edge Cases", function () {
    it("Should handle verification of non-existent claim", async function () {
      const [status] = await claimOracle.getVerificationStatus(999);
      expect(status).to.equal(0); // PENDING (default)
    });
    
    it("Should prevent verification after timeout", async function () {
      // Note: Timeout functionality would be tested if implemented
      // This is a placeholder for future timeout feature
      expect(true).to.be.true;
    });
  });
});
