const express = require('express');
const router = express.Router();
const { recordCreditEvent } = require('../services/ledgerService');
const { validateReferrer } = require('../services/referralService');

/**
 * POST /api/enroll
 * Enrolls a user and awards enrollment credits with optional referral bonus
 */
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      referrerId,
      actionType = 'enrollment',
      creditsAwarded = 100, // Default enrollment credits
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Validate referrer if provided
    if (referrerId) {
      if (referrerId === userId) {
        return res.status(400).json({
          success: false,
          error: 'Users cannot refer themselves'
        });
      }

      const isValidReferrer = await validateReferrer(referrerId);
      if (!isValidReferrer) {
        return res.status(400).json({
          success: false,
          error: 'Invalid referrer ID'
        });
      }
    }

    // Record the enrollment event
    const result = await recordCreditEvent({
      userId,
      actionType,
      creditsAwarded,
      referrerId,
      metadata: {
        ...metadata,
        enrollmentSource: 'api',
        timestamp: new Date().toISOString()
      }
    });

    // Prepare response
    const response = {
      success: true,
      userId,
      creditsAwarded,
      actionType,
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
    console.error('Enrollment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during enrollment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/enroll/batch
 * Batch enrollment for multiple users
 */
router.post('/batch', async (req, res) => {
  try {
    const { enrollments } = req.body;

    if (!Array.isArray(enrollments) || enrollments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'enrollments array is required and cannot be empty'
      });
    }

    if (enrollments.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 enrollments per batch'
      });
    }

    const results = [];
    const errors = [];

    // Process each enrollment
    for (let i = 0; i < enrollments.length; i++) {
      const enrollment = enrollments[i];
      
      try {
        const {
          userId,
          referrerId,
          actionType = 'enrollment',
          creditsAwarded = 100,
          metadata = {}
        } = enrollment;

        if (!userId) {
          errors.push({
            index: i,
            error: 'userId is required',
            enrollment
          });
          continue;
        }

        // Validate referrer if provided
        if (referrerId && referrerId !== userId) {
          const isValidReferrer = await validateReferrer(referrerId);
          if (!isValidReferrer) {
            errors.push({
              index: i,
              error: 'Invalid referrer ID',
              enrollment
            });
            continue;
          }
        }

        // Record the enrollment event
        const result = await recordCreditEvent({
          userId,
          actionType,
          creditsAwarded,
          referrerId: referrerId && referrerId !== userId ? referrerId : null,
          metadata: {
            ...metadata,
            enrollmentSource: 'batch_api',
            batchIndex: i,
            timestamp: new Date().toISOString()
          }
        });

        results.push({
          index: i,
          success: true,
          userId,
          creditsAwarded,
          eventId: result.event._id,
          referralBonus: result.referralProcessing?.bonusAwarded || 0
        });

      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
          enrollment
        });
      }
    }

    res.status(200).json({
      success: true,
      processed: results.length,
      errors: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Batch enrollment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during batch enrollment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 