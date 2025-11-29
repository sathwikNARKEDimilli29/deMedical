const mongoose = require('mongoose');

const rewardConfigSchema = new mongoose.Schema({
  severity: {
    type: String,
    enum: ['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
    unique: true
  },
  amount: {
    type: String, // Storing as string to handle potentially large numbers or formatting, though Number is likely fine for ETH
    required: true
  },
  amountUSD: {
    type: String, // Approximate USD value for display
    required: true
  },
  color: {
    type: String,
    default: 'gray'
  },
  icon: {
    type: String,
    default: '⚪'
  }
}, {
  timestamps: true
});

const RewardConfig = mongoose.model('RewardConfig', rewardConfigSchema);

module.exports = RewardConfig;
