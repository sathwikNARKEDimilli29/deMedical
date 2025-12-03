const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZKPVerifier Contract", function () {
  let zkpVerifier;
  let owner, prover1, prover2, untrustedUser;
  
  beforeEach(async function () {
    [owner, prover1, prover2, untrustedUser] = await ethers.getSigners();
    
    // Deploy ZKPVerifier
    const ZKPVerifier = await ethers.getContractFactory("ZKPVerifier");
    zkpVerifier = await ZKPVerifier.deploy();
    await zkpVerifier.waitForDeployment();
    
    // Add trusted provers
    await zkpVerifier.addTrustedProver(prover1.address);
    await zkpVerifier.addTrustedProver(prover2.address);
  });
  
  describe("Simulation Mode Management", function () {
    it("Should start in simulation mode", async function () {
      const isSimMode = await zkpVerifier.simulationMode();
      expect(isSimMode).to.be.true;
    });
    
    it("Should allow owner to toggle simulation mode", async function () {
      await zkpVerifier.setSimulationMode(false);
      expect(await zkpVerifier.simulationMode()).to.be.false;
      
      await zkpVerifier.setSimulationMode(true);
      expect(await zkpVerifier.simulationMode()).to.be.true;
    });
    
    it("Should only allow owner to toggle simulation mode", async function () {
      await expect(
        zkpVerifier.connect(prover1).setSimulationMode(false)
      ).to.be.revertedWithCustomError(zkpVerifier, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("Trusted Prover Management", function () {
    it("Should add trusted prover", async function () {
      const newProver = ethers.Wallet.createRandom().address;
      await zkpVerifier.addTrustedProver(newProver);
      
      const isTrusted = await zkpVerifier.trustedProvers(newProver);
      expect(isTrusted).to.be.true;
    });
    
    it("Should remove trusted prover", async function () {
      await zkpVerifier.removeTrustedProver(prover1.address);
      
      const isTrusted = await zkpVerifier.trustedProvers(prover1.address);
      expect(isTrusted).to.be.false;
    });
    
    it("Should only allow owner to manage trusted provers", async function () {
      const newProver = ethers.Wallet.createRandom().address;
      
      await expect(
        zkpVerifier.connect(prover1).addTrustedProver(newProver)
      ).to.be.revertedWithCustomError(zkpVerifier, "OwnableUnauthorizedAccount");
      
      await expect(
        zkpVerifier.connect(prover1).removeTrustedProver(prover2.address)
      ).to.be.revertedWithCustomError(zkpVerifier, "OwnableUnauthorizedAccount");
    });
    
    it("Should have owner as trusted prover by default", async function () {
      const isTrusted = await zkpVerifier.trustedProvers(owner.address);
      expect(isTrusted).to.be.true;
    });
  });
  
  describe("Proof Submission", function () {
    it("Should submit CREDIT_SCORE_RANGE proof", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("credit_score_proof"));
      
      await zkpVerifier.connect(prover1).submitProof(
        0, // CREDIT_SCORE_RANGE
        proofHash,
        "QmCreditProofMetadata"
      );
      
      const proof = await zkpVerifier.getProof(1);
      expect(proof.prover).to.equal(prover1.address);
      expect(proof.proofType).to.equal(0);
      expect(proof.proofHash).to.equal(proofHash);
      expect(proof.metadata).to.equal("QmCreditProofMetadata");
    });
    
    it("Should submit AGE_RANGE proof", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("age_proof"));
      
      await zkpVerifier.connect(prover1).submitProof(
        1, // AGE_RANGE
        proofHash,
        "QmAgeProofMetadata"
      );
      
      const proof = await zkpVerifier.getProof(1);expect(proof.proofType).to.equal(1);
    });
    
    it("Should submit MEDICAL_CONDITION proof", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("medical_proof"));
      
      await zkpVerifier.connect(prover1).submitProof(
        2, // MEDICAL_CONDITION
        proofHash,
        "QmMedicalProofMetadata"
      );
      
      const proof = await zkpVerifier.getProof(1);
      expect(proof.proofType).to.equal(2);
    });
    
    it("Should submit INCOME_THRESHOLD proof", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("income_proof"));
      
      await zkpVerifier.connect(prover1).submitProof(
        3, // INCOME_THRESHOLD
        proofHash,
        "QmIncomeProofMetadata"
      );
      
      const proof = await zkpVerifier.getProof(1);
      expect(proof.proofType).to.equal(3);
    });
    
    it("Should submit IDENTITY_VERIFICATION proof", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("identity_proof"));
      
      await zkpVerifier.connect(prover1).submitProof(
        4, // IDENTITY_VERIFICATION
        proofHash,
        "QmIdentityProofMetadata"
      );
      
      const proof = await zkpVerifier.getProof(1);
      expect(proof.proofType).to.equal(4);
    });
    
    it("Should reject invalid proof hash", async function () {
      await expect(
        zkpVerifier.connect(prover1).submitProof(
          0,
          ethers.ZeroHash,
          "QmMetadata"
        )
      ).to.be.revertedWith("Invalid proof hash");
    });
  });
  
  describe("Auto-Verification for Trusted Provers", function () {
    it("Should auto-verify proof from trusted prover in simulation mode", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("trusted_proof"));
      
      await zkpVerifier.connect(prover1).submitProof(
        0,
        proofHash,
        "QmMetadata"
      );
      
      const proof = await zkpVerifier.getProof(1);
      expect(proof.result).to.equal(1); // VALID (auto-verified)
    });
    
    it("Should NOT auto-verify proof from untrusted user", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("untrusted_proof"));
      
      await zkpVerifier.connect(untrustedUser).submitProof(
        0,
        proofHash,
        "QmMetadata"
      );
      
      const proof = await zkpVerifier.getProof(1);
      expect(proof.result).to.equal(0); // PENDING
    });
  });
  
  describe("Manual Proof Verification", function () {
    beforeEach(async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("manual_proof"));
      
      // Submit proof from untrusted user
      await zkpVerifier.connect(untrustedUser).submitProof(
        0,
        proofHash,
        "QmMetadata"
      );
    });
    
    it("Should allow owner to verify proof", async function () {
      await zkpVerifier.verifyProof(1, true);
      
      const proof = await zkpVerifier.getProof(1);
      expect(proof.result).to.equal(1); // VALID
    });
    
    it("Should allow owner to reject proof", async function () {
      await zkpVerifier.verifyProof(1, false);
      
      const proof = await zkpVerifier.getProof(1);
      expect(proof.result).to.equal(2); // INVALID
    });
    
    it("Should only allow owner to verify proofs", async function () {
      await expect(
        zkpVerifier.connect(prover1).verifyProof(1, true)
      ).to.be.revertedWithCustomError(zkpVerifier, "OwnableUnauthorizedAccount");
    });
    
    it("Should prevent double verification", async function () {
      await zkpVerifier.verifyProof(1, true);
      
      await expect(
        zkpVerifier.verifyProof(1, true)
      ).to.be.revertedWith("Already verified");
    });
  });
  
  describe("Proof Queries", function () {
    beforeEach(async function () {
      // Submit multiple proofs from different provers
      await zkpVerifier.connect(prover1).submitProof(
        0,
        ethers.keccak256(ethers.toUtf8Bytes("proof1")),
        "QmProof1"
      );
      
      await zkpVerifier.connect(prover1).submitProof(
        1,
        ethers.keccak256(ethers.toUtf8Bytes("proof2")),
        "QmProof2"
      );
      
      await zkpVerifier.connect(prover2).submitProof(
        2,
        ethers.keccak256(ethers.toUtf8Bytes("proof3")),
        "QmProof3"
      );
    });
    
    it("Should get proof by ID", async function () {
      const proof = await zkpVerifier.getProof(1);
      expect(proof.proofId).to.equal(1);
      expect(proof.prover).to.equal(prover1.address);
    });
    
    it("Should get all proofs by prover", async function () {
      const prover1Proofs = await zkpVerifier.getProverProofs(prover1.address);
      const prover2Proofs = await zkpVerifier.getProverProofs(prover2.address);
      
      expect(prover1Proofs.length).to.equal(2);
      expect(prover2Proofs.length).to.equal(1);
      expect(prover1Proofs[0]).to.equal(1);
      expect(prover1Proofs[1]).to.equal(2);
      expect(prover2Proofs[0]).to.equal(3);
    });
    
    it("Should return empty array for prover with no proofs", async function () {
      const noProofs = await zkpVerifier.getProverProofs(untrustedUser.address);
      expect(noProofs.length).to.equal(0);
    });
  });
  
  describe("Credit Score Range Verification Stub", function () {
    it("Should have credit score range verification function", async function () {
      // This is a stub function - in production would verify actual ZK proof
      const result = await zkpVerifier.verifyCreditScoreRange(prover1.address, 600);
      
      // Stub returns true if simulation mode is on and prover is trusted
      expect(result).to.be.true;
    });
  });
  
  describe("Multiple Proofs Workflow", function () {
    it("Should handle complete lifecycle of multiple proofs", async function () {
      // Trusted prover submits and gets auto-verified
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("proof1"));
      await zkpVerifier.connect(prover1).submitProof(0, hash1, "QmProof1");
      
      let proof1 = await zkpVerifier.getProof(1);
      expect(proof1.result).to.equal(1); // VALID (auto-verified)
      
      // Untrusted user submits and needs manual verification
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("proof2"));
      await zkpVerifier.connect(untrustedUser).submitProof(1, hash2, "QmProof2");
      
      let proof2 = await zkpVerifier.getProof(2);
      expect(proof2.result).to.equal(0); // PENDING
      
      // Owner manually verifies
      await zkpVerifier.verifyProof(2, true);
      
      proof2 = await zkpVerifier.getProof(2);
      expect(proof2.result).to.equal(1); // VALID
      
      // Another untrusted proof gets rejected
      const hash3 = ethers.keccak256(ethers.toUtf8Bytes("proof3"));
      await zkpVerifier.connect(untrustedUser).submitProof(2, hash3, "QmProof3");
      await zkpVerifier.verifyProof(3, false);
      
      let proof3 = await zkpVerifier.getProof(3);
      expect(proof3.result).to.equal(2); // INVALID
    });
  });
  
  describe("Edge Cases", function () {
    it("Should handle non-existent proof query", async function () {
      const proof = await zkpVerifier.getProof(999);
      expect(proof.proofId).to.equal(0);
    });
    
    it("Should increment proof count correctly", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("proof"));
      
      await zkpVerifier.connect(prover1).submitProof(0, hash, "QmProof1");
      expect(await zkpVerifier.proofCount()).to.equal(1);
      
      await zkpVerifier.connect(prover1).submitProof(1, hash, "QmProof2");
      expect(await zkpVerifier.proofCount()).to.equal(2);
      
      await zkpVerifier.connect(prover2).submitProof(2, hash, "QmProof3");
      expect(await zkpVerifier.proofCount()).to.equal(3);
    });
  });
});
