const express = require('express');
const router = express.Router();
const { BugReport, Researcher } = require('../models/BugBounty');
const RewardConfig = require('../models/RewardConfig');

// Default rewards configuration
const DEFAULT_REWARDS = [
  { severity: 'CRITICAL', amount: '25 ETH', amountUSD: '~$50,000', color: 'red', icon: '🔴' },
  { severity: 'HIGH', amount: '5 ETH', amountUSD: '~$10,000', color: 'orange', icon: '🟠' },
  { severity: 'MEDIUM', amount: '2.5 ETH', amountUSD: '~$5,000', color: 'yellow', icon: '🟡' },
  { severity: 'LOW', amount: '0.5 ETH', amountUSD: '~$1,000', color: 'blue', icon: '🔵' },
  { severity: 'INFORMATIONAL', amount: '0.1 ETH', amountUSD: '~$200', color: 'gray', icon: '⚪' }
];

// Initialize default rewards if not exists
const initializeRewards = async () => {
  try {
    const count = await RewardConfig.countDocuments();
    if (count === 0) {
      await RewardConfig.insertMany(DEFAULT_REWARDS);
      console.log('Default bug bounty rewards initialized');
    }
  } catch (error) {
    console.error('Error initializing rewards:', error);
  }
};

// Run initialization
initializeRewards();

// Get reward configuration
router.get('/config', async (req, res) => {
  try {
    const config = await RewardConfig.find({});
    // Sort by severity importance for display order
    const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, 'INFORMATIONAL': 4 };
    const sortedConfig = config.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    res.json({ config: sortedConfig });
  } catch (error) {
    console.error('Error fetching reward config:', error);
    res.status(500).json({ error: 'Failed to fetch reward configuration' });
  }
});

// Update reward configuration (admin only)
router.put('/config', async (req, res) => {
  try {
    const { updates } = req.body; // Array of { severity, amount, amountUSD }
    
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'Invalid updates format' });
    }

    const results = [];
    for (const update of updates) {
      const { severity, amount, amountUSD } = update;
      if (severity) {
        const result = await RewardConfig.findOneAndUpdate(
          { severity },
          { 
            $set: { 
              ...(amount && { amount }),
              ...(amountUSD && { amountUSD })
            } 
          },
          { new: true }
        );
        results.push(result);
      }
    }
    
    res.json({ message: 'Rewards updated successfully', config: results });
  } catch (error) {
    console.error('Error updating reward config:', error);
    res.status(500).json({ error: 'Failed to update reward configuration' });
  }
});

// Register as security researcher
router.post('/register', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    // Check if already registered
    const existing = await Researcher.findOne({ address: address.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Already registered as researcher' });
    }
    
    const researcher = new Researcher({
      address: address.toLowerCase()
    });
    
    await researcher.save();
    
    res.status(201).json({
      message: 'Researcher registered successfully',
      researcher
    });
  } catch (error) {
    console.error('Error registering researcher:', error);
    res.status(500).json({ error: 'Failed to register researcher' });
  }
});

