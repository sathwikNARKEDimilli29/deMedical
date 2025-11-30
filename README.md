# Nishkama - Blockchain Insurance Platform

A revolutionary blockchain-powered healthcare insurance platform featuring pooled contributions, micro-loans, credit scoring, and innovative payment solutions.

## 🚀 Features

### Core Features
- **Pooled Insurance**: Join pools with proportional contributions and claims
- **Enhanced Micro-Loans**: Healthcare loans with 4 types of security:
  - 🔓 **Unsecured Loans**: Traditional credit-based lending (5-25% APR)
  - 🔒 **Collateralized Loans**: 50% collateral requirement, 35% interest discount
  - 👥 **Co-Signed Loans**: Co-signer backing, 20% interest discount
  - 🛡️ **Pool-Backed Loans**: Insurance pool coverage, 25% interest discount
- **On-Chain Credit Scoring**: Transparent credit scores that improve with payment history
- **Buy Now Pay Later (BNPL)**: Split medical expenses into 2-12 installments
- **Save Now Pay Later (SNPL)**: Systematic savings for future medical needs
- **AI Assistant**: 24/7 chatbot for guidance and recommendations
- **🐛 Bug Bounty Program**: Rewards for security researchers ($200 - $50,000)
- **💚 Medical Crowdfunding**: Community-funded campaigns with milestone releases

### Technical Features
- Smart contracts built with Hardhat & Solidity (7 contracts)
- Next.js 14 frontend with modern UI/UX
- MongoDB database for off-chain data
- IPFS integration for document storage
- MetaMask wallet integration
- RESTful API backend with Express.js
- Comprehensive formal verification specifications

## 📋 Prerequisites

- Node.js 16+ and npm
- MetaMask browser extension
- MongoDB (local or Atlas)
- Git

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd De-Medical
```

### 2. Install Root Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 4. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 5. Environment Setup

Create a `.env` file in the root directory:

```bash
# Copy example file (Git Bash/Linux/Mac)
cp .env.example .env

# Or on Windows PowerShell
copy .env.example .env
```

**Edit `.env` and configure:**

```env
# Blockchain (leave default for local development)
PRIVATE_KEY=your_private_key_here

# Backend Configuration
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nishkama
JWT_SECRET=change_this_to_random_secret_key_min_32_chars
JWT_EXPIRES_IN=7d

# IPFS Configuration (Get free keys from pinata.cloud)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Contract Addresses (will be filled after deployment - Step 7)
NEXT_PUBLIC_CONTRACT_ADDRESS_POOL=
NEXT_PUBLIC_CONTRACT_ADDRESS_CREDIT=
NEXT_PUBLIC_CONTRACT_ADDRESS_LOAN=
NEXT_PUBLIC_CONTRACT_ADDRESS_PAYMENT=
NEXT_PUBLIC_CONTRACT_ADDRESS_REGISTRY=
NEXT_PUBLIC_CONTRACT_ADDRESS_BUGBOUNTY=
```

**Frontend `.env` file:**

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_CONTRACT_ADDRESS_REGISTRY=
NEXT_PUBLIC_CONTRACT_ADDRESS_CREDIT=
NEXT_PUBLIC_CONTRACT_ADDRESS_POOL=
NEXT_PUBLIC_CONTRACT_ADDRESS_LOAN=
NEXT_PUBLIC_CONTRACT_ADDRESS_PAYMENT=
NEXT_PUBLIC_CONTRACT_ADDRESS_BUGBOUNTY=
```

---

## 🚀 Complete Execution Guide

### Step 1: Install MongoDB

**Option A - Local MongoDB:**

**Windows:**
1. Download from https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB will start automatically on port 27017

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**Option B - MongoDB Atlas (Cloud - Recommended):**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster (free tier)
4. Get connection string
5. Update `MONGODB_URI` in `.env`

Example: `mongodb+srv://username:password@cluster.mongodb.net/nishkama`

**Verify MongoDB is running:**
```bash
# Open new terminal
mongosh
# or
mongo

# You should see MongoDB shell
# Type 'exit' to leave
```

---

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

**Expected output:** ~200 packages installed

---

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

**Expected output:** ~300+ packages installed

---

### Step 4: Start Local Blockchain

**Terminal 1:**
```bash
# Navigate back to root
cd ..

# Start Hardhat node
npm run node
```

**Expected output:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

**⚠️ Keep this terminal running!**

**Save Account #0 information** - you'll need it for MetaMask

---

### Step 5: Compile Smart Contracts

**Terminal 2:**
```bash
# In root directory
npx hardhat compile
```

