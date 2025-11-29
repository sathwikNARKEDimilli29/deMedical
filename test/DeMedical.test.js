const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("De-Medical Insurance Platform", function () {
  let userRegistry, creditScore, insurancePool, microLoan, paymentPlan;
  let owner, user1, user2, user3, kycVerifier;
  
  beforeEach(async function () {
    [owner, user1, user2, user3, kycVerifier] = await ethers.getSigners();
    
    // Deploy contracts
    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    userRegistry = await UserRegistry.deploy();
    await userRegistry.waitForDeployment();
    
    const CreditScore = await ethers.getContractFactory("CreditScore");
    creditScore = await CreditScore.deploy(await userRegistry.getAddress());
    await creditScore.waitForDeployment();
    
    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    insurancePool = await InsurancePool.deploy(
      await userRegistry.getAddress(),
      await creditScore.getAddress()
    );
    await insurancePool.waitForDeployment();
    
    const MicroLoan = await ethers.getContractFactory("MicroLoan");
    microLoan = await MicroLoan.deploy(
      await userRegistry.getAddress(),
      await creditScore.getAddress()
    );
    await microLoan.waitForDeployment();
    
    const PaymentPlan = await ethers.getContractFactory("PaymentPlan");
    paymentPlan = await PaymentPlan.deploy(
      await userRegistry.getAddress(),
      await creditScore.getAddress()
    );
    await paymentPlan.waitForDeployment();
    
    // Authorize contracts
    await creditScore.authorizeContract(await microLoan.getAddress());
    await creditScore.authorizeContract(await paymentPlan.getAddress());
    await creditScore.authorizeContract(await insurancePool.getAddress());
    
    // Fund pools
    await microLoan.fundPool({ value: ethers.parseEther("100") });
    await paymentPlan.fundPool({ value: ethers.parseEther("100") });
    
    // Add KYC verifier
    await userRegistry.addKYCVerifier(kycVerifier.address);
  });
  
  describe("UserRegistry", function () {
    it("Should register a new user", async function () {
      await userRegistry.connect(user1).registerUser("QmTestHash123");
      const userInfo = await userRegistry.getUserInfo(user1.address);
      
      expect(userInfo.isRegistered).to.be.true;
      expect(userInfo.isKYCVerified).to.be.false;
      expect(userInfo.ipfsHash).to.equal("QmTestHash123");
    });
    
    it("Should verify KYC", async function () {
      await userRegistry.connect(user1).registerUser("QmTestHash123");
      await userRegistry.connect(kycVerifier).verifyKYC(user1.address);
      
      const isVerified = await userRegistry.isUserKYCVerified(user1.address);
      expect(isVerified).to.be.true;
    });
    
    it("Should prevent duplicate registration", async function () {
      await userRegistry.connect(user1).registerUser("QmTestHash123");
      await expect(
        userRegistry.connect(user1).registerUser("QmTestHash456")
      ).to.be.revertedWith("User already registered");
    });
  });
  
  describe("CreditScore", function () {
    beforeEach(async function () {
      await userRegistry.connect(user1).registerUser("QmTestHash123");
      await userRegistry.connect(kycVerifier).verifyKYC(user1.address);
    });
    
    it("Should initialize with default score", async function () {
      await creditScore.initializeCreditScore(user1.address);
      const score = await creditScore.getCreditScore(user1.address);
      expect(score).to.equal(500n);
    });
    
    it("Should update score after payments", async function () {
      await creditScore.initializeCreditScore(user1.address);
      
      // Record on-time payments
      await creditScore.recordPayment(user1.address, true);
      await creditScore.recordPayment(user1.address, true);
      
      const scoreAfter = await creditScore.getCreditScore(user1.address);
      expect(scoreAfter).to.be.greaterThan(500n);
    });
    
    it("Should return correct credit tier", async function () {
      await creditScore.initializeCreditScore(user1.address);
      const tier = await creditScore.getCreditTier(user1.address);
      expect(tier).to.equal("Fair");
    });
  });
  
  describe("InsurancePool", function () {
    beforeEach(async function () {
      // Register and verify users
      for (const user of [user1, user2, user3]) {
        await userRegistry.connect(user).registerUser("QmTestHash");
        await userRegistry.connect(kycVerifier).verifyKYC(user.address);
      }
    });
    
    it("Should create a new pool", async function () {
      await insurancePool.connect(user1).createPool(
        "Health Insurance Pool",
        "Basic health coverage",
        ethers.parseEther("10"),
        ethers.parseEther("0.1"),
        10,
        0 // HEALTH
      );
      
      const poolInfo = await insurancePool.getPoolInfo(1);
      expect(poolInfo.name).to.equal("Health Insurance Pool");
      expect(poolInfo.creator).to.equal(user1.address);
    });
    
    it("Should allow users to join pool", async function () {
      await insurancePool.connect(user1).createPool(
        "Health Pool",
        "Coverage",
        ethers.parseEther("10"),
        ethers.parseEther("0.1"),
        10,
        0
      );
      
      await insurancePool.connect(user2).joinPool(1, {
        value: ethers.parseEther("0.5")
      });
      
      const memberInfo = await insurancePool.getMemberInfo(1, user2.address);
      expect(memberInfo.isActive).to.be.true;
      expect(memberInfo.contribution).to.equal(ethers.parseEther("0.5"));
    });
    
    it("Should submit and vote on claims", async function () {
      // Create pool and add members
      await insurancePool.connect(user1).createPool(
        "Test Pool",
        "Test",
        ethers.parseEther("10"),
        ethers.parseEther("0.1"),
        10,
        0
      );
      
      await insurancePool.connect(user1).joinPool(1, { value: ethers.parseEther("1") });
      await insurancePool.connect(user2).joinPool(1, { value: ethers.parseEther("1") });
      await insurancePool.connect(user3).joinPool(1, { value: ethers.parseEther("1") });
      
      // Submit claim
      await insurancePool.connect(user1).submitClaim(
        1,
        ethers.parseEther("0.5"),
        "Medical emergency",
        "QmMedicalDoc"
      );
      
      // Vote on claim
      await insurancePool.connect(user2).voteClaim(1, true);
      await insurancePool.connect(user3).voteClaim(1, true);
      
      const claimInfo = await insurancePool.getClaimInfo(1);
      expect(claimInfo.status).to.equal(1); // APPROVED
    });
  });
  
  describe("MicroLoan", function () {
    beforeEach(async function () {
      await userRegistry.connect(user1).registerUser("QmTestHash");
      await userRegistry.connect(kycVerifier).verifyKYC(user1.address);
      await creditScore.initializeCreditScore(user1.address);
    });
    
    it("Should create and approve loan", async function () {
      await microLoan.connect(user1).requestLoan(
        ethers.parseEther("1"),
        90, // 90 days
        "Medical treatment",
        "QmMedicalBill"
      );
      
      const loanInfo = await microLoan.getLoanInfo(1);
      expect(loanInfo.borrower).to.equal(user1.address);
      expect(loanInfo.status).to.equal(1); // ACTIVE (auto-approved)
    });
    
    it("Should calculate interest based on credit score", async function () {
      const rate = await microLoan.calculateInterestRate(750);
      expect(rate).to.equal(800); // 8%
    });
    
    it("Should allow loan repayment", async function () {
      await microLoan.connect(user1).requestLoan(
        ethers.parseEther("1"),
        90,
        "Treatment",
        "QmDoc"
      );
      
      const totalOwed = await microLoan.calculateTotalOwed(1);
      
      await microLoan.connect(user1).repayLoan(1, { value: totalOwed });
      
      const loanInfo = await microLoan.getLoanInfo(1);
      expect(loanInfo.status).to.equal(2); // REPAID
    });
  });
  
  describe("PaymentPlan", function () {
    beforeEach(async function () {
      await userRegistry.connect(user1).registerUser("QmTestHash");
      await userRegistry.connect(kycVerifier).verifyKYC(user1.address);
      await creditScore.initializeCreditScore(user1.address);
    });
    
    it("Should create BNPL plan", async function () {
      await paymentPlan.connect(user1).createBNPL(
        ethers.parseEther("1"),
        6,
        "Medical equipment",
        "QmInvoice"
      );
      
      const plan = await paymentPlan.getBNPLInfo(1);
      expect(plan.user).to.equal(user1.address);
      expect(plan.numberOfInstallments).to.equal(6n);
    });
    
    it("Should pay BNPL installment", async function () {
      await paymentPlan.connect(user1).createBNPL(
        ethers.parseEther("1"),
        4,
        "Equipment",
        "QmInv"
      );
      
      const plan = await paymentPlan.getBNPLInfo(1);
      await paymentPlan.connect(user1).payBNPLInstallment(1, {
        value: plan.installmentAmount
      });
      
      const updatedPlan = await paymentPlan.getBNPLInfo(1);
      expect(updatedPlan.paidInstallments).to.equal(1n);
    });
    
    it("Should create SNPL plan", async function () {
      await paymentPlan.connect(user1).createSNPL(
        ethers.parseEther("10"),
        ethers.parseEther("1"),
        10,
        "Future surgery"
      );
      
      const plan = await paymentPlan.getSNPLInfo(1);
      expect(plan.user).to.equal(user1.address);
      expect(plan.targetAmount).to.equal(ethers.parseEther("10"));
    });
    
    it("Should deposit to SNPL", async function () {
      await paymentPlan.connect(user1).createSNPL(
        ethers.parseEther("5"),
        ethers.parseEther("1"),
        5,
        "Treatment"
      );
      
      await paymentPlan.connect(user1).depositToSNPL(1, {
        value: ethers.parseEther("1")
      });
      
      const plan = await paymentPlan.getSNPLInfo(1);
      expect(plan.savedAmount).to.equal(ethers.parseEther("1"));
    });
  });
});
