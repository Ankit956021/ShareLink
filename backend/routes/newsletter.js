const express = require('express');
const Newsletter = require('../models/Newsletter');
const router = express.Router();

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const subscriber = Newsletter.subscribe(email);
    
    res.json({
      success: true,
      message: '🎉 Successfully subscribed to newsletter!',
      subscriber: {
        email: subscriber.email,
        subscribedAt: subscriber.subscribedAt
      }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Unsubscribe from newsletter
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const unsubscribed = Newsletter.unsubscribe(email);
    
    if (unsubscribed) {
      res.json({
        success: true,
        message: 'Successfully unsubscribed from newsletter'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Email not found in subscribers list'
      });
    }

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe'
    });
  }
});

// Get newsletter analytics (admin only)
router.get('/analytics', (req, res) => {
  try {
    const analytics = Newsletter.getAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Newsletter analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch newsletter analytics'
    });
  }
});

// Export subscribers (admin only)
router.get('/export', (req, res) => {
  try {
    const format = req.query.format || 'json';
    
    if (format === 'csv') {
      const csvData = Newsletter.exportToCSV();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="newsletter-subscribers.csv"');
      res.send(csvData);
    } else {
      const subscribers = Newsletter.getAllSubscribers();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="newsletter-subscribers.json"');
      res.json({
        success: true,
        data: subscribers,
        exportedAt: new Date().toISOString(),
        count: subscribers.length
      });
    }
  } catch (error) {
    console.error('Newsletter export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export subscribers'
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  try {
    const count = Newsletter.getSubscriberCount();
    res.json({
      success: true,
      message: 'Newsletter service is healthy',
      subscriberCount: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Newsletter service unhealthy'
    });
  }
});

module.exports = router;
