const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  loanId: {
    type: Number,
    required: true,
    unique: true
  },
  borrower: String,
  principal: String,
  interestRate: Number,
  duration: Number,
  amountRepaid: String,
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'REPAID', 'DEFAULTED']
  },
  purpose: String,
  documents: String, // IPFS hash
  startDate: Date,
  dueDate: Date,
  repayments: [{
    amount: String,
    timestamp: Date,
    onTime: Boolean
  }]
}, { timestamps: true });

module.exports = mongoose.model('Loan', loanSchema);
