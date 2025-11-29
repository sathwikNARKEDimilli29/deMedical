const express = require('express');
const router = express.Router();

// Simple AI assistant responses
const aiResponses = {
  greeting: "Hello! I'm your De-Medical AI assistant. I can help you with insurance pools, claims, loans, and payment plans. How can I assist you today?",
  pools: "I can help you find the right insurance pool! We have Health, Life, Accident, and Critical Illness pools. Each pool allows members to contribute proportionally and receive proportional claims. What type of coverage are you looking for?",
  claims: "To submit a claim, you'll need to:\n1. Be an active member of a pool\n2. Upload supporting medical documents\n3. Get approval from other pool members (60% threshold)\n\nWould you like me to guide you through the process?",
  loans: "Our micro-loans for healthcare are based on your credit score. Better scores get lower interest rates (5-25% APR). Loans range from 0.01 to 10 ETH with 7-365 day terms. Check your credit score to see what you qualify for!",
  credit: "Your credit score (300-900) is calculated based on:\n- Loan repayment history (40%)\n- Payment punctuality (30%)\n- Credit history length (20%)\n- Total successful loans (10%)\n\nMaintaining good payment habits will improve your score!",
  bnpl: "Buy Now Pay Later lets you split medical expenses into 2-12 monthly installments. Interest rates depend on your credit score (3-15%). You'll need a credit score of at least 450 to qualify.",
  snpl: "Save Now Pay Later helps you save for future medical expenses! Set a target amount and monthly deposit for 3-24 months. Once you reach your goal, withdraw the funds for your medical needs."
};

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const lowerMessage = message.toLowerCase();
    
    let response = "I'm here to help! You can ask me about insurance pools, claims, loans, credit scores, BNPL, or SNPL.";
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = aiResponses.greeting;
    } else if (lowerMessage.includes('pool') || lowerMessage.includes('insurance')) {
      response = aiResponses.pools;
    } else if (lowerMessage.includes('claim')) {
      response = aiResponses.claims;
    } else if (lowerMessage.includes('loan')) {
      response = aiResponses.loans;
    } else if (lowerMessage.includes('credit') || lowerMessage.includes('score')) {
      response = aiResponses.credit;
    } else if (lowerMessage.includes('bnpl') || lowerMessage.includes('buy now')) {
      response = aiResponses.bnpl;
    } else if (lowerMessage.includes('snpl') || lowerMessage.includes('save now')) {
      response = aiResponses.snpl;
    }
    
    res.json({ 
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Get recommendations based on user data
router.post('/recommend', async (req, res) => {
  try {
    const { creditScore, hasLoans, poolMemberships } = req.body;
    
    const recommendations = [];
    
    if (!poolMemberships || poolMemberships.length === 0) {
      recommendations.push({
        type: 'pool',
        title: 'Join an Insurance Pool',
        description: 'Start with a Health Insurance pool to get coverage with proportional contributions.',
        priority: 'high'
      });
    }
    
    if (creditScore < 600) {
      recommendations.push({
        type: 'credit',
        title: 'Improve Your Credit Score',
        description: 'Make on-time payments to increase your score and qualify for better loan rates.',
        priority: 'medium'
      });
    }
    
    if (!hasLoans && creditScore >= 450) {
      recommendations.push({
        type: 'loan',
        title: 'Healthcare Micro-Loan Available',
        description: `With your credit score of ${creditScore}, you qualify for loans at competitive rates.`,
        priority: 'low'
      });
    }
    
    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

module.exports = router;
