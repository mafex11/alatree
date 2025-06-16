const CreditEvent = require('../models/CreditEvent');
const { processReferralBonus } = require('./referralService');

/**
 * Records a credit event in the ledger
 * @param {Object} eventData - Credit event data
 * @param {string} eventData.userId - User ID receiving credits
 * @param {string} eventData.actionType - Type of action performed
 * @param {number} eventData.creditsAwarded - Number of credits awarded
 * @param {string} [eventData.referrerId] - Optional referrer ID
 * @param {Object} [eventData.metadata] - Optional metadata
 * @returns {Promise<Object>} - Created event and referral processing result
 */
async function recordCreditEvent(eventData) {
  try {
    const { userId, actionType, creditsAwarded, referrerId, metadata = {} } = eventData;

    // Validate required fields
    if (!userId || !actionType || creditsAwarded === undefined) {
      throw new Error('Missing required fields: userId, actionType, creditsAwarded');
    }

    if (creditsAwarded < 0) {
      throw new Error('Credits awarded cannot be negative');
    }

    // Calculate referrer bonus if referrerId is provided
    let referrerBonus = 0;
    let referralResult = null;

    if (referrerId && referrerId !== userId) {
      referralResult = await processReferralBonus(referrerId, actionType, creditsAwarded, userId);
      referrerBonus = referralResult.bonusAwarded || 0;
    }

    // Create the main credit event
    const creditEvent = new CreditEvent({
      userId,
      actionType,
      creditsAwarded,
      referrerBonus,
      referrerId: referrerId || null,
      metadata
    });

    const savedEvent = await creditEvent.save();

    return {
      success: true,
      event: savedEvent,
      referralProcessing: referralResult,
      message: `Credit event recorded: ${creditsAwarded} credits awarded to ${userId}`
    };

  } catch (error) {
    console.error('Error recording credit event:', error);
    throw error;
  }
}

/**
 * Gets total credits for a specific user
 * @param {string} userId - User ID to get credits for
 * @returns {Promise<Object>} - User's credit summary
 */
async function getUserCreditTotal(userId) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get all credit events for the user
    const events = await CreditEvent.find({ userId }).sort({ timestamp: -1 });

    // Calculate total credits
    const totalCredits = events.reduce((sum, event) => sum + event.creditsAwarded, 0);

    // Get breakdown by action type
    const creditsByAction = events.reduce((breakdown, event) => {
      const action = event.actionType;
      if (!breakdown[action]) {
        breakdown[action] = { count: 0, totalCredits: 0 };
      }
      breakdown[action].count += 1;
      breakdown[action].totalCredits += event.creditsAwarded;
      return breakdown;
    }, {});

    return {
      userId,
      totalCredits,
      totalEvents: events.length,
      creditsByAction,
      lastActivity: events.length > 0 ? events[0].timestamp : null,
      recentEvents: events.slice(0, 10) // Last 10 events
    };

  } catch (error) {
    console.error('Error getting user credit total:', error);
    throw error;
  }
}

/**
 * Gets credit events with filtering and pagination
 * @param {Object} filters - Filter options
 * @param {string} [filters.userId] - Filter by user ID
 * @param {string} [filters.actionType] - Filter by action type
 * @param {string} [filters.referrerId] - Filter by referrer ID
 * @param {Date} [filters.startDate] - Filter events after this date
 * @param {Date} [filters.endDate] - Filter events before this date
 * @param {number} [filters.limit] - Limit number of results (default: 50)
 * @param {number} [filters.skip] - Skip number of results (default: 0)
 * @returns {Promise<Object>} - Filtered credit events
 */
async function getCreditEvents(filters = {}) {
  try {
    const {
      userId,
      actionType,
      referrerId,
      startDate,
      endDate,
      limit = 50,
      skip = 0
    } = filters;

    // Build query object
    const query = {};
    
    if (userId) query.userId = userId;
    if (actionType) query.actionType = actionType;
    if (referrerId) query.referrerId = referrerId;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const events = await CreditEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(Math.min(limit, 100)) // Cap at 100 for performance
      .skip(skip);

    // Get total count for pagination
    const totalCount = await CreditEvent.countDocuments(query);

    return {
      events,
      pagination: {
        totalCount,
        limit,
        skip,
        hasMore: (skip + events.length) < totalCount
      }
    };

  } catch (error) {
    console.error('Error getting credit events:', error);
    throw error;
  }
}

/**
 * Gets system-wide credit statistics
 * @returns {Promise<Object>} - System credit statistics
 */
async function getSystemStats() {
  try {
    // Total credits awarded across all users
    const totalCreditsResult = await CreditEvent.aggregate([
      {
        $group: {
          _id: null,
          totalCredits: { $sum: '$creditsAwarded' },
          totalEvents: { $sum: 1 }
        }
      }
    ]);

    // Credits by action type
    const creditsByActionResult = await CreditEvent.aggregate([
      {
        $group: {
          _id: '$actionType',
          totalCredits: { $sum: '$creditsAwarded' },
          eventCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalCredits: -1 }
      }
    ]);

    // Unique active users
    const uniqueUsersResult = await CreditEvent.distinct('userId');

    // Recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await CreditEvent.countDocuments({
      timestamp: { $gte: oneDayAgo }
    });

    const totalCredits = totalCreditsResult.length > 0 ? totalCreditsResult[0].totalCredits : 0;
    const totalEvents = totalCreditsResult.length > 0 ? totalCreditsResult[0].totalEvents : 0;

    return {
      totalCredits,
      totalEvents,
      uniqueUsers: uniqueUsersResult.length,
      recentActivity,
      creditsByAction: creditsByActionResult.reduce((acc, item) => {
        acc[item._id] = {
          totalCredits: item.totalCredits,
          eventCount: item.eventCount
        };
        return acc;
      }, {})
    };

  } catch (error) {
    console.error('Error getting system stats:', error);
    throw error;
  }
}

/**
 * Bulk insert credit events (useful for migrations or batch operations)
 * @param {Array} events - Array of credit event objects
 * @returns {Promise<Object>} - Bulk insert result
 */
async function bulkRecordEvents(events) {
  try {
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error('Events array is required and cannot be empty');
    }

    // Validate each event
    const validatedEvents = events.map(event => {
      const { userId, actionType, creditsAwarded, referrerId, metadata = {} } = event;
      
      if (!userId || !actionType || creditsAwarded === undefined) {
        throw new Error('Each event must have userId, actionType, and creditsAwarded');
      }

      return {
        userId,
        actionType,
        creditsAwarded,
        referrerBonus: 0, // Bulk operations don't process referrals
        referrerId: referrerId || null,
        metadata,
        timestamp: event.timestamp || new Date()
      };
    });

    const result = await CreditEvent.insertMany(validatedEvents, { ordered: false });

    return {
      success: true,
      insertedCount: result.length,
      insertedIds: result.map(doc => doc._id)
    };

  } catch (error) {
    console.error('Error bulk recording events:', error);
    throw error;
  }
}

module.exports = {
  recordCreditEvent,
  getUserCreditTotal,
  getCreditEvents,
  getSystemStats,
  bulkRecordEvents
}; 