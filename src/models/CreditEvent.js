const mongoose = require('mongoose');

const creditEventSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  actionType: {
    type: String,
    required: true,
    enum: ['enrollment', 'referral_bonus', 'social_post', 'tech_module', 'spend_multiplier', 'coffee_wall', 'other']
  },
  creditsAwarded: {
    type: Number,
    required: true,
    min: 0
  },
  referrerBonus: {
    type: Number,
    default: 0,
    min: 0
  },
  referrerId: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient queries
creditEventSchema.index({ userId: 1, timestamp: -1 });
creditEventSchema.index({ referrerId: 1, timestamp: -1 });

const CreditEvent = mongoose.model('CreditEvent', creditEventSchema);

module.exports = CreditEvent; 