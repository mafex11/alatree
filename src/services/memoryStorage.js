// In-memory storage for development/demo purposes
class MemoryStorage {
  constructor() {
    this.creditEvents = [];
    this.idCounter = 1;
  }

  // Create a new credit event
  createEvent(eventData) {
    const event = {
      _id: `event_${this.idCounter++}`,
      id: `event_${this.idCounter - 1}`,
      userId: eventData.userId,
      actionType: eventData.actionType,
      creditsAwarded: eventData.creditsAwarded,
      referrerBonus: eventData.referrerBonus || 0,
      referrerId: eventData.referrerId || null,
      timestamp: new Date(),
      metadata: eventData.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.creditEvents.push(event);
    return event;
  }

  // Find events by query
  findEvents(query = {}) {
    return this.creditEvents.filter(event => {
      for (const [key, value] of Object.entries(query)) {
        if (key === 'timestamp' && typeof value === 'object') {
          const eventTime = new Date(event.timestamp);
          if (value.$gte && eventTime < new Date(value.$gte)) return false;
          if (value.$lte && eventTime > new Date(value.$lte)) return false;
        } else if (event[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  // Find one event
  findOne(query) {
    return this.findEvents(query)[0] || null;
  }

  // Get all events for a user
  getUserEvents(userId) {
    return this.findEvents({ userId }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Count documents
  countDocuments(query = {}) {
    return this.findEvents(query).length;
  }

  // Get distinct values
  distinct(field) {
    const values = new Set();
    this.creditEvents.forEach(event => {
      if (event[field]) values.add(event[field]);
    });
    return Array.from(values);
  }

  // Aggregate operations for stats
  aggregate(pipeline) {
    // Simplified aggregation for common use cases
    let result = [...this.creditEvents];
    
    for (const stage of pipeline) {
      if (stage.$group) {
        if (stage.$group._id === null) {
          // Total aggregation
          const totalCredits = result.reduce((sum, event) => sum + event.creditsAwarded, 0);
          const totalEvents = result.length;
          result = [{ _id: null, totalCredits, totalEvents }];
        } else if (stage.$group._id === '$actionType') {
          // Group by action type
          const groups = {};
          result.forEach(event => {
            if (!groups[event.actionType]) {
              groups[event.actionType] = { _id: event.actionType, totalCredits: 0, eventCount: 0 };
            }
            groups[event.actionType].totalCredits += event.creditsAwarded;
            groups[event.actionType].eventCount += 1;
          });
          result = Object.values(groups);
        }
      }
      
      if (stage.$sort) {
        const sortField = Object.keys(stage.$sort)[0];
        const sortOrder = stage.$sort[sortField];
        result.sort((a, b) => {
          if (sortOrder === 1) return a[sortField] - b[sortField];
          return b[sortField] - a[sortField];
        });
      }
    }
    
    return result;
  }

  // Clear all data
  clear() {
    this.creditEvents = [];
    this.idCounter = 1;
  }

  // Get stats
  getStats() {
    const totalCredits = this.creditEvents.reduce((sum, event) => sum + event.creditsAwarded, 0);
    const totalEvents = this.creditEvents.length;
    const uniqueUsers = this.distinct('userId').length;
    
    // Recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = this.creditEvents.filter(event => 
      new Date(event.timestamp) >= oneDayAgo
    ).length;

    // Credits by action
    const creditsByAction = {};
    this.creditEvents.forEach(event => {
      if (!creditsByAction[event.actionType]) {
        creditsByAction[event.actionType] = { totalCredits: 0, eventCount: 0 };
      }
      creditsByAction[event.actionType].totalCredits += event.creditsAwarded;
      creditsByAction[event.actionType].eventCount += 1;
    });

    return {
      totalCredits,
      totalEvents,
      uniqueUsers,
      recentActivity,
      creditsByAction
    };
  }
}

// Singleton instance
const memoryStorage = new MemoryStorage();

// Seed with some initial data for demo
memoryStorage.createEvent({
  userId: 'demo_user_1',
  actionType: 'enrollment',
  creditsAwarded: 100,
  referrerBonus: 0,
  metadata: { source: 'initial_seed' }
});

memoryStorage.createEvent({
  userId: 'demo_user_2',
  actionType: 'enrollment',
  creditsAwarded: 100,
  referrerBonus: 0,
  metadata: { source: 'initial_seed' }
});

memoryStorage.createEvent({
  userId: 'demo_user_1',
  actionType: 'referral_bonus',
  creditsAwarded: 20,
  referrerBonus: 0,
  metadata: { source: 'initial_seed', triggeredBy: 'demo_user_3' }
});

module.exports = memoryStorage; 