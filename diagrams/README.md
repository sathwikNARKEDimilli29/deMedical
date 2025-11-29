# De-Medical Platform - Mermaid Diagrams

This directory contains all UML diagrams for the De-Medical blockchain insurance platform in Mermaid format.

## 📁 Files

1. **01-class-diagram.txt** - Smart Contract Class Diagram
2. **02-er-diagram.txt** - Database ER Diagram (MongoDB Schema)
3. **03-activity-registration.txt** - User Registration Activity Diagram
4. **04-activity-claim-process.txt** - Claim Submission & Approval Activity Diagram
5. **05-use-case-diagram.txt** - System Use Case Diagram
6. **06-sequence-pool-join.txt** - Insurance Pool Join Sequence Diagram
7. **07-sequence-loan-application.txt** - Micro-Loan Application Sequence Diagram
8. **08-sequence-bnpl-flow.txt** - BNPL Payment Flow Sequence Diagram
9. **09-communication-claim-voting.txt** - Claim Voting Communication Diagram
10. **10-component-interaction.txt** - Component Interaction Diagram
11. **11-deployment-architecture.txt** - Deployment Architecture Diagram

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
