const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  claimId: {
    type: Number,
    required: true,
    unique: true
  },
  poolId: Number,
  claimant: String,
  amount: String,
  description: String,
  documents: String, // IPFS hash
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAID']
  },
  approvalCount: Number,
  rejectionCount: Number,
  votes: [{
    voter: String,
    approve: Boolean,
    timestamp: Date
  }],
  submittedAt: Date,
  processedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Claim', claimSchema);
