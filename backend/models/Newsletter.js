// Newsletter subscription model
const fs = require('fs');
const path = require('path');

class Newsletter {
  constructor() {
    this.subscribers = new Map();
    this.dataFile = path.join(__dirname, '../data/newsletter.json');
    this.loadSubscribers();
  }

  // Load subscribers from file
  loadSubscribers() {
    try {
      const dataDir = path.dirname(this.dataFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        this.subscribers = new Map(data.subscribers || []);
      }
    } catch (error) {
      console.error('Error loading newsletter subscribers:', error);
    }
  }

  // Save subscribers to file
  saveSubscribers() {
    try {
      const data = {
        subscribers: Array.from(this.subscribers.entries()),
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving newsletter subscribers:', error);
    }
  }

  // Add new subscriber
  subscribe(email) {
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email address');
    }

    if (this.subscribers.has(email)) {
      throw new Error('Email already subscribed');
    }

    const subscriber = {
      email,
      subscribedAt: new Date().toISOString(),
      status: 'active',
      source: 'website'
    };

    this.subscribers.set(email, subscriber);
    this.saveSubscribers();
    
    console.log(`📧 New newsletter subscriber: ${email}`);
    return subscriber;
  }

  // Unsubscribe
  unsubscribe(email) {
    if (this.subscribers.has(email)) {
      this.subscribers.delete(email);
      this.saveSubscribers();
      console.log(`📧 Unsubscribed: ${email}`);
      return true;
    }
    return false;
  }

  // Get all subscribers
  getAllSubscribers() {
    return Array.from(this.subscribers.values());
  }

  // Get subscriber count
  getSubscriberCount() {
    return this.subscribers.size;
  }

  // Export subscribers as CSV
  exportToCSV() {
    const subscribers = this.getAllSubscribers();
    const headers = ['Email', 'Subscribed Date', 'Status', 'Source'];
    const csvData = [
      headers.join(','),
      ...subscribers.map(sub => [
        sub.email,
        sub.subscribedAt,
        sub.status,
        sub.source
      ].join(','))
    ].join('\n');

    return csvData;
  }

  // Validate email
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Get analytics
  getAnalytics() {
    const subscribers = this.getAllSubscribers();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: subscribers.length,
      thisWeek: subscribers.filter(sub => new Date(sub.subscribedAt) > oneWeekAgo).length,
      thisMonth: subscribers.filter(sub => new Date(sub.subscribedAt) > oneMonthAgo).length,
      active: subscribers.filter(sub => sub.status === 'active').length
    };
  }
}

module.exports = new Newsletter();
