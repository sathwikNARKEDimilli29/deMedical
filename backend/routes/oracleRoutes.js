/**
 * Oracle API Routes
 * Endpoints for claim verification via oracles
 */

const express = require('express');
const router = express.Router();
const oracleService = require('../services/oracleService');

/**
 * POST /api/oracle/verify-claim
 * Request claim verification
 */
router.post('/verify-claim', async (req, res) => {
    try {
        const { claimId, ipfsHash, method } = req.body;

        if (!claimId || !ipfsHash) {
            return res.status(400).json({
                error: 'Missing required fields: claimId, ipfsHash'
            });
        }

        const result = await oracleService.requestVerification(
            claimId,
            ipfsHash,
            method || 'simulation'
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Oracle verification error:', error);
        res.status(500).json({
            error: 'Failed to request verification',
            message: error.message
        });
    }
});

/**
 * GET /api/oracle/verification-status/:claimId
 * Get verification status for a claim
 */
router.get('/verification-status/:claimId', async (req, res) => {
    try {
        const { claimId } = req.params;

        const status = await oracleService.getVerificationStatus(claimId);

        res.json({
            success: true,
            ...status
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: 'Failed to get verification status',
            message: error.message
        });
    }
});

/**
 * POST /api/oracle/simulate-verification
 * Admin endpoint to manually verify claim in simulation mode
 */
router.post('/simulate-verification', async (req, res) => {
    try {
        const { claimId, isVerified, proof } = req.body;

        if (!claimId || isVerified === undefined) {
            return res.status(400).json({
                error: 'Missing required fields: claimId, isVerified'
            });
        }

        const result = await oracleService.simulateManualVerification(
            claimId,
            isVerified,
            proof
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Simulation error:', error);
        res.status(500).json({
            error: 'Failed to simulate verification',
            message: error.message
        });
    }
});

/**
 * POST /api/oracle/webhook
 * Chainlink oracle callback endpoint
 * Called by Chainlink node when verification completes
 */
router.post('/webhook', async (req, res) => {
    try {
        const { requestId, data } = req.body;

        // In production, verify request is from authorized Chainlink node
        // using signature or API key

        const result = await oracleService.handleChainlinkCallback(requestId, data);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({
            error: 'Failed to process webhook',
            message: error.message
        });
    }
});

module.exports = router;
