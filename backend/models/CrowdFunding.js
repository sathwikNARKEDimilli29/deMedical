const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  amount: {
    type: String,
    required: true
  },
  isReleased: {
    type: Boolean,
    default: false
  },
  releaseDate: {
    type: Date
  },
  proofIpfsHash: {
    type: String
  }
});

const contributionSchema = new mongoose.Schema({
  contributor: {
    type: String,
    required: true
  },
  amount: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  transactionHash: {
    type: String
  },
  refunded: {
    type: Boolean,
    default: false
  }
});

const approvalVoteSchema = new mongoose.Schema({
  voter: {
    type: String,
    required: true
  },
  approved: {
    type: Boolean,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const crowdFundingSchema = new mongoose.Schema({
  campaignId: {
    type: Number,
    required: true,
    unique: true
  },
  creator: {
    type: String,
    required: true,
    lowercase: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['SURGERY', 'TREATMENT', 'MEDICATION', 'EMERGENCY', 'THERAPY', 'DIAGNOSTICS', 'OTHER'],
    required: true
  },
  goalAmount: {
    type: String,
    required: true
  },
  raisedAmount: {
    type: String,
    default: '0'
  },
  deadline: {
    type: Date,
    required: true
  },
  documents: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'ACTIVE', 'SUCCESSFUL', 'FAILED', 'CANCELLED'],
    default: 'PENDING_APPROVAL'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  allOrNothing: {
    type: Boolean,
    default: true
  },
  milestones: [milestoneSchema],
  contributors: [contributionSchema],
  contributorsCount: {
    type: Number,
    default: 0
  },
  approvalVotes: [approvalVoteSchema],
  analytics: {
    viewCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    averageContribution: {
      type: String,
      default: '0'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
crowdFundingSchema.index({ campaignId: 1 });
crowdFundingSchema.index({ creator: 1 });
crowdFundingSchema.index({ status: 1 });
crowdFundingSchema.index({ category: 1 });
crowdFundingSchema.index({ deadline: 1 });

module.exports = mongoose.model('CrowdFunding', crowdFundingSchema);
