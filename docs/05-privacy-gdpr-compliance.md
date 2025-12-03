# Privacy & GDPR Compliance Documentation

## Executive Summary

The De-Medical blockchain insurance platform is designed with **privacy-by-design** principles to comply with GDPR and other data protection regulations. This document explains our data architecture, legal considerations, and user rights.

---

## On-Chain vs Off-Chain Data Architecture

### What Data Goes Where?

| Data Type | Storage Location | Example | Deletable? |
|-----------|-----------------|---------|------------|
| **Cryptographic Hashes** | On-Chain (Blockchain) | `QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco` | ❌ No (Immutable) |
| **Personally Identifiable Information (PII)** | Off-Chain (IPFS) | Name, email, medical records | ✅ Yes (Can unpin) |
| **Wallet Addresses** | On-Chain (Blockchain) | `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` | ❌ No (Immutable) |
| **Transaction Metadata** | On-Chain (Blockchain) | Loan amount, pool contribution | ❌ No (Immutable) |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Submits Data                        │
│           (Name, Email, Medical Records, etc.)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   IPFS Storage (Off-Chain)  │
         │  - Full PII stored here     │
         │  - Can be unpinned/deleted  │
         │  - Encrypted at rest        │
         └──────────────┬──────────────┘
                        │
                        │ Returns Hash
                        ▼
         ┌─────────────────────────────┐
         │ Blockchain (On-Chain)       │
         │ - Stores ONLY the hash      │
         │ - Hash = QmXoyp...          │
         │ - Immutable & permanent     │
         └─────────────────────────────┘
```

**Key Point**: The blockchain stores a **reference** (hash) to the data, NOT the data itself.

---

## The Hash-as-PII Debate

### What is the Debate?

Under GDPR Article 4(1), PII is defined as:

> "any information relating to an identified or identifiable natural person"

The legal question: **Do cryptographic hashes of personal data constitute PII?**

### Arguments For (Hash IS PII)

1. **Re-identification Risk**: If someone has access to both the hash and the original data, they can verify identity
2. **Auxiliary Information**: Combined with other data, hashes might enable re-identification
3. **GDPR Recital 26**: Suggests pseudonymous data (like hashes) still falls under GDPR if re-identification is possible

### Arguments Against (Hash is NOT PII)

1. **One-Way Function**: Cryptographic hashes (SHA-256, IPFS CID) are computationally irreversible
2. **No Direct Identification**: Hash alone reveals nothing about the individual
3. **Technical Impossibility**: Without the original data, hash cannot identify anyone

### De-Medical's Position

**We treat hashes as potentially pseudonymous data** under GDPR Article 4(5) and apply the following mitigations:

1. ✅ **Off-chain data is deletable**: Original PII on IPFS can be unpinned
2. ✅ **Transparency**: Users are informed about what data is stored where
3. ✅ **Data minimization**: Only necessary hashes are stored on-chain
4. ✅ **Purpose limitation**: Hashes are used only for data integrity verification
5. ✅ **Access controls**: IPFS data is encrypted and access-controlled

---

## GDPR Rights & Platform Responses

### 1. Right to Access (Article 15)

**User Request**: "I want to see what data you have about me"

**Our Response**:
- ✅ Provide all on-chain transaction history (public blockchain)
- ✅ Provide off-chain IPFS data (if still pinned)
- ✅ Provide list of data processing records via `PrivacyCompliance.sol`

**How to Request**: Call `getComplianceSummary(yourAddress)` on smart contract

---

### 2. Right to Erasure / "Right to be Forgotten" (Article 17)

**User Request**: "Delete all my personal data"

**Our Response**:

| Data Location | Action Taken | Technical Details |
|---------------|--------------|-------------------|
| **Off-Chain (IPFS)** | ✅ **CAN DELETE** | Unpin from IPFS, data becomes unavailable |
| **On-Chain (Hash)** | ❌ **CANNOT DELETE** | Blockchain is immutable by design |
| **On-Chain (Transactions)** | ❌ **CANNOT DELETE** | Transaction history is permanent |

**Mitigation Strategy**:
1. User calls `requestDataDeletion(recordId)` in `PrivacyCompliance.sol`
2. Platform unpins IPFS data within 30 days
3. Platform marks record as `offChainDeleted = true`
4. Without IPFS data, on-chain hash becomes **meaningless** (just a random string)

**Legal Basis**: GDPR Recital 39 acknowledges technical impossibility may limit right to erasure:
> "That right is not absolute and may be limited in certain cases"

---

### 3. Right to Rectification (Article 16)

**User Request**: "Correct my incorrect data"

**Our Response**:
- ✅ Upload corrected data to IPFS with new hash
- ✅ Update smart contract reference to new hash
- ⚠️ Old hash remains on-chain (blockchain history) but becomes orphaned

---

### 4. Right to Data Portability (Article 20)

**User Request**: "Export my data in machine-readable format"

**Our Response**:
- ✅ Export all on-chain data as JSON
- ✅ Export all IPFS documents as ZIP archive
- ✅ Provide in standard formats (JSON, CSV)

---

### 5. Right to Object (Article 21)

**User Request**: "I object to processing my data"

**Our Response**:
- ✅ Stop collecting new data
- ✅ Delete off-chain IPFS data
- ⚠️ Cannot reverse past blockchain transactions (permanent ledger)

---

## Data Controller Responsibilities

### Who is the Data Controller?

**Answer**: The entity operating the De-Medical platform infrastructure (IPFS nodes, backend servers, frontend hosting).

### Controller Obligations

1. **Maintain IPFS Infrastructure**
   - Ensure IPFS nodes are running
   - Implement access controls and encryption
   - Monitor for data breaches

2. **Handle User Requests**
   - Respond to access requests within 30 days
   - Process deletion requests promptly
   - Maintain audit logs

3. **Privacy Policy**
   - Clearly explain on-chain vs off-chain storage
   - Warn users about blockchain immutability
   - Provide contact information for data requests

4. **Consent Management**
   - Obtain explicit consent via `PrivacyCompliance.acceptPrivacyPolicy()`
   - Track policy versions and user acceptance
   - Re-obtain consent for material changes

---

## Technical Implementation

### PrivacyCompliance Smart Contract

**File**: `contracts/PrivacyCompliance.sol`

**Key Functions**:

```solidity
// User accepts privacy policy
acceptPrivacyPolicy()

