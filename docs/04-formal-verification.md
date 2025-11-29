# Nishkama Smart Contracts - Formal Verification Specification

**Project**: Nishkama Blockchain Insurance Platform  
**Document Type**: Formal Verification & Mathematical Correctness Proofs  
**Version**: 1.0.0  
**Date**: November 29, 2025  
**Status**: Specification Phase  

---

## Executive Summary

This document provides formal specifications and mathematical proofs of correctness for the Nishkama smart contracts. Formal verification ensures that the contracts behave exactly as intended under all possible conditions, providing mathematical guarantees beyond traditional testing.

### Verification Scope

**Contracts**: 5 core smart contracts  
**Verification Tool**: Certora Prover (Recommended)  
**Alternative Tools**: KEVM, K Framework, Coq  
**Specification Language**: CVL (Certora Verification Language)  

---

## What is Formal Verification?

Formal verification is a mathematical technique to prove that a program is correct with respect to a formal specification. Unlike testing (which checks specific cases), formal verification proves correctness for **all possible inputs and states**.

### Benefits

✅ **Mathematical Certainty**: Proves absence of bugs, not just their presence  
✅ **Complete Coverage**: Covers all execution paths, including edge cases  
✅ **Critical Bug Prevention**: Catches issues testing might miss  
✅ **Regulatory Confidence**: Demonstrates due diligence  

### Limitations

⚠️ **Specification Gaps**: Only proves what's specified  
⚠️ **Complexity**: Requires specialized expertise  
⚠️ **Cost**: Expensive (but cheaper than exploits)  
⚠️ **Time**: Can take weeks to months  

---

## Contract 1: UserRegistry.sol - Formal Specifications

### Invariants

**INV-UR-1: Registration Uniqueness**
```
∀ address a: isRegistered(a) => registrationExists(a) ∧ cannotRegisterTwice(a)
```

**Formal Proof**:
```cvl
invariant registrationIsUnique(address user)
    users[user].isRegistered => 
        users[user].walletAddress == user &&
        users[user].registrationTime > 0
```

**INV-UR-2: KYC Verification Authority**
```
∀ address a: isKYCVerified(a) => ∃ verifier v: v ∈ kycVerifiers ∧ v.verified(a)
```

**Formal Proof**:
```cvl
invariant kycRequiresVerifier(address user)
    users[user].isKYCVerified =>
        exists address verifier.
            kycVerifiers[verifier] == true &&
            canVerifyKYC(verifier)
```

**INV-UR-3: Owner Immutability**
```
∀ t1, t2: t1 < t2 => owner(t1) = owner(t2)
```

### State Transition Properties

**PROP-UR-1: Registration is Monotonic**
```
Pre: !isRegistered(user)
Action: registerUser(user, ipfsHash)
Post: isRegistered(user) ∧ getUserInfo(user).ipfsHash == ipfsHash
```

**Verification Rule**:
```cvl
rule registerUserCorrectness(address user, string ipfsHash) {
    env e;
    require !users[user].isRegistered;
    
    registerUser(e, ipfsHash);
    
    assert users[user].isRegistered;
    assert users[user].walletAddress == e.msg.sender;
    assert users[user].ipfsHash == ipfsHash;
    assert users[user].registrationTime == e.block.timestamp;
}
```

**PROP-UR-2: KYC Cannot Be Self-Verified**
```
∀ user u, verifier v: verifyKYC(u) ⟹ v ≠ u
```

**Verification Rule**:
```cvl
rule kycCannotSelfVerify(address user) {
    env e;
    require e.msg.sender == user;
    
    verifyKYC@withrevert(e, user);
    
    assert lastReverted;
}
```

---

## Contract 2: CreditScore.sol - Formal Specifications

### Invariants

**INV-CS-1: Score Bounds**
```
∀ address a: MIN_SCORE ≤ getCreditScore(a) ≤ MAX_SCORE
```

**Formal Proof**:
```cvl
invariant scoreBounds(address user)
    creditScores[user].score >= MIN_SCORE() &&
    creditScores[user].score <= MAX_SCORE()
```

