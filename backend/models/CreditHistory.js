const mongoose = require('mongoose');

const creditHistorySchema = new mongoose.Schema({
  userAddress: {
    type: String,
    required: true,
    unique: true
  },
  currentScore: Number,
  scoreHistory: [{
    score: Number,
    timestamp: Date,
    reason: String
  }],
  factors: {
    totalLoans: Number,
    repaidLoans: Number,
    defaultedLoans: Number,
    totalPayments: Number,
    latePayments: Number,
    accountAge: Number
  },
  tier: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Very Poor']
  }
}, { timestamps: true });

module.exports = mongoose.model('CreditHistory', creditHistorySchema);