**Expected output:**
```
Compiled 5 Solidity files successfully
```

---

### Step 6: Run Tests (Optional but Recommended)

```bash
npx hardhat test
```

**Expected output:**
```
  De-Medical Insurance Platform
    UserRegistry
      ✔ Should register a new user
      ✔ Should verify KYC
      ...
      
  30 passing (5s)
```

---

### Step 7: Deploy Smart Contracts

**In Terminal 2:**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

**Expected output:**
```
Starting deployment...

1. Deploying UserRegistry...
UserRegistry deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

2. Deploying CreditScore...
CreditScore deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

...

✅ Deployment Complete!

📋 Contract Addresses:
====================
UserRegistry:   0x5FbDB2315678afecb367f032d93F642f64180aa3
CreditScore:    0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
InsurancePool:  0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
MicroLoan:      0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
PaymentPlan:    0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
```

**📝 IMPORTANT: Copy these addresses!**

---

### Step 8: Configure Contract Addresses

**Update `frontend/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_CONTRACT_ADDRESS_REGISTRY=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_CONTRACT_ADDRESS_CREDIT=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_CONTRACT_ADDRESS_POOL=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
NEXT_PUBLIC_CONTRACT_ADDRESS_LOAN=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
NEXT_PUBLIC_CONTRACT_ADDRESS_PAYMENT=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
```

**Also update root `.env` (optional for backend):**
```env
NEXT_PUBLIC_CONTRACT_ADDRESS_REGISTRY=0x5FbDB2315678afecb367f032d93F642f64180aa3
...
```

---

### Step 9: Start Backend Server

**Terminal 2:**
```bash
npm run backend
```

**Expected output:**
```
> de-medical-backend@1.0.0 dev
> nodemon server.js

[nodemon] starting `node server.js`
✅ MongoDB connected
🚀 Server is running on port 5000
```

**Verify backend is running:**

Open browser and go to: http://localhost:5000/health

Should see:
```json
{"status":"OK","message":"De-Medical API is running"}
```

**⚠️ Keep this terminal running!**

---

### Step 10: Start Frontend

**Terminal 3:**
```bash
npm run frontend
```

**Expected output:**
```
> de-medical-frontend@1.0.0 dev
> next dev

  ▲ Next.js 14.0.4
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

✓ Ready in 3.5s
```

**⚠️ Keep this terminal running!**

---

### Step 11: Setup MetaMask

**1. Install MetaMask:**
   - Chrome: https://chrome.google.com/webstore (search "MetaMask")
   - Click "Add to Chrome" → "Add Extension"

**2. Setup Wallet:**
   - Click MetaMask icon
   - Create new wallet or import existing
   - Save seed phrase securely
   - Create password

**3. Add Local Network:**
   - Click MetaMask icon
   - Click network dropdown (top left)
   - Click "Add Network" → "Add a network manually"
   
   **Enter details:**
   ```
   Network Name: Localhost 8545
   New RPC URL: http://127.0.0.1:8545
   Chain ID: 1337
   Currency Symbol: ETH
   ```
   
   - Click "Save"
   - Switch to "Localhost 8545" network