**INV-CS-2: Score Calculation Determinism**
```
∀ a, h1, h2: sameHistory(h1, h2) => calculateScore(a, h1) = calculateScore(a, h2)
```

**Formal Proof**:
```cvl
rule scoreCalculationDeterministic(address user) {
    env e1; env e2;
    
    require creditScores[user].totalPayments == creditScores[user].totalPayments;
    require creditScores[user].onTimePayments == creditScores[user].onTimePayments;
    
    uint256 score1 = getCreditScore(e1, user);
    uint256 score2 = getCreditScore(e2, user);
    
    assert score1 == score2;
}
```

**INV-CS-3: Authorization Persistence**
```
∀ contract c, time t: authorized(c, t) => authorized(c, t') where t' > t ∧ ¬revoked(c, t, t')
```

### State Transition Properties

**PROP-CS-1: On-Time Payment Increases Score**
```
Pre: score = getCreditScore(user)
Action: recordPayment(user, onTime=true)
Post: getCreditScore(user) ≥ score
```

**Verification Rule**:
```cvl
rule onTimePaymentIncreasesScore(address user) {
    env e;
    uint256 scoreBefore = getCreditScore(e, user);
    
    recordPayment(e, user, true);
    
    uint256 scoreAfter = getCreditScore(e, user);
    assert scoreAfter >= scoreBefore;
}
```

**PROP-CS-2: Late Payment Decreases Score**
```
Pre: score = getCreditScore(user)
Action: recordPayment(user, onTime=false)
Post: getCreditScore(user) ≤ score
```

**Verification Rule**:
```cvl
rule latePaymentDecreasesScore(address user) {
    env e;
    uint256 scoreBefore = getCreditScore(e, user);
    
    recordPayment(e, user, false);
    
    uint256 scoreAfter = getCreditScore(e, user);
    assert scoreAfter <= scoreBefore;
}
```

---

## Contract 3: InsurancePool.sol - Formal Specifications

### Invariants

**INV-IP-1: Pool Balance Equals Sum of Contributions**
```
∀ poolId p: balance(p) = Σ(contributions[p][member]) for all members
```

**Formal Proof**:
```cvl
invariant poolBalanceMatchesContributions(uint256 poolId)
    pools[poolId].totalContributed == 
        sumOfContributions(poolId, allMembers)
```

**INV-IP-2: Proportional Payout Correctness**
```
∀ claim c: approved(c) => payout(c) = claimAmount(c) × (contribution(claimant) / totalContributions)
```

**Formal Proof**:
```cvl
rule proportionalPayoutCorrect(uint256 claimId) {
    env e;
    
    require claims[claimId].status == ClaimStatus.APPROVED;
    
    uint256 claimantContribution = getMemberContribution(
        claims[claimId].poolId,
        claims[claimId].claimant
    );
    uint256 totalContribution = pools[claims[claimId].poolId].totalContributed;
    uint256 claimAmount = claims[claimId].amount;
    
    uint256 expectedPayout = (claimAmount * claimantContribution) / totalContribution;
    
    processClaim(e, claimId);
    
    // Verify the correct amount was transferred
    assert e.msg.value == 0;  // No value sent
    assert lastTransferAmount == expectedPayout;
}
```

**INV-IP-3: Voting Threshold Requirements**
```
∀ claim c: status(c) = APPROVED => 
    (approvalVotes(c) / totalMembers(pool(c))) ≥ 0.6 ∧
    (totalVotes(c) / totalMembers(pool(c))) ≥ 0.5
```

### State Transition Properties

**PROP-IP-1: Join Pool Increases Member Count**
```
Pre: memberCount = pool.memberCount
Action: joinPool(poolId)
Post: pool.memberCount = memberCount + 1
```

**Verification Rule**:
```cvl
rule joinPoolIncreasesMemberCount(uint256 poolId) {
    env e;
    uint256 membersBefore = pools[poolId].memberCount;
    
    require !isMember(poolId, e.msg.sender);
    require msg.value >= pools[poolId].minContribution;
    
    joinPool(e, poolId);
    
    assert pools[poolId].memberCount == membersBefore + 1;
}
```

