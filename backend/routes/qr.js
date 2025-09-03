const express = require('express');
const QRCode = require('qrcode');
const Share = require('../models/Share');

const router = express.Router();

// Generate QR code for a share
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { format = 'png', size = 200, pin } = req.query;
    
    const share = Share.getShare(slug);

    if (!share) {
      return res.status(404).json({ 
        error: 'Share not found',
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

    // Build URL
    let shareUrl = `${req.protocol}://${req.get('host')}/api/share/${slug}/download`;
    
    // Add PIN to URL if provided
    if (pin && Share.validateSharePin(slug, pin)) {
      shareUrl += `?pin=${pin}`;
    }

    // QR Code options
    const qrOptions = {
      width: parseInt(size),
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    };

    // Generate QR code based on format
    if (format === 'svg') {
      const qrSvg = await QRCode.toString(shareUrl, { 
        ...qrOptions, 
        type: 'svg' 
      });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrSvg);
    } else if (format === 'dataurl') {
      const qrDataUrl = await QRCode.toDataURL(shareUrl, qrOptions);
      res.json({ 
        qrCode: qrDataUrl,
        url: shareUrl,
        slug
      });
    } else {
      // Default PNG format
      const qrBuffer = await QRCode.toBuffer(shareUrl, qrOptions);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="qr-${slug}.png"`);
      res.send(qrBuffer);
    }

  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate QR code',
      message: error.message,
      code: 'QR_GENERATION_FAILED'
    });
  }
});

// Generate QR code with custom data
router.post('/custom', async (req, res) => {
  try {
    const { data, format = 'dataurl', size = 200, options = {} } = req.body;

    if (!data) {
      return res.status(400).json({ 
        error: 'Data is required',
        code: 'NO_DATA'
      });
    }

    const qrOptions = {
      width: parseInt(size),
      margin: options.margin || 2,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#FFFFFF'
      },
      errorCorrectionLevel: options.errorLevel || 'M'
    };

    if (format === 'svg') {
      const qrSvg = await QRCode.toString(data, { 
        ...qrOptions, 
        type: 'svg' 
      });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrSvg);
    } else if (format === 'png') {
      const qrBuffer = await QRCode.toBuffer(data, qrOptions);
      res.setHeader('Content-Type', 'image/png');
      res.send(qrBuffer);
    } else {
      // Default dataurl format
      const qrDataUrl = await QRCode.toDataURL(data, qrOptions);
      res.json({ 
        qrCode: qrDataUrl,
        data
      });
    }

  } catch (error) {
    console.error('Custom QR generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate custom QR code',
      message: error.message,
      code: 'CUSTOM_QR_FAILED'
    });
  }
});

// Get QR code info/metadata
router.get('/:slug/info', (req, res) => {
  try {
    const { slug } = req.params;
    const share = Share.getShare(slug);

    if (!share) {
      return res.status(404).json({ 
        error: 'Share not found',
        code: 'SHARE_NOT_FOUND'
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}/api/share/${slug}/download`;
    
    res.json({
      slug,
      url: baseUrl,
      qrEndpoint: `${req.protocol}://${req.get('host')}/api/qr/${slug}`,
      availableFormats: ['png', 'svg', 'dataurl'],
      hasPin: !!share.pin,
      expiresAt: share.expiresAt,
      filesCount: share.files.length
    });

  } catch (error) {
    console.error('QR info error:', error);
    res.status(500).json({ 
      error: 'Failed to get QR information',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