// Record data processing (called by other contracts)
recordDataProcessing(user, dataType, ipfsHash)

// User requests deletion
requestDataDeletion(recordId)

// Platform confirms deletion
confirmOffChainDeletion(recordId)

// Check compliance status
getComplianceSummary(user)
```

### Integration with Existing Contracts

**UserRegistry.sol**:
```solidity
// Before: Stores IPFS hash directly
users[msg.sender].ipfsHash = _ipfsHash;

// After: Records data processing
privacyCompliance.recordDataProcessing(
    msg.sender,
    "USER_REGISTRATION",
    _ipfsHash
);
```

**InsurancePool.sol**:
```solidity
// Record claim document processing
privacyCompliance.recordDataProcessing(
    msg.sender,
    "MEDICAL_CLAIM",
    _ipfsHash
);
```

---

## User Rights Portal (Frontend)

### Privacy Dashboard Features

1. **Data Overview**
   - View all data processing records
   - See which data is on-chain vs off-chain
   - Check deletion status

2. **Request Actions**
   - Request data export (portability)
   - Request data deletion (erasure)
   - Update incorrect data (rectification)

3. **Policy Management**
   - View current privacy policy
   - See policy version history
   - Accept new policy versions

**URL**: `/privacy-dashboard`

---

## Legal Disclaimers

> [!CAUTION]
> **This is Technical Documentation, Not Legal Advice**
> 
> This document explains technical mechanisms for privacy protection. It does NOT constitute legal advice. Platform operators should:
> - Consult qualified data protection lawyers
> - Conduct Data Protection Impact Assessments (DPIA)
> - Appoint a Data Protection Officer (DPO) if required
> - Register with relevant supervisory authorities

### Blockchain-Specific Risks

1. **Immutability Conflict**: Blockchain immutability may conflict with right to erasure
2. **Multi-Jurisdictional**: Distributed nodes may span multiple legal jurisdictions
3. **Data Controller Ambiguity**: Unclear who controls decentralized blockchains
4. **Evolving Regulations**: Blockchain + GDPR case law is still developing

### Recommended Actions Before Production

- [ ] Professional legal review by GDPR specialist
- [ ] Data Protection Impact Assessment (DPIA)
- [ ] Terms of Service clearly stating blockchain limitations
- [ ] User consent forms with explicit blockchain warnings
- [ ] Incident response plan for data breaches
- [ ] Regular compliance audits

---

## References

**GDPR Articles**:
- Article 4(1): Definition of personal data
- Article 4(5): Pseudonymisation
- Article 15: Right of access
- Article 16: Right to rectification
- Article 17: Right to erasure
- Article 20: Right to data portability
- Article 21: Right to object

**Resources**:
- [GDPR Full Text](https://gdpr-info.eu/)
- [European Data Protection Board Guidelines](https://edpb.europa.eu/)
- [Blockchain and GDPR](https://www.europarl.europa.eu/RegData/etudes/STUD/2019/634445/EPRS_STU(2019)634445_EN.pdf)

**Industry Best Practices**:
- [NIST Blockchain & Privacy](https://nvlpubs.nist.gov/nistpubs/ir/2018/NIST.IR.8202.pdf)
- [European Blockchain Partnership](https://digital-strategy.ec.europa.eu/en/policies/blockchain-partnership)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-03 | Initial privacy compliance documentation |

---

**Document Owner**: De-Medical Platform Legal & Compliance Team  
**Last Reviewed**: December 3, 2025  
**Next Review**: Quarterly or upon regulatory changes