**PROP-IP-2: Claim Approval Requires Quorum**
```
∀ claim c: canProcess(c) => votingQuorumMet(c) ∧ approvalThresholdMet(c)
```

---

## Contract 4: MicroLoan.sol - Formal Specifications

### Invariants

**INV-ML-1: Interest Rate Monotonicity**
```
∀ score1, score2: score1 < score2 => interestRate(score1) ≥ interestRate(score2)
```

**Formal Proof**:
```cvl
invariant interestRateMonotonic(uint256 score1, uint256 score2)
    score1 < score2 =>
        calculateInterestRate(score1) >= calculateInterestRate(score2)
```

**INV-ML-2: Loan Balance Consistency**
```
∀ loan l: totalOwed(l) = principal(l) + interest(l) - amountRepaid(l)
```

**Formal Proof**:
```cvl
invariant loanBalanceConsistent(uint256 loanId)
    calculateTotalOwed(loanId) ==
        loans[loanId].principal +
        calculateInterest(loanId) -
        loans[loanId].amountRepaid
```

**INV-ML-3: Pool Solvency**
```
poolBalance ≥ Σ(activeLoanPrincipals)
```

### State Transition Properties

**PROP-ML-1: Loan Approval Requires Credit Score**
```
Pre: creditScore(borrower) < MIN_CREDIT_SCORE
Action: requestLoan(amount, duration, purpose)
Post: loanStatus = REJECTED
```

**Verification Rule**:
```cvl
rule loanRequiresCreditScore(address borrower, uint256 amount) {
    env e;
    require e.msg.sender == borrower;
    require getCreditScore(borrower) < MIN_CREDIT_SCORE();
    
    requestLoan@withrevert(e, amount, 90, "purpose", "hash");
    
    assert lastReverted;
}
```

**PROP-ML-2: Full Repayment Closes Loan**
```
Pre: loan.status = ACTIVE
Action: repayLoan(loanId, amountOwed)
Post: loan.status = REPAID ∧ loan.amountRepaid = totalOwed
```

**Verification Rule**:
```cvl
rule fullRepaymentClosesLoan(uint256 loanId) {
    env e;
    require loans[loanId].status == LoanStatus.ACTIVE;
    
    uint256 totalOwed = calculateTotalOwed(e, loanId);
    
    repayLoan(e, loanId) with value totalOwed;
    
    assert loans[loanId].status == LoanStatus.REPAID;
    assert loans[loanId].amountRepaid == totalOwed;
}
```

---

## Contract 5: PaymentPlan.sol - Formal Specifications

### Invariants

**INV-PP-1: Installment Amount Consistency**
```
∀ plan p: totalAmount(p) = installmentAmount(p) × numberOfInstallments(p)
```

**Formal Proof**:
```cvl
invariant installmentAmountConsistent(uint256 planId)
    bnplPlans[planId].totalAmount ==
        bnplPlans[planId].installmentAmount * 
        bnplPlans[planId].numberOfInstallments
```

**INV-PP-2: SNPL Savings Accumulation**
```
∀ plan p: savedAmount(p) = Σ(deposits[p])
```

**Formal Proof**:
```cvl
invariant snplSavingsCorrect(uint256 planId)
    snplPlans[planId].savedAmount ==
        sumOfDeposits(planId)
```

**INV-PP-3: BNPL Completion**
```
∀ plan p: completed(p) => paidInstallments(p) = numberOfInstallments(p)
```

### State Transition Properties

**PROP-PP-1: Installment Payment Updates State**
```
Pre: paidInstallments = plan.paidInstallments
Action: payBNPLInstallment(planId)
Post: plan.paidInstallments = paidInstallments + 1
```

**Verification Rule**:
```cvl
rule installmentPaymentUpdatesCount(uint256 planId) {
    env e;
    uint256 paidBefore = bnplPlans[planId].paidInstallments;
    
    require e.msg.value == bnplPlans[planId].installmentAmount;
    
    payBNPLInstallment(e, planId);
    
    assert bnplPlans[planId].paidInstallments == paidBefore + 1;
}
```

---

## Cross-Contract Invariants

### Global System Properties

