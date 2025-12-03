const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const authRoutes = require('./routes/authRoutes');
const poolRoutes = require('./routes/poolRoutes');
const claimRoutes = require('./routes/claimRoutes');
const loanRoutes = require('./routes/loanRoutes');
const creditRoutes = require('./routes/creditRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const ipfsRoutes = require('./routes/ipfsRoutes');
const aiRoutes = require('./routes/aiRoutes');
const bugBountyRoutes = require('./routes/bugBountyRoutes');
const crowdFundingRoutes = require('./routes/crowdFundingRoutes');
const oracleRoutes = require('./routes/oracleRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nishkama')
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pools', poolRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ipfs', ipfsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bug-bounty', bugBountyRoutes);
app.use('/api/crowdfunding', crowdFundingRoutes);
app.use('/api/oracle', oracleRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Nishkama API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Nishkama API Server running on port ${PORT}`);
});

module.exports = app;
