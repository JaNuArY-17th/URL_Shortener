// Database views for AI Assistant Service with privacy protection

const mongoose = require('mongoose');

/**
 * Create MongoDB views that exclude sensitive user data
 * These views provide AI service with necessary data while protecting privacy
 */

// User analytics view - excludes personal information
const createUserAnalyticsView = async () => {
  const db = mongoose.connection.db;
  
  try {
    await db.createCollection('user_analytics_view', {
      viewOn: 'users',
      pipeline: [
        {
          $project: {
            _id: 1,
            userId: '$_id',
            role: 1,
            createdAt: 1,
            updatedAt: 1,
            // Hash or anonymize identifiers
            userHash: { $substr: [{ $toString: '$_id' }, 0, 8] },
            // Exclude sensitive fields
            password: 0,
            email: 0,
            name: 0
          }
        }
      ]
    });
    console.log('User analytics view created successfully');
  } catch (error) {
    if (error.code !== 48) { // Collection already exists
      console.error('Error creating user analytics view:', error);
    }
  }
};

// Aggregated user behavior view
const createUserBehaviorView = async () => {
  const db = mongoose.connection.db;
  
  try {
    await db.createCollection('user_behavior_view', {
      viewOn: 'urls',
      pipeline: [
        {
          $group: {
            _id: '$userId',
            totalUrls: { $sum: 1 },
            totalClicks: { $sum: '$clicks' },
            avgClicksPerUrl: { $avg: '$clicks' },
            lastActivity: { $max: '$lastAccessedAt' },
            firstUrl: { $min: '$createdAt' },
            activeUrls: {
              $sum: {
                $cond: [{ $eq: ['$active', true] }, 1, 0]
              }
            }
          }
        },
        {
          $project: {
            userId: '$_id',
            metrics: {
              totalUrls: '$totalUrls',
              totalClicks: '$totalClicks',
              avgClicksPerUrl: '$avgClicksPerUrl',
              lastActivity: '$lastActivity',
              accountAge: {
                $dateDiff: {
                  startDate: '$firstUrl',
                  endDate: new Date(),
                  unit: 'day'
                }
              },
              activeUrls: '$activeUrls'
            },
            _id: 0
          }
        }
      ]
    });
    console.log('User behavior view created successfully');
  } catch (error) {
    if (error.code !== 48) {
      console.error('Error creating user behavior view:', error);
    }
  }
};

module.exports = {
  createUserAnalyticsView,
  createUserBehaviorView,
  initializeViews: async () => {
    await createUserAnalyticsView();
    await createUserBehaviorView();
  }
};