// Submit bug report
router.post('/report', async (req, res) => {
  try {
    const { reportId, researcher, title, ipfsHash, severity } = req.body;
    
    if (!reportId || !researcher || !title || !ipfsHash || !severity) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    // Verify researcher is registered
    const researcherDoc = await Researcher.findOne({ address: researcher.toLowerCase() });
    if (!researcherDoc || !researcherDoc.isActive) {
      return res.status(403).json({ error: 'Must be registered researcher' });
    }
    
    const report = new BugReport({
      reportId,
      researcher: researcher.toLowerCase(),
      title,
      ipfsHash,
      severity
    });
    
    await report.save();
    
    // Update researcher stats
    researcherDoc.totalReports += 1;
    await researcherDoc.save();
    
    res.status(201).json({
      message: 'Bug report submitted successfully',
      report
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Get all reports (with filters)
router.get('/reports', async (req, res) => {
  try {
    const { status, severity, researcher } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (researcher) filter.researcher = researcher.toLowerCase();
    
    const reports = await BugReport.find(filter).sort({ submittedAt: -1 });
    
    res.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get specific report
router.get('/reports/:id', async (req, res) => {
  try {
    const report = await BugReport.findOne({ reportId: req.params.id });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({ report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Get researcher profile
router.get('/researcher/:address', async (req, res) => {
  try {
    const researcher = await Researcher.findOne({ 
      address: req.params.address.toLowerCase() 
    });
    
    if (!researcher) {
      return res.status(404).json({ error: 'Researcher not found' });
    }
    
    // Get researcher's reports
    const reports = await BugReport.find({ 
      researcher: req.params.address.toLowerCase() 
    }).sort({ submittedAt: -1 });
    
    res.json({ researcher, reports });
  } catch (error) {
    console.error('Error fetching researcher:', error);
    res.status(500).json({ error: 'Failed to fetch researcher' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const topResearchers = await Researcher.find({ isActive: true })
      .sort({ totalRewards: -1, validReports: -1 })
      .limit(limit);
    
    res.json({ leaderboard: topResearchers });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ===== ADMIN ROUTES =====

// Triage report (admin only)
router.put('/reports/:id/triage', async (req, res) => {
  try {
    const { severity, notes } = req.body;
    
    const report = await BugReport.findOne({ reportId: req.params.id });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    if (report.status !== 'SUBMITTED') {
      return res.status(400).json({ error: 'Report already triaged' });
    }
    
    report.severity = severity || report.severity;
    report.status = 'TRIAGED';
    report.adminNotes = notes;
    
    await report.save();
    
    res.json({ message: 'Report triaged successfully', report });
  } catch (error) {
    console.error('Error triaging report:', error);
    res.status(500).json({ error: 'Failed to triage report' });
  }
});

// Verify report (admin only)
router.put('/reports/:id/verify', async (req, res) => {
  try {
    const { reward } = req.body;
    
    const report = await BugReport.findOne({ reportId: req.params.id });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    if (report.status !== 'TRIAGED') {
      return res.status(400).json({ error: 'Report must be triaged first' });
    }
    
    report.status = 'VERIFIED';
    report.reward = reward;
    
    await report.save();
    
    // Update researcher stats
    const researcher = await Researcher.findOne({ address: report.researcher });
    if (researcher) {
      researcher.validReports += 1;
      await researcher.save();
    }
    
    res.json({ message: 'Report verified successfully', report });
  } catch (error) {
    console.error('Error verifying report:', error);
    res.status(500).json({ error: 'Failed to verify report' });
  }
});

// Reject report (admin only)
router.put('/reports/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    
    const report = await BugReport.findOne({ reportId: req.params.id });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    report.status = 'REJECTED';
    report.rejectionReason = reason;
    report.resolvedAt = new Date();
    
    await report.save();
    
    res.json({ message: 'Report rejected', report });
  } catch (error) {
    console.error('Error rejecting report:', error);
    res.status(500).json({ error: 'Failed to reject report' });
  }
});

// Mark as paid (admin only)
router.post('/reports/:id/pay', async (req, res) => {
  try {
    const report = await BugReport.findOne({ reportId: req.params.id });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    if (report.status !== 'VERIFIED') {
      return res.status(400).json({ error: 'Report must be verified first' });
    }
    
    report.status = 'PAID';
    report.resolvedAt = new Date();
    
    await report.save();
    
    // Update researcher total rewards
    const researcher = await Researcher.findOne({ address: report.researcher });
    if (researcher) {
      researcher.totalRewards += report.reward;
      await researcher.save();
    }
    
    res.json({ message: 'Reward paid successfully', report });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Publish disclosure (admin only)
router.post('/reports/:id/disclose', async (req, res) => {
  try {
    const report = await BugReport.findOne({ reportId: req.params.id });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    if (report.status !== 'PAID') {
      return res.status(400).json({ error: 'Report must be paid before disclosure' });
    }
    
    report.publiclyDisclosed = true;
    await report.save();
    
    res.json({ message: 'Report disclosed publicly', report });
  } catch (error) {
    console.error('Error disclosing report:', error);
    res.status(500).json({ error: 'Failed to disclose report' });
  }
});

module.exports = router;
