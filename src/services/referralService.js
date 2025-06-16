const CreditEvent = require('../models/CreditEvent');

/**
 * Calculates referral bonus based on action type
 * @param {string} actionType - The type of action that triggered the referral
 * @param {number} baseCredits - Base credits awarded for the action
 * @returns {number} - Bonus credits for the referrer
 */
function calculateReferralBonus(actionType, baseCredits) {
  const bonusMultipliers = {
    'enrollment': 0.2, // 20% bonus for referrer on new enrollments
    'social_post': 0.1, // 10% bonus
    'tech_module': 0.15, // 15% bonus
    'spend_multiplier': 0.25, // 25% bonus
    'coffee_wall': 0.05, // 5% bonus
    'other': 0.1 // Default 10% bonus
  };
  
  const multiplier = bonusMultipliers[actionType] || bonusMultipliers['other'];
  return Math.floor(baseCredits * multiplier);
}

/**
 * Processes referral bonus when a referrerId is provided
 * @param {string} referrerId - ID of the user who made the referral
 * @param {string} actionType - Type of action performed by referred user
 * @param {number} baseCredits - Credits awarded for the base action
 * @param {string} newUserId - ID of the user who was referred
 * @returns {Promise<Object>} - Referral processing result
 */
async function processReferralBonus(referrerId, actionType, baseCredits, newUserId) {
  try {
    if (!referrerId || !actionType || !baseCredits || !newUserId) {
      throw new Error('Missing required parameters for referral processing');
    }

    // Calculate bonus credits for referrer
    const bonusCredits = calculateReferralBonus(actionType, baseCredits);
    
    if (bonusCredits <= 0) {
      return {
        success: true,
        bonusAwarded: 0,
        message: 'No bonus credits applicable for this action type'
      };
    }

    // Create referral bonus event for the referrer
    const referralEvent = new CreditEvent({
      userId: referrerId,
      actionType: 'referral_bonus',
      creditsAwarded: bonusCredits,
      referrerBonus: 0, // This is the bonus event itself
      referrerId: null, // Referrer doesn't have a referrer for this bonus
      metadata: {
        triggeredBy: newUserId,
        originalAction: actionType,
        originalCredits: baseCredits
      }
    });

    await referralEvent.save();

    return {
      success: true,
      bonusAwarded: bonusCredits,
      referralEventId: referralEvent._id,
      message: `Referral bonus of ${bonusCredits} credits awarded to ${referrerId}`
    };

  } catch (error) {
    console.error('Error processing referral bonus:', error);
    return {
      success: false,
      bonusAwarded: 0,
      error: error.message
    };
  }
}

/**
 * Validates if a referrer ID exists and is eligible for bonuses
 * @param {string} referrerId - ID of the potential referrer
 * @returns {Promise<boolean>} - Whether referrer is valid
 */
async function validateReferrer(referrerId) {
  try {
    if (!referrerId) return false;
    
    // Check if referrer has any credit history (indicating they're a valid user)
    const referrerHistory = await CreditEvent.findOne({ userId: referrerId });
    return !!referrerHistory;
  } catch (error) {
    console.error('Error validating referrer:', error);
    return false;
  }
}

/**
 * Gets total referral bonuses earned by a user
 * @param {string} userId - ID of the user
 * @returns {Promise<Object>} - Referral bonus summary
 */
async function getReferralBonusSummary(userId) {
  try {
    const bonusEvents = await CreditEvent.find({
      userId: userId,
      actionType: 'referral_bonus'
    }).sort({ timestamp: -1 });

    const totalBonusCredits = bonusEvents.reduce((sum, event) => sum + event.creditsAwarded, 0);
    const totalReferrals = bonusEvents.length;

    return {
      totalBonusCredits,
      totalReferrals,
      recentBonuses: bonusEvents.slice(0, 10) // Last 10 bonus events
    };
  } catch (error) {
    console.error('Error getting referral bonus summary:', error);
    throw error;
  }
}

module.exports = {
  calculateReferralBonus,
  processReferralBonus,
  validateReferrer,
  getReferralBonusSummary
}; 