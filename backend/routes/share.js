const express = require('express');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const Share = require('../models/Share');

const router = express.Router();

// Get share information
router.get('/:slug/info', (req, res) => {
  try {
    const { slug } = req.params;
    const share = Share.getShare(slug);

    if (!share) {
      return res.status(404).json({ 
        error: 'Share not found or expired',
        code: 'SHARE_NOT_FOUND'
      });
    }

    // Check if share has expired
    if (share.expiresAt && Date.now() > share.expiresAt) {
      Share.deleteShare(slug);
      return res.status(404).json({ 
        error: 'Share has expired',
        code: 'SHARE_EXPIRED'
      });
    }

    res.json({
      slug,
      filesCount: share.files.length,
      totalSize: share.files.reduce((sum, file) => sum + file.size, 0),
      createdAt: share.createdAt,
      downloads: share.downloads,
      maxDownloads: share.maxDownloads,
      hasPin: !!share.pin,
      expiresAt: share.expiresAt,
      fileNames: share.files.map(f => f.originalName),
      isExpired: false
    });

  } catch (error) {
    console.error('Get share info error:', error);
    res.status(500).json({ 
      error: 'Failed to get share information',
      code: 'SERVER_ERROR'
    });
  }
});

// Download files
router.get('/:slug/download', async (req, res) => {
  try {
    const { slug } = req.params;
    const { pin } = req.query;
    const authPin = req.headers['x-download-pin']; // Alternative PIN header
    
    const share = Share.getShare(slug);

    if (!share) {
      return res.status(404).json({ 
        error: 'Share not found or expired',
        code: 'SHARE_NOT_FOUND'
      });
    }

    // Check if share has expired
    if (share.expiresAt && Date.now() > share.expiresAt) {
      Share.deleteShare(slug);
      return res.status(404).json({ 
        error: 'Share has expired',
        code: 'SHARE_EXPIRED'
      });
    }

    // Check if max downloads reached
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      Share.deleteShare(slug);
      return res.status(410).json({ 
        error: 'Share download limit reached',
        code: 'DOWNLOAD_LIMIT_REACHED'
      });
    }

    // Validate PIN
    const inputPin = pin || authPin;
    if (!Share.validateSharePin(slug, inputPin)) {
      return res.status(401).json({ 
        error: 'PIN required or incorrect',
        code: 'INVALID_PIN',
        requiresPin: !!share.pin
      });
    }

    // Increment download count
    Share.incrementDownloads(slug);

    // Single file download
    if (share.files.length === 1) {
      const file = share.files[0];
      
      // Check if file exists
      if (!fs.existsSync(file.path)) {
        return res.status(404).json({ 
          error: 'File not found on server',
          code: 'FILE_NOT_FOUND'
        });
      }

      const stat = fs.statSync(file.path);
      const fileSize = stat.size;
      const range = req.headers.range;

      // Set headers
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
      res.setHeader('Content-Type', file.mimetype || mime.lookup(file.originalName) || 'application/octet-stream');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', fileSize);

      // Handle range requests (for video/audio streaming)
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunksize);

        const stream = fs.createReadStream(file.path, { start, end });
        return stream.pipe(res);
      }

      // Normal download
      return res.sendFile(path.resolve(file.path));
    }

    // Multiple files - create ZIP
    const zipName = `sharelink-${slug}-${Date.now()}.zip`;
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip', { 
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to create archive',
          code: 'ARCHIVE_ERROR'
        });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add files to archive
    let filesAdded = 0;
    share.files.forEach((file, index) => {
      if (fs.existsSync(file.path)) {
        // Create unique filename if duplicates exist
        let fileName = file.originalName;
        const existingNames = share.files.slice(0, index).map(f => f.originalName);
        let counter = 1;
        while (existingNames.includes(fileName)) {
          const ext = path.extname(file.originalName);
          const name = path.basename(file.originalName, ext);
          fileName = `${name}_${counter}${ext}`;
          counter++;
        }
        
        archive.file(file.path, { name: fileName });
        filesAdded++;
      } else {
        console.warn(`File not found: ${file.path}`);
      }
    });

    if (filesAdded === 0) {
      archive.destroy();
      return res.status(404).json({ 
        error: 'No files found on server',
        code: 'NO_FILES_FOUND'
      });
    }

    // Finalize archive
    await archive.finalize();

  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Download failed',
        message: error.message,
        code: 'DOWNLOAD_FAILED'
      });
    }
  }
});

// List all active shares
router.get('/', (req, res) => {
  try {
    const shares = Share.getAllShares();
    res.json({
      success: true,
      count: shares.length,
      shares: shares.map(share => ({
        ...share,
        url: `${req.protocol}://${req.get('host')}/api/share/${share.slug}/download`,
        timeRemaining: share.expiresAt ? Math.max(0, share.expiresAt - Date.now()) : null
      }))
    });
  } catch (error) {
    console.error('List shares error:', error);
    res.status(500).json({ 
      error: 'Failed to list shares',
      code: 'SERVER_ERROR'
    });
  }
});

// Delete share
router.delete('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const { pin } = req.body;
    
    const share = Share.getShare(slug);
    if (!share) {
      return res.status(404).json({ 
        error: 'Share not found',
        code: 'SHARE_NOT_FOUND'
      });
    }

    // Validate PIN if share is protected
    if (share.pin && !Share.validateSharePin(slug, pin)) {
      return res.status(401).json({ 
        error: 'PIN required to delete this share',
        code: 'PIN_REQUIRED'
      });
    }

    const deleted = Share.deleteShare(slug);
    if (deleted) {
      res.json({ 
        success: true,
        message: 'Share deleted successfully'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to delete share',
        code: 'DELETE_FAILED'
      });
    }

  } catch (error) {
    console.error('Delete share error:', error);
    res.status(500).json({ 
      error: 'Failed to delete share',
      code: 'SERVER_ERROR'
    });
  }
});

// Get download statistics
router.get('/:slug/stats', (req, res) => {
  try {
    const { slug } = req.params;
    const share = Share.getShare(slug);

    if (!share) {
      return res.status(404).json({ 
        error: 'Share not found',
        code: 'SHARE_NOT_FOUND'
      });
    }

    res.json({
      slug,
      downloads: share.downloads,
      maxDownloads: share.maxDownloads,
      remainingDownloads: share.maxDownloads ? share.maxDownloads - share.downloads : null,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      timeRemaining: share.expiresAt ? Math.max(0, share.expiresAt - Date.now()) : null,
      isExpired: share.expiresAt ? Date.now() > share.expiresAt : false
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get statistics',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
