const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for shared files
const shares = new Map();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
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
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

app.use(express.json());
app.use(express.static('public'));

// Clean up expired shares
setInterval(() => {
  const now = Date.now();
  for (const [slug, share] of shares.entries()) {
    if (share.expiresAt && now > share.expiresAt) {
      // Delete files if they exist
      if (share.files) {
        share.files.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (err) {
            console.log('Error deleting file:', err.message);
          }
        });
      }
      shares.delete(slug);
    }
  }
}, 60000); // Check every minute

// Generate unique slug
function generateSlug(customSlug) {
  if (customSlug && !shares.has(customSlug)) {
    return customSlug;
  }
  let slug;
  do {
    slug = Math.random().toString(36).substring(2, 8);
  } while (shares.has(slug));
  return slug;
}

// Hash PIN
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// API Routes

// Upload files
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    const { pin, customSlug, ttl } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const slug = generateSlug(customSlug);
    const shareData = {
      id: uuidv4(),
      files: files.map(file => ({
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      })),
      createdAt: Date.now(),
      downloads: 0,
      pin: pin ? hashPin(pin) : null,
      expiresAt: ttl ? Date.now() + (parseInt(ttl) * 60 * 1000) : null
    };

    shares.set(slug, shareData);

    const shareUrl = `http://localhost:${PORT}/share/${slug}`;
    const qrCode = await QRCode.toDataURL(shareUrl);

    res.json({
      success: true,
      slug,
      url: shareUrl,
      qrCode,
      filesCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0)
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get share info
app.get('/api/share/:slug/info', (req, res) => {
  const { slug } = req.params;
  const share = shares.get(slug);

  if (!share) {
    return res.status(404).json({ error: 'Share not found' });
  }

  res.json({
    filesCount: share.files.length,
    totalSize: share.files.reduce((sum, file) => sum + file.size, 0),
    createdAt: share.createdAt,
    downloads: share.downloads,
    hasPin: !!share.pin,
    expiresAt: share.expiresAt
  });
});

// Download files
app.get('/share/:slug', async (req, res) => {
  const { slug } = req.params;
  const { pin } = req.query;
  const share = shares.get(slug);

  if (!share) {
    return res.status(404).send('Share not found or expired');
  }

  // Check PIN if required
  if (share.pin) {
    if (!pin || hashPin(pin) !== share.pin) {
      return res.status(401).send('PIN required or incorrect');
    }
  }

  share.downloads++;

  // Single file download
  if (share.files.length === 1) {
    const file = share.files[0];
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    return res.sendFile(path.resolve(file.path));
  }

  // Multiple files - create ZIP
  res.setHeader('Content-Disposition', `attachment; filename="shared-files-${slug}.zip"`);
  res.setHeader('Content-Type', 'application/zip');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  share.files.forEach(file => {
    archive.file(file.path, { name: file.originalName });
  });

  await archive.finalize();
});

// Generate QR code
app.get('/api/qr/:slug', async (req, res) => {
  const { slug } = req.params;
  const share = shares.get(slug);

  if (!share) {
    return res.status(404).json({ error: 'Share not found' });
  }

  try {
    const shareUrl = `http://localhost:${PORT}/share/${slug}`;
    const qrCode = await QRCode.toDataURL(shareUrl);
    res.json({ qrCode });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// List active shares
app.get('/api/shares', (req, res) => {
  const activeShares = Array.from(shares.entries()).map(([slug, share]) => ({
    slug,
    filesCount: share.files.length,
    totalSize: share.files.reduce((sum, file) => sum + file.size, 0),
    createdAt: share.createdAt,
    downloads: share.downloads,
    hasPin: !!share.pin,
    expiresAt: share.expiresAt
  }));

  res.json(activeShares);
});

// Delete share
app.delete('/api/share/:slug', (req, res) => {
  const { slug } = req.params;
  const share = shares.get(slug);

  if (!share) {
    return res.status(404).json({ error: 'Share not found' });
  }

  // Delete files
  share.files.forEach(file => {
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      console.log('Error deleting file:', err.message);
    }
  });

  shares.delete(slug);
  res.json({ success: true });
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShareLink - Instant File Sharing</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        header {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            font-size: 2rem;
            font-weight: bold;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 0 30px rgba(255, 107, 107, 0.5);
        }

        .nav-buttons {
            display: flex;
            gap: 1rem;
        }

        .btn {
            padding: 0.8rem 1.5rem;
            border: none;
            border-radius: 25px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }

        .btn-primary {
            background: linear-gradient(45deg, #ff6b6b, #ee5a52);
            color: white;
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
        }

        .btn-secondary {
            background: linear-gradient(45deg, #4ecdc4, #44a08d);
            color: white;
            box-shadow: 0 4px 15px rgba(78, 205, 196, 0.4);
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .btn.active {
            background: linear-gradient(45deg, #a8edea, #fed6e3);
            color: #333;
        }

        main {
            padding: 2rem 0;
            min-height: calc(100vh - 140px);
        }

        .mode-selector {
            text-align: center;
            margin-bottom: 2rem;
        }

        .card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            margin-bottom: 2rem;
            transition: all 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
        }

        .upload-area {
            border: 3px dashed #ddd;
            border-radius: 15px;
            padding: 3rem;
            text-align: center;
            transition: all 0.3s ease;
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            position: relative;
            overflow: hidden;
        }

        .upload-area::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transform: rotate(45deg);
            transition: all 0.6s ease;
            opacity: 0;
        }

        .upload-area:hover::before {
            opacity: 1;
            animation: shine 1.5s ease-in-out;
        }

        @keyframes shine {
            0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
            100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }

        .upload-area.dragover {
            border-color: #4ecdc4;
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            transform: scale(1.02);
        }

        .file-input {
            display: none;
        }

        .upload-icon {
            font-size: 3rem;
            color: #666;
            margin-bottom: 1rem;
            display: block;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }

        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #555;
        }

        input[type="text"], input[type="number"], input[type="password"] {
            width: 100%;
            padding: 0.8rem;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 1rem;
            transition: all 0.3s ease;
        }

        input:focus {
            outline: none;
            border-color: #4ecdc4;
            box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.1);
        }

        .file-list {
            margin-top: 1rem;
        }

        .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.8rem;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 0.5rem;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            margin: 1rem 0;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(45deg, #4ecdc4, #44a08d);
            width: 0%;
            transition: width 0.3s ease;
        }

        .result-section {
            display: none;
            text-align: center;
        }

        .qr-code {
            max-width: 200px;
            margin: 1rem auto;
            border-radius: 10px;
        }

        .share-url {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 10px;
            font-family: monospace;
            word-break: break-all;
            margin: 1rem 0;
        }

        .receiver-section {
            display: none;
        }

        .pin-input-section {
            margin: 1rem 0;
        }

        footer {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #e8e8e8;
            position: relative;
            overflow: hidden;
        }

        footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, #4ecdc4, #ff6b6b, #667eea, transparent);
        }

        .footer-wrapper {
            padding: 3rem 0 1rem;
        }

        .footer-content {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 3rem;
            margin-bottom: 2rem;
            align-items: start;
        }

        .footer-section {
            text-align: left;
        }

        .footer-section h3 {
            margin-bottom: 1.5rem;
            color: #4ecdc4;
            font-size: 1.3rem;
            font-weight: 600;
            position: relative;
        }

        .footer-section h3::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 0;
            width: 40px;
            height: 2px;
            background: linear-gradient(45deg, #4ecdc4, #ff6b6b);
            border-radius: 2px;
        }

        .footer-brand {
            text-align: left;
        }

        .footer-logo {
            font-size: 2.5rem;
            font-weight: bold;
            background: linear-gradient(45deg, #4ecdc4, #ff6b6b, #667eea);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 1rem;
            display: inline-block;
        }

        .footer-description {
            color: #b8b8b8;
            line-height: 1.6;
            margin-bottom: 1.5rem;
            max-width: 300px;
        }

        .social-icons {
            display: flex;
            gap: 1rem;
            margin: 1.5rem 0;
        }

        .social-icon {
            width: 45px;
            height: 45px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e8e8e8;
            text-decoration: none;
            transition: all 0.3s ease;
            font-size: 1.2rem;
            position: relative;
            overflow: hidden;
        }

        .social-icon::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s ease;
        }

        .social-icon:hover::before {
            left: 100%;
        }

        .social-icon:hover {
            transform: translateY(-3px);
            border-color: #4ecdc4;
            box-shadow: 0 8px 25px rgba(78, 205, 196, 0.3);
            background: rgba(78, 205, 196, 0.2);
        }

        .github-icon::before { content: '⚡'; }
        .linkedin-icon::before { content: '💼'; }
        .instagram-icon::before { content: '📷'; }
        .email-icon::before { content: '✉'; }

        .footer-links {
            list-style: none;
            padding: 0;
        }

        .footer-links li {
            margin-bottom: 0.8rem;
        }

        .footer-links a {
            color: #b8b8b8;
            text-decoration: none;
            transition: all 0.3s ease;
            position: relative;
            padding-left: 1rem;
        }

        .footer-links a::before {
            content: '▶';
            position: absolute;
            left: 0;
            color: #4ecdc4;
            font-size: 0.7rem;
            opacity: 0;
            transform: translateX(-5px);
            transition: all 0.3s ease;
        }

        .footer-links a:hover {
            color: #4ecdc4;
            padding-left: 1.5rem;
        }

        .footer-links a:hover::before {
            opacity: 1;
            transform: translateX(0);
        }

        .newsletter {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 1rem;
        }

        .newsletter h4 {
            color: #4ecdc4;
            margin-bottom: 1rem;
            font-size: 1.1rem;
        }

        .newsletter-form {
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
        }

        .newsletter input {
            padding: 0.8rem;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            color: #e8e8e8;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }

        .newsletter input::placeholder {
            color: #999;
        }

        .newsletter input:focus {
            outline: none;
            border-color: #4ecdc4;
            background: rgba(255, 255, 255, 0.15);
        }

        .newsletter-btn {
            background: linear-gradient(45deg, #4ecdc4, #44a08d);
            border: none;
            color: white;
            padding: 0.8rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .newsletter-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(78, 205, 196, 0.4);
        }

        .footer-bottom {
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding: 1.5rem 0;
            text-align: center;
            background: rgba(0, 0, 0, 0.3);
        }

        .footer-bottom p {
            color: #999;
            margin: 0;
            font-size: 0.9rem;
        }

        .footer-bottom .highlight {
            color: #4ecdc4;
            font-weight: 600;
        }

        .hidden {
            display: none;
        }

        @media (max-width: 768px) {
            .form-row {
                grid-template-columns: 1fr;
            }
            
            .header-content {
                flex-direction: column;
                gap: 1rem;
            }
            
            .nav-buttons {
                flex-wrap: wrap;
                justify-content: center;
            }

            .footer-content {
                grid-template-columns: 1fr;
                gap: 2rem;
                text-align: center;
            }

            .footer-brand {
                text-align: center;
            }

            .footer-description {
                max-width: none;
                margin: 0 auto 1.5rem;
            }

            .social-icons {
                justify-content: center;
            }

            .footer-links {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 1rem;
            }

            .footer-links li {
                margin-bottom: 0;
            }
        }

        .glow {
            animation: glow 2s ease-in-out infinite alternate;
        }

        @keyframes glow {
            from { box-shadow: 0 0 20px rgba(78, 205, 196, 0.4); }
            to { box-shadow: 0 0 30px rgba(78, 205, 196, 0.8); }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <div class="header-content">
                <div class="logo glow">ShareLink</div>
                <nav class="nav-buttons">
                    <button class="btn btn-primary active" onclick="switchMode('sender')" id="senderBtn">📤 Sender</button>
                    <button class="btn btn-secondary" onclick="switchMode('receiver')" id="receiverBtn">📥 Receiver</button>
                </nav>
            </div>
        </div>
    </header>

    <main>
        <div class="container">
            <!-- Sender Mode -->
            <div id="senderMode">
                <div class="card">
                    <h2>📤 Share Your Files</h2>
                    <form id="uploadForm">
                        <div class="upload-area" id="uploadArea">
                            <span class="upload-icon">📁</span>
                            <h3>Drag & Drop Files Here</h3>
                            <p>or click to browse</p>
                            <input type="file" id="fileInput" class="file-input" multiple>
                        </div>
                        
                        <div class="file-list" id="fileList"></div>
                        <div class="progress-bar" id="progressBar" style="display: none;">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="customSlug">Custom Link (optional)</label>
                                <input type="text" id="customSlug" placeholder="my-awesome-files">
                            </div>
                            <div class="form-group">
                                <label for="pinCode">4-Digit PIN (optional)</label>
                                <input type="password" id="pinCode" placeholder="1234" maxlength="4">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="ttl">Auto-delete after (minutes)</label>
                            <input type="number" id="ttl" placeholder="60" min="1">
                        </div>

                        <button type="submit" class="btn btn-primary" style="width: 100%;">🚀 Create Share Link</button>
                    </form>

                    <div class="result-section" id="resultSection">
                        <h3>✅ Files Shared Successfully!</h3>
                        <div class="share-url" id="shareUrl"></div>
                        <img class="qr-code" id="qrCode" alt="QR Code">
                        <div>
                            <button class="btn btn-secondary" onclick="copyToClipboard()">📋 Copy Link</button>
                            <button class="btn btn-primary" onclick="resetForm()">📤 Share More Files</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Receiver Mode -->
            <div id="receiverMode" class="receiver-section">
                <div class="card">
                    <h2>📥 Receive Files</h2>
                    <div class="form-group">
                        <label for="shareLink">Paste Share Link</label>
                        <input type="text" id="shareLink" placeholder="http://localhost:3000/share/abc123">
                    </div>
                    
                    <div class="pin-input-section" id="pinInputSection" style="display: none;">
                        <div class="form-group">
                            <label for="receiverPin">Enter PIN</label>
                            <input type="password" id="receiverPin" placeholder="1234" maxlength="4">
                        </div>
                    </div>

                    <div>
                        <button class="btn btn-primary" onclick="checkShare()" style="width: 100%;">🔍 Check Share</button>
                    </div>

                    <div id="shareInfo" style="display: none; margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 10px;">
                        <h4>Share Details:</h4>
                        <div id="shareDetails"></div>
                        <button class="btn btn-secondary" onclick="downloadFiles()" style="width: 100%; margin-top: 1rem;">⬇️ Download Files</button>
                    </div>
                </div>

                <div class="card">
                    <h3>📱 Scan QR Code</h3>
                    <p>Use your phone's camera to scan a QR code from the sender</p>
                    <div style="text-align: center; padding: 2rem;">
                        <div style="width: 200px; height: 200px; border: 2px dashed #ccc; border-radius: 10px; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #999;">
                            📷 Point your camera here
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer>
        <div class="footer-wrapper">
            <div class="container">
                <div class="footer-content">
                    <div class="footer-section footer-brand">
                        <div class="footer-logo">ShareLink</div>
                        <p class="footer-description">
                            Instantly share files with beautiful, secure links. Fast, private, and ephemeral file sharing for everyone.
                        </p>
                        <div class="social-icons">
                            <a href="https://github.com/ankitmeena023" class="social-icon github-icon" title="GitHub"></a>
                            <a href="https://linkedin.com/in/ankitmeena023" class="social-icon linkedin-icon" title="LinkedIn"></a>
                            <a href="https://instagram.com/ankitmeena023" class="social-icon instagram-icon" title="Instagram"></a>
                            <a href="mailto:ankit.meena@outlook.in" class="social-icon email-icon" title="Email"></a>
                        </div>
                    </div>
                    
                    <div class="footer-section">
                        <h3>Quick Links</h3>
                        <ul class="footer-links">
                            <li><a href="#" onclick="switchMode('sender')">Send Files</a></li>
                            <li><a href="#" onclick="switchMode('receiver')">Receive Files</a></li>
                            <li><a href="/api/shares">Active Shares</a></li>
                            <li><a href="mailto:ankit.meena@outlook.in">Support</a></li>
                        </ul>
                    </div>
                    
                    <div class="footer-section">
                        <h3>Stay Updated</h3>
                        <div class="newsletter">
                            <h4>Newsletter</h4>
                            <div class="newsletter-form">
                                <input type="email" placeholder="Enter your email" id="newsletterEmail">
                                <button class="newsletter-btn" onclick="subscribeNewsletter()">Subscribe</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer-bottom">
            <div class="container">
                <p>&copy; 2025 <span class="highlight">ShareLink</span>. Crafted with passion by <span class="highlight">Ankit Meena</span></p>
            </div>
        </div>
    </footer>

    <script>
        let selectedFiles = [];
        let currentShareUrl = '';

        // Mode switching
        function switchMode(mode) {
            const senderMode = document.getElementById('senderMode');
            const receiverMode = document.getElementById('receiverMode');
            const senderBtn = document.getElementById('senderBtn');
            const receiverBtn = document.getElementById('receiverBtn');

            if (mode === 'sender') {
                senderMode.style.display = 'block';
                receiverMode.style.display = 'none';
                senderBtn.classList.add('active');
                receiverBtn.classList.remove('active');
            } else {
                senderMode.style.display = 'none';
                receiverMode.style.display = 'block';
                senderBtn.classList.remove('active');
                receiverBtn.classList.add('active');
            }
        }

        // File upload handling
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const fileList = document.getElementById('fileList');

        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });

        function handleFiles(files) {
            selectedFiles = Array.from(files);
            displayFileList();
        }

        function displayFileList() {
            fileList.innerHTML = '';
            selectedFiles.forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = \`
                    <span>\${file.name} (\${formatFileSize(file.size)})</span>
                    <button type="button" onclick="removeFile(\${index})" style="background: #ff6b6b; color: white; border: none; border-radius: 5px; padding: 0.3rem 0.8rem;">✕</button>
                \`;
                fileList.appendChild(fileItem);
            });
        }

        function removeFile(index) {
            selectedFiles.splice(index, 1);
            displayFileList();
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // Form submission
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (selectedFiles.length === 0) {
                alert('Please select files to share');
                return;
            }

            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            const customSlug = document.getElementById('customSlug').value;
            const pinCode = document.getElementById('pinCode').value;
            const ttl = document.getElementById('ttl').value;

            if (customSlug) formData.append('customSlug', customSlug);
            if (pinCode) formData.append('pin', pinCode);
            if (ttl) formData.append('ttl', ttl);

            // Show progress
            document.getElementById('progressBar').style.display = 'block';
            const progressFill = document.getElementById('progressFill');
            
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                progressFill.style.width = '100%';

                if (response.ok) {
                    const result = await response.json();
                    showResult(result);
                } else {
                    const error = await response.json();
                    alert('Upload failed: ' + error.error);
                }
            } catch (error) {
                alert('Upload failed: ' + error.message);
            }

            document.getElementById('progressBar').style.display = 'none';
            progressFill.style.width = '0%';
        });

        function showResult(result) {
            currentShareUrl = result.url;
            document.getElementById('shareUrl').textContent = result.url;
            document.getElementById('qrCode').src = result.qrCode;
            document.getElementById('resultSection').style.display = 'block';
            document.getElementById('uploadForm').style.display = 'none';
        }

        function copyToClipboard() {
            navigator.clipboard.writeText(currentShareUrl).then(() => {
                alert('Link copied to clipboard!');
            });
        }

        function resetForm() {
            document.getElementById('uploadForm').style.display = 'block';
            document.getElementById('resultSection').style.display = 'none';
            document.getElementById('uploadForm').reset();
            selectedFiles = [];
            fileList.innerHTML = '';
            currentShareUrl = '';
        }

        // Receiver functions
        async function checkShare() {
            const shareLink = document.getElementById('shareLink').value;
            if (!shareLink) {
                alert('Please enter a share link');
                return;
            }

            const slug = shareLink.split('/').pop();
            
            try {
                const response = await fetch(\`/api/share/\${slug}/info\`);
                if (response.ok) {
                    const info = await response.json();
                    showShareInfo(info, slug);
                } else {
                    alert('Share not found or expired');
                }
            } catch (error) {
                alert('Error checking share: ' + error.message);
            }
        }

        function showShareInfo(info, slug) {
            const shareDetails = document.getElementById('shareDetails');
            shareDetails.innerHTML = \`
                <p><strong>Files:</strong> \${info.filesCount}</p>
                <p><strong>Total Size:</strong> \${formatFileSize(info.totalSize)}</p>
                <p><strong>Downloads:</strong> \${info.downloads}</p>
                <p><strong>Protected:</strong> \${info.hasPin ? 'Yes' : 'No'}</p>
                \${info.expiresAt ? \`<p><strong>Expires:</strong> \${new Date(info.expiresAt).toLocaleString()}</p>\` : ''}
            \`;

            if (info.hasPin) {
                document.getElementById('pinInputSection').style.display = 'block';
            }

            document.getElementById('shareInfo').style.display = 'block';
        }

        function downloadFiles() {
            const shareLink = document.getElementById('shareLink').value;
            const slug = shareLink.split('/').pop();
            const pin = document.getElementById('receiverPin').value;

            let downloadUrl = shareLink;
            if (pin) {
                downloadUrl += \`?pin=\${pin}\`;
            }

            window.open(downloadUrl, '_blank');
        }

        // Newsletter subscription
        function subscribeNewsletter() {
            const email = document.getElementById('newsletterEmail').value;
            if (!email) {
                alert('Please enter your email address');
                return;
            }
            
            if (!email.includes('@')) {
                alert('Please enter a valid email address');
                return;
            }
            
            // Simulate subscription (you can integrate with actual newsletter service)
            alert('Thank you for subscribing! You will receive updates about ShareLink.');
            document.getElementById('newsletterEmail').value = '';
        }

        // Add Enter key support for newsletter
        document.addEventListener('DOMContentLoaded', function() {
            const newsletterInput = document.getElementById('newsletterEmail');
            if (newsletterInput) {
                newsletterInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        subscribeNewsletter();
                    }
                });
            }
        });
    </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 ShareLink server running on http://localhost:${PORT}`);
  console.log(`📤 Ready to share files instantly!`);
});
