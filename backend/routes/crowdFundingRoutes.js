const express = require('express');
const router = express.Router();
const CrowdFunding = require('../models/CrowdFunding');
const User = require('../models/User');

// GET all campaigns with filters
router.get('/', async (req, res) => {
  try {
    const {
      status,
      category,
      creator,
      minGoal,
      maxGoal,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (creator) query.creator = creator.toLowerCase();
    if (minGoal || maxGoal) {
      query.goalAmount = {};
      if (minGoal) query.goalAmount.$gte = minGoal;
      if (maxGoal) query.goalAmount.$lte = maxGoal;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const campaigns = await CrowdFunding.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CrowdFunding.countDocuments(query);

    res.json({
      success: true,
      campaigns,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalCampaigns: total,
        hasMore: skip + campaigns.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching campaigns',
      error: error.message
    });
  }
});

// GET campaign by ID
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await CrowdFunding.findOne({ campaignId: parseInt(campaignId) });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Increment view count
    campaign.analytics.viewCount += 1;
    await campaign.save();

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching campaign',
      error: error.message
    });
  }
});

// POST create new campaign
router.post('/create', async (req, res) => {
  try {
    const {
      campaignId,
      creator,
      title,
      description,
      category,
      goalAmount,
      deadline,
      documents,
      allOrNothing,
      milestones
    } = req.body;

    // Validate required fields
    if (!campaignId || !creator || !title || !description || !category || !goalAmount || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if user is KYC verified
    const user = await User.findOne({ walletAddress: creator.toLowerCase() });
    if (!user || !user.isKYCVerified) {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required'
      });
    }

    // Check if campaign ID already exists
    const existingCampaign = await CrowdFunding.findOne({ campaignId: parseInt(campaignId) });
    if (existingCampaign) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID already exists'
      });
    }

    const newCampaign = new CrowdFunding({
      campaignId: parseInt(campaignId),
      creator: creator.toLowerCase(),
      title,
      description,
      category,
      goalAmount,
      deadline: new Date(deadline),
      documents: documents || [],
      allOrNothing: allOrNothing !== undefined ? allOrNothing : true,
      milestones: milestones || []
    });

    await newCampaign.save();

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign: newCampaign
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating campaign',
      error: error.message
    });
  }
});

// POST contribute to campaign
router.post('/:campaignId/contribute', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { contributor, amount, transactionHash } = req.body;

    if (!contributor || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const campaign = await CrowdFunding.findOne({ campaignId: parseInt(campaignId) });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check if this is a new contributor
    const existingContribution = campaign.contributors.find(
      c => c.contributor.toLowerCase() === contributor.toLowerCase()
    );

    if (!existingContribution) {
      campaign.contributorsCount += 1;
    }

    // Add contribution
    campaign.contributors.push({
      contributor: contributor.toLowerCase(),
      amount,
      transactionHash,
      timestamp: new Date()
    });

    // Update raised amount
    const currentRaised = parseFloat(campaign.raisedAmount || '0');
    const contributionAmount = parseFloat(amount);
    campaign.raisedAmount = (currentRaised + contributionAmount).toString();

    // Calculate average contribution
    const totalContributions = campaign.contributors.reduce(
      (sum, c) => sum + parseFloat(c.amount),
      0
    );
    campaign.analytics.averageContribution = (totalContributions / campaign.contributors.length).toString();

    await campaign.save();

    res.json({
      success: true,
      message: 'Contribution recorded successfully',
      campaign
    });
  } catch (error) {
    console.error('Error recording contribution:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording contribution',
      error: error.message
    });
  }
});

