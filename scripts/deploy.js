const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");
  
  // Deploy UserRegistry
  console.log("\n1. Deploying UserRegistry...");
  const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  const userRegistryAddress = await userRegistry.getAddress();
  console.log("UserRegistry deployed to:", userRegistryAddress);
  
  // Deploy CreditScore
  console.log("\n2. Deploying CreditScore...");
  const CreditScore = await hre.ethers.getContractFactory("CreditScore");
  const creditScore = await CreditScore.deploy(userRegistryAddress);
  await creditScore.waitForDeployment();
  const creditScoreAddress = await creditScore.getAddress();
  console.log("CreditScore deployed to:", creditScoreAddress);
  
  // Deploy InsurancePool
  console.log("\n3. Deploying InsurancePool...");
  const InsurancePool = await hre.ethers.getContractFactory("InsurancePool");
  const insurancePool = await InsurancePool.deploy(userRegistryAddress, creditScoreAddress);
  await insurancePool.waitForDeployment();
  const insurancePoolAddress = await insurancePool.getAddress();
  console.log("InsurancePool deployed to:", insurancePoolAddress);
  
  // Deploy MicroLoan (NOW WITH INSURANCE POOL)
  console.log("\n4. Deploying MicroLoan...");
  const MicroLoan = await hre.ethers.getContractFactory("MicroLoan");
  const microLoan = await MicroLoan.deploy(userRegistryAddress, creditScoreAddress, insurancePoolAddress);
  await microLoan.waitForDeployment();
  const microLoanAddress = await microLoan.getAddress();
  console.log("MicroLoan deployed to:", microLoanAddress);
  
  // Deploy PaymentPlan
  console.log("\n5. Deploying PaymentPlan...");
  const PaymentPlan = await hre.ethers.getContractFactory("PaymentPlan");
  const paymentPlan = await PaymentPlan.deploy(userRegistryAddress, creditScoreAddress);
  await paymentPlan.waitForDeployment();
  const paymentPlanAddress = await paymentPlan.getAddress();
  console.log("PaymentPlan deployed to:", paymentPlanAddress);
  
  // Deploy BugBounty
  console.log("\n6. Deploying BugBounty...");
  const BugBounty = await hre.ethers.getContractFactory("BugBounty");
  const bugBounty = await BugBounty.deploy();
  await bugBounty.waitForDeployment();
  const bugBountyAddress = await bugBounty.getAddress();
  console.log("BugBounty deployed to:", bugBountyAddress);
  
  // Authorize contracts in CreditScore
  console.log("\n7. Authorizing contracts in CreditScore...");
  await creditScore.authorizeContract(microLoanAddress);
  await creditScore.authorizeContract(paymentPlanAddress);
  await creditScore.authorizeContract(insurancePoolAddress);
  console.log("Contracts authorized");
  
  // Fund pools
  console.log("\n8. Funding pools...");
  const fundAmount = hre.ethers.parseEther("100");
  await microLoan.fundPool({ value: fundAmount });
  await paymentPlan.fundPool({ value: fundAmount });
  console.log("Loan and Payment pools funded with 100 ETH each");
  
  // Fund bug bounty pool
  console.log("\n9. Funding Bug Bounty pool...");
  const bountyFund = hre.ethers.parseEther("50");
  await bugBounty.fundBountyPool({ value: bountyFund });
  console.log("Bug Bounty pool funded with 50 ETH");
  
  console.log("\n✅ Deployment Complete!");
  console.log("\n📋 Contract Addresses:");
  console.log("====================");
  console.log("UserRegistry:  ", userRegistryAddress);
  console.log("CreditScore:   ", creditScoreAddress);
  console.log("InsurancePool: ", insurancePoolAddress);
  console.log("MicroLoan:     ", microLoanAddress);
  console.log("PaymentPlan:   ", paymentPlanAddress);
  console.log("BugBounty:     ", bugBountyAddress);
  
  console.log("\n📝 Add these to your .env file:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS_REGISTRY=${userRegistryAddress}`);
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS_CREDIT=${creditScoreAddress}`);
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS_POOL=${insurancePoolAddress}`);
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS_LOAN=${microLoanAddress}`);
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS_PAYMENT=${paymentPlanAddress}`);
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS_BUGBOUNTY=${bugBountyAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