**GLOBAL-INV-1: Total Value Conservation**
```
Σ(poolBalances) + Σ(loanBalances) + Σ(bnplBalances) + Σ(snplBalances) = TotalSystemValue
```

**GLOBAL-INV-2: Credit Score Consistency**
```
∀ user u: creditScoreInRegistry(u) = creditScoreInLoanContract(u)
```

**GLOBAL-INV-3: Authorization Chain**
```
∀ contract c: c.authorized => c.hasUserRegistryAccess ∧ c.hasCreditScoreAccess
```

---

## Verification Methodology

### Step 1: Specification Writing

```cvl
// Example: UserRegistry specification
methods {
    registerUser(string) returns (bool)
    verifyKYC(address) returns (bool)
    isUserKYCVerified(address) returns (bool) envfree
}

invariant userCannotRegisterTwice(address user)
    users[user].isRegistered => cannotCallRegisterAgain(user)

rule registerUserSetsFields(string ipfsHash) {
    env e;
    
    registerUser(e, ipfsHash);
    
    assert users[e.msg.sender].isRegistered == true;
    assert users[e.msg.sender].walletAddress == e.msg.sender;
}
```

### Step 2: Tool Configuration

**Certora Prover Configuration** (`certora.conf`):
```json
{
    "files": [
        "contracts/UserRegistry.sol",
        "contracts/CreditScore.sol"
    ],
    "verify": "UserRegistry:specs/UserRegistry.spec",
    "solc": "solc-0.8.20",
    "optimistic_loop": true,
    "loop_iter": 3,
    "msg": "UserRegistry Verification"
}
```

### Step 3: Running Verification

```bash
# Install Certora Prover
npm install -g @certora/prover

# Run verification
certoraRun certora.conf

# View results
# Results will show:
# ✅ Verified rules
# ❌ Violated rules (with counterexamples)
# ⏱️ Timeout rules
```

### Step 4: Analyzing Results

**Successful Verification**:
```
✅ Rule registerUserCorrectness: VERIFIED
✅ Invariant scoreBounds: VERIFIED
✅ Rule proportionalPayoutCorrect: VERIFIED
```

**Failed Verification**:
```
❌ Rule kycCannotSelfVerify: VIOLATED
Counterexample:
  user = 0x1234...
  verifier = 0x1234...
  Result: KYC was self-verified
Fix: Add require(msg.sender != user) in verifyKYC()
```

---

## Formal Verification Checklist

### Pre-Verification
- [ ] All contracts compiled successfully
- [ ] Unit tests passing (>95% coverage)
- [ ] Specification written for each contract
- [ ] Invariants identified and documented
- [ ] State transition properties defined

### Verification Process
- [ ] Run Certora Prover on each contract
- [ ] Analyze and fix any violated rules
- [ ] Re-run verification after fixes
- [ ] Document all verified properties
- [ ] Generate formal verification report

### Post-Verification
- [ ] All critical properties verified
- [ ] Counterexamples addressed
- [ ] Verification artifacts archived
- [ ] Update deployment documentation
- [ ] Include in audit report

---

## Properties to Verify (Priority List)

### Critical (Must Verify)

**Access Control**:
- [ ] Only owner can call onlyOwner functions
- [ ] Only authorized contracts can update credit scores
- [ ] Only KYC verifiers can verify KYC

**Value Transfer**:
- [ ] Funds cannot be stolen
- [ ] Proportional payout is mathematically correct
- [ ] No reentrancy vulnerabilities
- [ ] Total value conservation

**State Consistency**:
- [ ] Credit scores stay within bounds
- [ ] Pool balances match contributions
- [ ] Loan statuses transition correctly

### High Priority

**Business Logic**:
- [ ] Interest calculation is correct
- [ ] Voting thresholds are enforced
- [ ] Claim approval logic is sound
- [ ] BNPL/SNPL calculations are accurate

**Edge Cases**:
- [ ] Division by zero is prevented
- [ ] Integer overflow/underflow caught
- [ ] Empty pool handling
- [ ] Zero value transfers

### Medium Priority