**4. Import Test Account:**
   - Click account icon → "Import Account"
   - Paste Private Key from Step 4 (Account #0):
     ```
     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
     ```
   - Click "Import"
   - You should see **10000 ETH** balance

---

### Step 12: Access the Application

**Open browser and go to:** http://localhost:3000

You should see the De-Medical landing page! 🎉

---

## 🎮 Using the Application

### 1. Register Account

1. Click **"Get Started"** or **"Connect Wallet"**
2. MetaMask popup → Click **"Next"** → **"Connect"**
3. Fill in registration form:
   - Full Name: John Doe
   - Email: john@example.com
   - Phone: +1234567890
   - Date of Birth: (select date)
4. Click **"Create Account"**
5. You'll be redirected to Dashboard

### 2. Explore Features

**Dashboard:**
- View your stats (pools, claims, loans, credit score)
- See AI recommendations
- Quick action buttons

**Join Insurance Pool:**
1. Click "Pools" in navbar
2. Browse available pools
3. Click on a pool card
4. Click "Join Pool"
5. MetaMask will popup
6. Enter contribution amount (e.g., 0.1 ETH)
7. Confirm transaction

**Apply for Micro-Loan:**
1. Click "Loans" in navbar
2. View your credit score
3. Click "Apply Now"
4. Fill in loan details:
   - Amount: 1 ETH
   - Duration: 90 days
   - Purpose: Medical treatment
5. Upload documents (medical bills)
6. Submit

**Check Credit Score:**
1. Click "Credit Score" in navbar
2. View your score (default: 500)
3. See improvement tips
4. Track payment history

**AI Assistant:**
1. Click floating robot icon (bottom right)
2. Ask questions like:
   - "How do insurance pools work?"
   - "What is my credit score?"
   - "How can I apply for a loan?"
3. Get instant responses

---

## 🔧 Troubleshooting

### MongoDB Connection Error
```
Error: MongoServerError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
- Verify MongoDB is running:
  ```bash
  # Windows
  services.msc → Find "MongoDB" → Start
  
  # Mac
  brew services start mongodb-community
  
  # Linux
  sudo systemctl start mongodb
  ```
- Or use MongoDB Atlas (cloud) instead

---

### MetaMask Not Connecting
```
Please install MetaMask!
```

**Solution:**
1. Install MetaMask extension
2. Refresh page
3. Make sure you're on Localhost 8545 network
4. Clear browser cache if needed

---

### Smart Contract Error
```
Contract not deployed to detected network
```

**Solution:**
1. Make sure Hardhat node is running (Terminal 1)
2. Redeploy contracts: `npx hardhat run scripts/deploy.js --network localhost`
3. Update contract addresses in `frontend/.env.local`
4. Restart frontend server

---

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

---

### Frontend Build Error
```
Module not found: Can't resolve '@/components/...'
```

**Solution:**
1. Make sure you're in `frontend` directory
2. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```
3. Restart dev server

---

## ✅ Verification Checklist

Before using the application, verify:

- [ ] MongoDB is running (connection successful)
- [ ] Hardhat node is running (Terminal 1 shows accounts)
- [ ] Backend server is running (http://localhost:5000/health works)
- [ ] Frontend is running (http://localhost:3000 loads)
- [ ] Smart contracts deployed (5 addresses obtained)
- [ ] MetaMask installed and configured
- [ ] Localhost 8545 network added to MetaMask
- [ ] Test account imported with 10000 ETH
- [ ] Contract addresses in `frontend/.env.local`

---

## 🎬 Quick Start (After First Setup)

Once everything is configured, you only need:

```bash
# Terminal 1
npm run node

# Terminal 2 (wait for Terminal 1 to start)
npm run backend

# Terminal 3 (wait for Terminal 2 to connect to MongoDB)
npm run frontend
```

Then open http://localhost:3000 in browser with MetaMask!

## 📝 Smart Contract Deployment

### 1. Compile Contracts
```bash
npx hardhat compile
```

### 2. Run Tests
```bash
npx hardhat test
```

### 3. Deploy to Local Network
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 4. Update Frontend Environment

After deployment, copy the contract addresses from the terminal output and add them to `frontend/.env`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS_REGISTRY=0x...
NEXT_PUBLIC_CONTRACT_ADDRESS_CREDIT=0x...
NEXT_PUBLIC_CONTRACT_ADDRESS_POOL=0x...
NEXT_PUBLIC_CONTRACT_ADDRESS_LOAN=0x...
NEXT_PUBLIC_CONTRACT_ADDRESS_PAYMENT=0x...
```

## 🏗️ Project Structure

```
De-Medical/
├── contracts/              # Solidity smart contracts
│   ├── UserRegistry.sol
│   ├── CreditScore.sol
│   ├── InsurancePool.sol
│   ├── MicroLoan.sol
│   ├── PaymentPlan.sol
│   ├── BugBounty.sol
│   └── CrowdFunding.sol
├── scripts/               # Deployment scripts
│   └── deploy.js
├── test/                  # Contract tests
│   └── DeMedical.test.js
├── backend/               # Express.js backend
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   └── server.js
├── frontend/              # Next.js frontend
│   ├── app/              # Pages (App Router)
│   ├── components/       # React components
│   └── public/           # Static assets
├── hardhat.config.js     # Hardhat configuration
└── package.json          # Root dependencies
```

## 🔧 Smart Contracts

### UserRegistry
- User registration and KYC management
- IPFS document storage

### CreditScore
- On-chain credit score calculation
- Multi-factor scoring algorithm
- Payment history tracking

### InsurancePool
- Pool creation and management
- Proportional contributions
- Democratic claim voting
- Proportional payouts

### MicroLoan
- Healthcare loan issuance
- Credit-based interest rates
- Repayment tracking
- Default management

### PaymentPlan
- BNPL implementation
- SNPL savings plans
- Installment tracking
- Late fee mechanisms

### BugBounty
- Security vulnerability reporting
- Researcher registration and rewards
- Dynamic bounty allocation
- Reputation leaderboard

### CrowdFunding
- Medical campaign creation
- Milestone-based fund releases
- Community approval voting
- All-or-nothing or keep-it-all models
- Transparent backer tracking
- Credit score integration

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login/wallet` - Login with wallet
- `GET /api/auth/profile/:address` - Get user profile

### Pools
- `GET /api/pools` - Get all pools
- `GET /api/pools/:id` - Get pool details
- `POST /api/pools` - Create new pool

### Claims
- `GET /api/claims` - Get claims
- `POST /api/claims` - Submit claim

### Loans
- `GET /api/loans` - Get loans
- `POST /api/loans` - Request loan

### Credit
- `GET /api/credit/:address` - Get credit score

### AI Assistant
- `POST /api/ai/chat` - Chat with AI
- `POST /api/ai/recommend` - Get recommendations

### Crowdfunding
- `GET /api/crowdfunding` - Get all campaigns (with filters)
- `GET /api/crowdfunding/:id` - Get campaign details
- `POST /api/crowdfunding/create` - Create campaign
- `POST /api/crowdfunding/:id/contribute` - Contribute to campaign
- `POST /api/crowdfunding/:id/approve` - Vote for approval
- `PUT /api/crowdfunding/:id` - Update campaign
- `POST /api/crowdfunding/:id/milestone/:index/release` - Release milestone
- `GET /api/crowdfunding/user/:address/created` - Get user's campaigns
- `GET /api/crowdfunding/user/:address/contributions` - Get user contributions
- `GET /api/crowdfunding/stats/overview` - Get statistics

## 🎨 Frontend Pages

- `/` - Landing page
- `/auth/register` - User registration
- `/auth/login` - User login
- `/dashboard` - User dashboard
- `/pools` - Browse insurance pools
- `/claims` - Manage claims
- `/loans` - Micro-loans
- `/credit-score` - Credit score details
- `/payment-plans` - BNPL/SNPL management
- `/crowdfunding` - Browse campaigns
- `/crowdfunding/[id]` - Campaign details
- `/crowdfunding/create` - Create campaign
- `/crowdfunding/my-campaigns` - Manage campaigns

## 🔐 Enhanced Security Features

### Loan Types Comparison

The platform now supports 4 types of loans with varying security levels and interest rates:

| Loan Type | Collateral Required | Co-Signer | Insurance | Interest Discount | Example Rate* |
|-----------|--------------------|-----------|-----------|--------------------|---------------|
| **Unsecured** | ❌ No | ❌ No | ❌ No | 0% | 15.0% |
| **Collateralized** | ✅ 50% of loan amount | ❌ No | ❌ No | 35% | 9.75% |
| **Co-Signed** | ❌ No | ✅ Required (credit ≥ 600) | ❌ No | 20% | 12.0% |
| **Pool-Backed** | ❌ No | ❌ No | ✅ 120% coverage | 25% | 11.25% |

*Example rate based on 500 credit score (15% base rate)

### Collateralized Loans
- Require 50% of loan amount as collateral (in ETH)
- Collateral is locked in smart contract
- On successful repayment: Collateral returned + credit score boost
- On default: Collateral seized and added to loan pool
- **Interest Discount**: 35% off base rate

**Example**:
```javascript
// Borrower wants 1 ETH loan, provides 0.5 ETH collateral
await microLoan.requestCollateralizedLoan(
  ethers.parseEther("1"),     // loan amount
  90,                          // 90 days duration
  "Surgery costs",             // purpose
  "QmIPFSHash",               // medical documents
  { value: ethers.parseEther("0.5") }  // collateral
);
```

### Co-Signed Loans
- Requires a co-signer with credit score ≥ 600
- Co-signer becomes liable if borrower defaults
- Both borrower and co-signer credit scores affected
- Lower interest rate than unsecured loans
- **Interest Discount**: 20% off base rate

**Default Handling**:
- Borrower defaults → Co-signer is notified
- Co-signer must pay remaining balance
- Borrower: Credit score -50 points
- Co-signer: Credit score -10 points

### Pool-Backed Loans
- Backed by insurance pool funds (120% coverage)
- Pool reserves funds as loan guarantee
- Lower default risk for lenders
- **Interest Discount**: 25% off base rate
- Available only to non-blacklisted users

**Default Handling**:
- Insurance pool covers the loss
- Borrower is blacklisted from future pool-backed loans
- Pool members share the loss proportionally
- Pool receives interest premium (20% of loan amount)

### Bug Bounty Program

Security researchers can earn rewards by finding vulnerabilities:

| Severity | Impact Examples | Reward (Dynamic) |
|----------|----------------|--------|
| **CRITICAL** | Fund theft, complete system compromise | ~25 ETH (~$50,000) |
| **HIGH** | Unauthorized access, partial DOS | ~5 ETH (~$10,000) |
| **MEDIUM** | Logic errors, data corruption | ~2.5 ETH (~$5,000) |
| **LOW** | Edge cases, minor vulnerabilities | ~0.5 ETH (~$1,000) |
| **INFORMATIONAL** | Code quality, gas optimizations | ~0.1 ETH (~$200) |

*Note: Reward amounts are dynamic and configured by the admin. The values above are default estimates.*

**Process**:
1. Register as security researcher
2. Submit bug report with IPFS-stored POC
3. Admin triages and confirms severity
4. Bug is verified and reward approved
5. Fix is deployed
6. Researcher is paid
7. Responsible disclosure (90 days post-fix)

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login/wallet` - Login with wallet
- `GET /api/auth/profile/:address` - Get user profile

### Pools
- `GET /api/pools` - Get all pools
- `GET /api/pools/:id` - Get pool details
- `POST /api/pools` - Create new pool

### Claims
- `GET /api/claims` - Get claims
- `POST /api/claims` - Submit claim

### Loans
- `GET /api/loans` - Get loans
- `POST /api/loans` - Request loan
- `POST /api/loans/collateralized` - Request collateralized loan
- `POST /api/loans/cosigned` - Request co-signed loan
- `POST /api/loans/pool-backed` - Request pool-backed loan
- `POST /api/loans/:id/cosigner-payment` - Co-signer makes payment

### Credit
- `GET /api/credit/:address` - Get credit score

### Bug Bounty
- `POST /api/bug-bounty/register` - Register as researcher
- `POST /api/bug-bounty/report` - Submit bug report
- `GET /api/bug-bounty/reports` - Get all reports
- `GET /api/bug-bounty/reports/:id` - Get specific report
- `GET /api/bug-bounty/researcher/:address` - Get researcher profile
- `GET /api/bug-bounty/leaderboard` - Top researchers
- **Admin Routes**:
  - `PUT /api/bug-bounty/reports/:id/triage` - Triage report
  - `PUT /api/bug-bounty/reports/:id/verify` - Verify bug
  - `POST /api/bug-bounty/reports/:id/pay` - Pay reward
  - `POST /api/bug-bounty/reports/:id/disclose` - Public disclosure

### AI Assistant
- `POST /api/ai/chat` - Chat with AI
- `POST /api/ai/recommend` - Get recommendations

## 🎨 Frontend Pages

- `/` - Landing page
- `/auth/register` - User registration
- `/auth/login` - User login
- `/dashboard` - User dashboard
- `/pools` - Browse insurance pools
- `/claims` - Manage claims
- `/loans` - Micro-loans (with loan type selector)
- `/credit-score` - Credit score details
- `/payment-plans` - BNPL/SNPL management
- `/bug-bounty` - Bug bounty dashboard (planned)
- `/bug-bounty/submit` - Submit bug report (planned)
- `/bug-bounty/admin` - Admin panel (planned)

## 🧪 Testing

Run smart contract tests:
```bash
npx hardhat test
```

Run with gas reporting:
```bash
REPORT_GAS=true npx hardhat test
```

Run with coverage:
```bash
npx hardhat coverage
```

## 🔐 Security Considerations

- Never commit `.env` files
- Use environment variables for sensitive data
- Audit smart contracts before mainnet deployment
- Implement proper access controls
- Use HTTPS in production
- Enable rate limiting on APIs

## 📱 MetaMask Setup

1. Install MetaMask extension
2. Create or import wallet
3. Add local network:
   - Network Name: Localhost
   - RPC URL: http://localhost:8545
   - Chain ID: 1337
   - Currency Symbol: ETH

## 🚢 Production Deployment

### Smart Contracts
1. Update `hardhat.config.js` with testnet/mainnet RPC URLs
2. Add private key to `.env`
3. Deploy: `npx hardhat run scripts/deploy.js --network sepolia`
4. Verify contracts on Etherscan

### Backend
- Deploy to services like Heroku, AWS, or DigitalOcean
- Set environment variables
- Use MongoDB Atlas for database

### Frontend
- Deploy to Vercel or Netlify
- Update environment variables
- Configure API URLs

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please read contributing guidelines first.

## 💬 Support

For support, email support@de-medical.com or join our Discord.

## 🙏 Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Hardhat for development framework
- Next.js team for amazing framework
- Community contributors

---

Built with ❤️ for accessible healthcare
