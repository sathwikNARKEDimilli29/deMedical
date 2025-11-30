# De-Medical Platform - Mermaid Diagrams

This directory contains all UML diagrams for the De-Medical blockchain insurance platform in Mermaid format.

## 🔐 Enhanced Security Features

This platform now includes comprehensive security enhancements:

### Bug Bounty Program (BugBounty.sol)
- **5 Severity Levels**: Critical ($50,000), High ($10,000), Medium ($5,000), Low ($1,000), Informational ($200)
- **Researcher Management**: Registration, reputation tracking, leaderboard
- **On-Chain Rewards**: Transparent, automated bounty distribution
- **Continuous Security**: Incentivizes ongoing vulnerability discovery

### Enhanced Loan System (MicroLoan.sol)
- **4 Loan Types**: Unsecured, Collateralized (35% discount), Co-Signed (20% discount), Pool-Backed (25% discount)
- **Risk Mitigation**: Multiple options for securing loans
- **Insurance Integration**: Default coverage through insurance pool backing
- **Flexible Access**: Options for users with varying credit profiles

## 📁 Files

1. **00-application-summary.txt** - Complete Platform Summary (7 contracts, 44 use cases)
2. **01-class-diagram.txt** - Smart Contract Class Diagram (including BugBounty, enhanced MicroLoan & CrowdFunding)
3. **02-er-diagram.txt** - Database ER Diagram (MongoDB Schema)
4. **03-activity-registration.txt** - User Registration Activity Diagram
5. **04-activity-claim-process.txt** - Claim Submission & Approval Activity Diagram
6. **05-use-case-diagram.txt** - System Use Case Diagram (44 use cases)
7. **06-sequence-pool-join.txt** - Insurance Pool Join Sequence Diagram
8. **07-sequence-loan-application.txt** - Micro-Loan Application Sequence Diagram
9. **08-sequence-bnpl-flow.txt** - BNPL Payment Flow Sequence Diagram
10. **09-communication-claim-voting.txt** - Claim Voting Communication Diagram
11. **10-component-interaction.txt** - Component Interaction Diagram
12. **11-deployment-architecture.txt** - Deployment Architecture Diagram
13. **12-enhanced-platform-features.txt** - ⭐ Platform Overview with Security Features
14. **13-bug-bounty-sequence.txt** - ⭐ Bug Bounty Program Complete Workflow
15. **14-enhanced-loan-options.txt** - ⭐ All 4 Loan Types: Comparison & Flows

## 🎨 How to Use

### Online Viewer
1. Go to https://mermaid.live/
2. Copy content from any .txt file
3. Paste into editor
4. Export as PNG/SVG

### VS Code
1. Install "Markdown Preview Mermaid Support" extension
2. Create markdown file with:
   ```markdown
   ```mermaid
   [paste content here]
   ```
   ```
3. Preview the markdown file

### GitHub/GitLab
Wrap in markdown code blocks:
```markdown
```mermaid
[paste content here]
```
```

### Generate Images
Use Mermaid CLI:
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i 01-class-diagram.txt -o class-diagram.png
```

## 📊 Diagram Types

- **Class Diagrams**: OOP structure of smart contracts
- **ER Diagrams**: Database relationships
- **Activity Diagrams**: Process workflows
- **Use Case Diagrams**: System functionalities
- **Sequence Diagrams**: Component interactions over time
- **Communication Diagrams**: Message flow between components
- **Component Diagrams**: Architecture layers
- **Deployment Diagrams**: Physical deployment setup

## 🔗 External Tools

- **Mermaid Live Editor**: https://mermaid.live/
- **Mermaid Documentation**: https://mermaid.js.org/
- **VS Code Extension**: Markdown Preview Mermaid Support
- **CLI Tool**: @mermaid-js/mermaid-cli

---

**Note**: This directory is excluded from version control (.gitignore).
For production documentation, export diagrams as images and commit those instead.
