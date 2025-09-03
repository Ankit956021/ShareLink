const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// In-memory storage for shared files
const shares = new Map();

// Clean up expired shares every minute
setInterval(() => {
  const now = Date.now();
  for (const [slug, share] of shares.entries()) {
    if (share.expiresAt && now > share.expiresAt) {
      // Delete files if they exist
      if (share.files) {
        const fs = require('fs');
        share.files.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (err) {
            console.log('Error deleting file:', err.message);
          }
        });
      }
      shares.delete(slug);
      console.log(`🗑️ Expired share deleted: ${slug}`);
    }
  }
}, 60000);

// Generate unique slug
function generateSlug(customSlug) {
  if (customSlug && !shares.has(customSlug)) {
    // Validate custom slug (alphanumeric, hyphens, underscores only)
    if (/^[a-zA-Z0-9_-]+$/.test(customSlug)) {
      return customSlug;
    }
  }
  
  let slug;
  do {
    slug = Math.random().toString(36).substring(2, 8);
  } while (shares.has(slug));
  return slug;
}

// Hash PIN with salt
function hashPin(pin) {
  const salt = 'sharelink_salt';
  return crypto.createHash('sha256').update(pin + salt).digest('hex');
}

// Validate PIN format (4 digits)
function validatePin(pin) {
  return /^\d{4}$/.test(pin);
}

// Get all shares
function getAllShares() {
  return Array.from(shares.entries()).map(([slug, share]) => ({
    slug,
    filesCount: share.files ? share.files.length : 0,
    totalSize: share.files ? share.files.reduce((sum, file) => sum + file.size, 0) : 0,
    createdAt: share.createdAt,
    downloads: share.downloads,
    hasPin: !!share.pin,
    expiresAt: share.expiresAt,
    maxDownloads: share.maxDownloads
  }));
}

// Get share by slug
function getShare(slug) {
  return shares.get(slug);
}

// Create new share
function createShare(shareData) {
  const slug = generateSlug(shareData.customSlug);
  
  const share = {
    id: uuidv4(),
    files: shareData.files || [],
    createdAt: Date.now(),
    downloads: 0,
    maxDownloads: shareData.maxDownloads || null,
    pin: shareData.pin ? hashPin(shareData.pin) : null,
    expiresAt: shareData.ttl ? Date.now() + (parseInt(shareData.ttl) * 60 * 1000) : null,
    metadata: {
      userAgent: shareData.userAgent,
      ip: shareData.ip
    }
  };

  shares.set(slug, share);
  console.log(`📤 New share created: ${slug} (${share.files.length} files)`);
  
  return { slug, share };
}

// Delete share
function deleteShare(slug) {
  const share = shares.get(slug);
  if (!share) {
    return false;
  }

  // Delete files
  if (share.files) {
    const fs = require('fs');
    share.files.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.log('Error deleting file:', err.message);
      }
    });
  }

  shares.delete(slug);
  console.log(`🗑️ Share deleted: ${slug}`);
  return true;
}

// Increment download count
function incrementDownloads(slug) {
  const share = shares.get(slug);
  if (share) {
    share.downloads++;
    
    // Check if max downloads reached
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      setTimeout(() => deleteShare(slug), 1000); // Delete after 1 second
    }
  }
}

// Validate PIN for share
function validateSharePin(slug, inputPin) {
  const share = shares.get(slug);
  if (!share) {
    return false;
  }

  if (!share.pin) {
    return true; // No PIN required
  }

  if (!inputPin) {
    return false; // PIN required but not provided
  }

  return hashPin(inputPin) === share.pin;
}

module.exports = {
  getAllShares,
  getShare,
  createShare,
  deleteShare,
  incrementDownloads,
  validateSharePin,
  generateSlug,
  hashPin,
  validatePin
};
