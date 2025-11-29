const mongoose = require('mongoose');

const bugReportSchema = new mongoose.Schema({
  reportId: {
    type: Number,
    required: true,
    unique: true
  },
  researcher: {
    type: String,
    required: true,
    lowercase: true
  },
  title: {
    type: String,
    required: true
  },
  ipfsHash: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true
  },
  status: {
    type: String,
    enum: ['SUBMITTED', 'TRIAGED', 'VERIFIED', 'REJECTED', 'PAID'],
    default: 'SUBMITTED'
  },
  reward: {
    type: Number,
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  },
  adminNotes: {
    type: String
  },
  rejectionReason: {
    type: String
  },
  publiclyDisclosed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const researcherSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  totalReports: {
    type: Number,
    default: 0
  },
  validReports: {
    type: Number,
    default: 0
  },
  totalRewards: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const BugReport = mongoose.model('BugReport', bugReportSchema);
const Researcher = mongoose.model('Researcher', researcherSchema);

module.exports = { BugReport, Researcher };