// POST vote for campaign approval
router.post('/:campaignId/approve', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { voter, approved } = req.body;

    if (!voter || approved === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const campaign = await CrowdFunding.findOne({ campaignId: parseInt(campaignId) });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check if already voted
    const hasVoted = campaign.approvalVotes.some(
      v => v.voter.toLowerCase() === voter.toLowerCase()
    );

    if (hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'Already voted for this campaign'
      });
    }

    // Add vote
    campaign.approvalVotes.push({
      voter: voter.toLowerCase(),
      approved,
      timestamp: new Date()
    });

    await campaign.save();

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      campaign
    });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording vote',
      error: error.message
    });
  }
});

// PUT update campaign
router.put('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updates = req.body;

    const campaign = await CrowdFunding.findOne({ campaignId: parseInt(campaignId) });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Only allow updates if campaign is pending approval or has no contributions
    if (campaign.status !== 'PENDING_APPROVAL' && campaign.contributorsCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Cannot update campaign with contributions'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'documents', 'status', 'isApproved'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        campaign[key] = updates[key];
      }
    });

    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      campaign
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating campaign',
      error: error.message
    });
  }
});

// POST release milestone
router.post('/:campaignId/milestone/:milestoneIndex/release', async (req, res) => {
  try {
    const { campaignId, milestoneIndex } = req.params;
    const { proofIpfsHash } = req.body;

    const campaign = await CrowdFunding.findOne({ campaignId: parseInt(campaignId) });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const index = parseInt(milestoneIndex);
    if (index < 0 || index >= campaign.milestones.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid milestone index'
      });
    }

    const milestone = campaign.milestones[index];
    milestone.isReleased = true;
    milestone.releaseDate = new Date();
    if (proofIpfsHash) {
      milestone.proofIpfsHash = proofIpfsHash;
    }

    await campaign.save();

    res.json({
      success: true,
      message: 'Milestone released successfully',
      milestone
    });
  } catch (error) {
    console.error('Error releasing milestone:', error);
    res.status(500).json({
      success: false,
      message: 'Error releasing milestone',
      error: error.message
    });
  }
});

// GET user's created campaigns
router.get('/user/:address/created', async (req, res) => {
  try {
    const { address } = req.params;
    const campaigns = await CrowdFunding.find({
      creator: address.toLowerCase()
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      campaigns
    });
  } catch (error) {
    console.error('Error fetching user campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user campaigns',
      error: error.message
    });
  }
});

// GET user's contributions
router.get('/user/:address/contributions', async (req, res) => {
  try {
    const { address } = req.params;
    const campaigns = await CrowdFunding.find({
      'contributors.contributor': address.toLowerCase()
    }).sort({ createdAt: -1 });

    // Calculate total contributed for each campaign
    const contributionsData = campaigns.map(campaign => {
      const userContributions = campaign.contributors.filter(
        c => c.contributor.toLowerCase() === address.toLowerCase()
      );
      const totalContributed = userContributions.reduce(
        (sum, c) => sum + parseFloat(c.amount),
        0
      );

      return {
        campaign,
        totalContributed: totalContributed.toString(),
        contributions: userContributions
      };
    });

    res.json({
      success: true,
      data: contributionsData
    });
  } catch (error) {
    console.error('Error fetching user contributions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user contributions',
      error: error.message
    });
  }
});

// GET campaign statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalCampaigns = await CrowdFunding.countDocuments();
    const activeCampaigns = await CrowdFunding.countDocuments({ status: 'ACTIVE' });
    const successfulCampaigns = await CrowdFunding.countDocuments({ status: 'SUCCESSFUL' });

    const allCampaigns = await CrowdFunding.find({});
    const totalRaised = allCampaigns.reduce(
      (sum, campaign) => sum + parseFloat(campaign.raisedAmount || '0'),
      0
    );

    const totalContributors = allCampaigns.reduce(
      (sum, campaign) => sum + campaign.contributorsCount,
      0
    );

    res.json({
      success: true,
      stats: {
        totalCampaigns,
        activeCampaigns,
        successfulCampaigns,
        totalRaised: totalRaised.toString(),
        totalContributors
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message
    });
  }
});

module.exports = router;
