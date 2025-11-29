const mongoose = require('mongoose');

const poolSchema = new mongoose.Schema({
  poolId: {
    type: Number,
    required: true,
    unique: true
  },
  name: String,
  description: String,
  creator: String,
  poolType: {
    type: String,
    enum: ['HEALTH', 'LIFE', 'ACCIDENT', 'CRITICAL_ILLNESS']
  },
  targetAmount: String,
  currentAmount: String,
  memberCount: Number,
  maxMembers: Number,
  isActive: Boolean,
  members: [{
    address: String,
    contribution: String,
    joinedAt: Date
  }],
  analytics: {
    totalClaims: Number,
    approvedClaims: Number,
    totalPaidOut: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Pool', poolSchema);
