const express = require('express');
const router = express.Router();
const { getUserCreditTotal, getCreditEvents, getSystemStats } = require('../services/ledgerService');
const { getReferralBonusSummary } = require('../services/referralService');

/**
 * GET /api/credits/:userId
 * Gets credit totals and summary for a specific user
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { includeEvents = 'false', includeReferrals = 'false' } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Get user credit totals
    const creditSummary = await getUserCreditTotal(userId);

    const response = {
      success: true,
      ...creditSummary
    };

    // Include detailed events if requested
    if (includeEvents === 'true') {
      const eventsData = await getCreditEvents({
        userId,
        limit: 50
      });
      response.detailedEvents = eventsData.events;
      response.pagination = eventsData.pagination;
    }

    // Include referral summary if requested
    if (includeReferrals === 'true') {
      try {
        const referralSummary = await getReferralBonusSummary(userId);
        response.referralSummary = referralSummary;
      } catch (error) {
        // Non-critical error, continue without referral data
        console.warn('Could not fetch referral summary for user:', userId, error.message);
      }
    }

    res.json(response);

  } catch (error) {
    console.error('Error getting user credits:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching credits',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/credits/:userId/events
 * Gets paginated credit events for a specific user
 */
router.get('/:userId/events', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      actionType,
      startDate,
      endDate,
      limit = 20,
      skip = 0
    } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Build filters
    const filters = {
      userId,
      limit: Math.min(parseInt(limit), 100), // Cap at 100
      skip: parseInt(skip)
    };

    if (actionType) filters.actionType = actionType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await getCreditEvents(filters);

    res.json({
      success: true,
      userId,
      ...result
    });

  } catch (error) {
    console.error('Error getting user credit events:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching credit events',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/credits/:userId/referrals
 * Gets referral bonus summary for a specific user
 */
router.get('/:userId/referrals', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const referralSummary = await getReferralBonusSummary(userId);

    res.json({
      success: true,
      userId,
      ...referralSummary
    });

  } catch (error) {
    console.error('Error getting referral summary:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching referral data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/credits/system/stats
 * Gets system-wide credit statistics (admin endpoint)
 */
router.get('/system/stats', async (req, res) => {
  try {
    const stats = await getSystemStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...stats
    });

  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching system statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/credits
 * Award credits for various actions (general endpoint)
 */
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      actionType,
      creditsAwarded,
      referrerId,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!userId || !actionType || creditsAwarded === undefined) {
      return res.status(400).json({
        success: false,
        error: 'userId, actionType, and creditsAwarded are required'
      });
    }

    if (creditsAwarded < 0) {
      return res.status(400).json({
        success: false,
        error: 'Credits awarded cannot be negative'
      });
    }

    // Valid action types
    const validActionTypes = [
      'enrollment', 'social_post', 'tech_module', 
      'spend_multiplier', 'coffee_wall', 'other'
    ];

    if (!validActionTypes.includes(actionType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action type',
        validTypes: validActionTypes
      });
    }

    // Record the credit event using ledger service
    const { recordCreditEvent } = require('../services/ledgerService');
    
    const result = await recordCreditEvent({
      userId,
      actionType,
      creditsAwarded,
      referrerId,
      metadata: {
        ...metadata,
        source: 'direct_api',
        timestamp: new Date().toISOString()
      }
    });

    // Prepare response
    const response = {
      success: true,
      userId,
      actionType,
      creditsAwarded,
      eventId: result.event._id,
      message: result.message
    };

    // Include referral information if applicable
    if (result.referralProcessing) {
      response.referral = {
        referrerId,
        bonusAwarded: result.referralProcessing.bonusAwarded,
        bonusMessage: result.referralProcessing.message
      };
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Error awarding credits:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while awarding credits',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 