**Optimization Verification**:
- [ ] Gas optimizations don't break logic
- [ ] Struct packing maintains correctness
- [ ] Unchecked blocks are safe

---

## Tools and Resources

### Recommended Tools

**1. Certora Prover** (Industry Standard)
- Website: certora.com
- Cost: ~$50K-100K for full suite
- Timeline: 4-8 weeks
- Coverage: Comprehensive

**2. Runtime Verification (KEVM)**
- Website: runtimeverification.com  
- K Framework for EVM
- Academic rigor
- Timeline: 6-12 weeks

**3. Formal Verification by Trail of Bits**
- Uses: Manticore, Echidna
- Hybrid approach (formal + fuzzing)
- Cost: ~$30K-60K
- Timeline: 2-4 weeks

### Open Source Tools

**1. Solidity SMTChecker**
```solidity
// Enable in contract
pragma experimental SMTChecker;

contract Example {
    uint x;
    
    function increment() public {
        x = x + 1;
        assert(x > 0);  // SMT will verify this
    }
}
```

**2. Mythril**
```bash
myth analyze contracts/UserRegistry.sol
```

**3. Echidna (Fuzzing)**
```bash
echidna-test contracts/ --contract UserRegistry
```

---

## Cost-Benefit Analysis

### Costs

**Professional Verification**:
- Certora: $50K-100K
- Runtime Verification: $80K-150K
- Trail of Bits: $30K-60K

**Internal Effort**:
- Specification writing: 2-4 weeks
- Tool setup: 1 week
- Analysis: 2-3 weeks
- **Total**: 5-8 weeks of expert time

### Benefits

**Risk Mitigation**:
- Prevent exploits (avg loss: $10M+)
- Regulatory compliance
- User confidence
- Insurance cost reduction

**Break-Even Analysis**:
- Verification cost: $50K-100K
- Potential exploit loss: $10M+
- **ROI**: 100x-200x if prevents single major exploit

---

## Recommended Approach for Nishkama

### Phase 1: Internal Verification (Month 1)
- Write formal specifications
- Use Solidity SMTChecker
- Run Mythril and Slither
- Document invariants
- **Cost**: Internal time only

### Phase 2: Professional Audit (Month 2)
- Engage Certora or Trail of Bits
- Focus on critical contracts (InsurancePool, MicroLoan)
- Verify access control and value transfer
- **Cost**: $30K-60K

### Phase 3: Full Verification (Month 3)
- Comprehensive verification of all contracts
- Cross-contract property verification
- Generate formal verification certificate
- **Cost**: Additional $20K-40K

### Total Investment
- **Cost**: $50K-100K
- **Timeline**: 3 months
- **Benefit**: Mathematical guarantee of correctness

---

## Deliverables

After formal verification, you will receive:

1. **Verification Report** (PDF)
   - All verified properties
   - Counterexamples for violated properties
   - Recommendations for fixes

2. **Specification Files** (.spec, .cvl)
   - Reusable for future versions
   - Can verify upgrades

3. **Verification Certificate**
   - Proof of correctness
   - Usable for marketing/compliance

4. **Updated Smart Contracts**
   - With fixes for violations
   - Proven correct

---

## Conclusion

Formal verification provides mathematical certainty that smart contracts behave correctly under all conditions. While expensive, it's essential for high-value DeFi applications.

**Recommendation for Nishkama**:
- ✅ Start with internal verification (SMTChecker, Mythril)
- ✅ Engage professional verification firm before mainnet
- ✅ Focus verification on critical paths (value transfer, access control)
- ✅ Budget $50K-100K and 3 months for full verification

**Priority Contracts** for verification:
1. InsurancePool.sol (highest risk - handles user funds)
2. MicroLoan.sol (complex logic - interest calculations)
3. CreditScore.sol (critical for security decisions)
4. PaymentPlan.sol (BNPL/SNPL logic)
5. UserRegistry.sol (access control foundation)

---

**Document Version**: 1.0.0  
**Last Updated**: November 29, 2025  
**Recommended Verification Partner**: Certora or Runtime Verification  
**Estimated Budget**: $50K-100K  
**Estimated Timeline**: 3 months
