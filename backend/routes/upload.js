const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const Share = require('../models/Share');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 500 * 1024 * 1024, // 500MB per file
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types but check for malicious extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (dangerousExtensions.includes(fileExt)) {
      return cb(new Error(`File type ${fileExt} is not allowed for security reasons`));
    }
    
    cb(null, true);
  }
});

// Upload multiple files
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { pin, customSlug, ttl, maxDownloads } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ 
        error: 'No files uploaded',
        code: 'NO_FILES'
      });
    }

    // Validate PIN format if provided
    if (pin && !Share.validatePin(pin)) {
      return res.status(400).json({ 
        error: 'PIN must be exactly 4 digits',
        code: 'INVALID_PIN_FORMAT'
      });
    }

    // Validate TTL
    if (ttl && (isNaN(ttl) || parseInt(ttl) < 1 || parseInt(ttl) > 10080)) { // Max 1 week
      return res.status(400).json({ 
        error: 'TTL must be between 1 and 10080 minutes (1 week)',
        code: 'INVALID_TTL'
      });
    }

    // Validate max downloads
    if (maxDownloads && (isNaN(maxDownloads) || parseInt(maxDownloads) < 1 || parseInt(maxDownloads) > 1000)) {
      return res.status(400).json({ 
        error: 'Max downloads must be between 1 and 1000',
        code: 'INVALID_MAX_DOWNLOADS'
      });
    }

    // Create share data
    const shareData = {
      files: files.map(file => ({
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        filename: file.filename
      })),
      customSlug,
      pin,
      ttl,
      maxDownloads,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    const { slug, share } = Share.createShare(shareData);

    // Generate QR code
    const shareUrl = `${req.protocol}://${req.get('host')}/api/share/${slug}/download`;
    const qrCode = await QRCode.toDataURL(shareUrl);

    // Calculate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    res.status(201).json({
      success: true,
      slug,
      url: shareUrl,
      qrCode,
      files: {
        count: files.length,
        totalSize,
        names: files.map(f => f.originalname)
      },
      security: {
        hasPin: !!pin,
        expiresAt: share.expiresAt,
        maxDownloads: share.maxDownloads
      },
      createdAt: share.createdAt
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded files if share creation failed
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.log('Error cleaning up file:', err.message);
        }
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 500MB per file',
        code: 'FILE_TOO_LARGE'
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files. Maximum is 10 files per upload',
        code: 'TOO_MANY_FILES'
      });
    }

    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message,
      code: 'UPLOAD_FAILED'
    });
  }
});

// Upload single file (alternative endpoint)
router.post('/single', upload.single('file'), async (req, res) => {
  try {
    const { pin, customSlug, ttl, maxDownloads } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    // Same validation as multiple files
    if (pin && !Share.validatePin(pin)) {
      return res.status(400).json({ 
        error: 'PIN must be exactly 4 digits',
        code: 'INVALID_PIN_FORMAT'
      });
    }

    const shareData = {
      files: [{
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        filename: file.filename
      }],
      customSlug,
      pin,
      ttl,
      maxDownloads,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    const { slug, share } = Share.createShare(shareData);

    const shareUrl = `${req.protocol}://${req.get('host')}/api/share/${slug}/download`;
    const qrCode = await QRCode.toDataURL(shareUrl);

    res.status(201).json({
      success: true,
      slug,
      url: shareUrl,
      qrCode,
      file: {
        name: file.originalname,
        size: file.size,
        type: file.mimetype
      },
      security: {
        hasPin: !!pin,
        expiresAt: share.expiresAt,
        maxDownloads: share.maxDownloads
      },
      createdAt: share.createdAt
    });

  } catch (error) {
    console.error('Single upload error:', error);
    
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.log('Error cleaning up file:', err.message);
      }
    }

    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message,
      code: 'UPLOAD_FAILED'
    });
  }
});

module.exports = router;
