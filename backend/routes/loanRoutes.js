const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');

router.get('/', async (req, res) => {
  try {
    const { borrower } = req.query;
    let query = {};
    if (borrower) query.borrower = borrower.toLowerCase();
    
    const loans = await Loan.find(query).sort({ createdAt: -1 });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

router.post('/', async (req, res) => {
  try {
    const loan = new Loan(req.body);
    await loan.save();
    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

router.put('/:loanId', async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { loanId: req.params.loanId },
      req.body,
      { new: true }
    );
    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

module.exports = router;
