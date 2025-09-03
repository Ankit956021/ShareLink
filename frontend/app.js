// ShareLink Frontend JavaScript
const API_BASE = 'http://localhost:5001/api';

let selectedFiles = [];
let currentShareUrl = '';

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    checkBackendStatus();
});

// Check if backend is running
async function checkBackendStatus() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            console.log('✅ Backend connected successfully');
        } else {
            showNotification('Backend connection failed', 'error');
        }
    } catch (error) {
        showNotification('Backend is not running. Please start the backend server.', 'error');
        console.error('Backend connection error:', error);
    }
}

// Initialize all event listeners
function initializeEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const newsletterInput = document.getElementById('newsletterEmail');

    // File upload events
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    uploadForm.addEventListener('submit', handleUpload);

    // Newsletter subscription
    if (newsletterInput) {
        newsletterInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                subscribeNewsletter();
            }
        });
    }
}

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

// File drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('uploadArea').classList.add('dragover');
}

function handleDragLeave() {
    document.getElementById('uploadArea').classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('uploadArea').classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
}

function handleFileSelect(e) {
    handleFiles(e.target.files);
}

function handleFiles(files) {
    selectedFiles = Array.from(files);
    displayFileList();
}

function displayFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>${file.name} (${formatFileSize(file.size)})</span>
            <button type="button" onclick="removeFile(${index})" style="background: #ff6b6b; color: white; border: none; border-radius: 5px; padding: 0.3rem 0.8rem; cursor: pointer;">✕</button>
        `;
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

// Handle file upload
async function handleUpload(e) {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
        showNotification('Please select files to share', 'error');
        return;
    }

    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append('files', file);
    });

    // Get form values
    const customSlug = document.getElementById('customSlug').value.trim();
    const pinCode = document.getElementById('pinCode').value.trim();
    const ttl = document.getElementById('ttl').value.trim();
    const maxDownloads = document.getElementById('maxDownloads').value.trim();

    // Validate PIN
    if (pinCode && !/^\d{4}$/.test(pinCode)) {
        showNotification('PIN must be exactly 4 digits', 'error');
        return;
    }

    // Add optional fields
    if (customSlug) formData.append('customSlug', customSlug);
    if (pinCode) formData.append('pin', pinCode);
    if (ttl) formData.append('ttl', ttl);
    if (maxDownloads) formData.append('maxDownloads', maxDownloads);

    // Show progress
    showProgress(true);
    
    try {
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            showResult(result);
            showNotification('Files uploaded successfully!', 'success');
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showNotification(`Upload failed: ${error.message}`, 'error');
    } finally {
        showProgress(false);
    }
}

function showProgress(show) {
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    
    if (show) {
        progressBar.style.display = 'block';
        progressFill.style.width = '0%';
        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress > 90) progress = 90;
            progressFill.style.width = progress + '%';
        }, 200);
        
        progressBar.dataset.interval = interval;
    } else {
        progressBar.style.display = 'none';
        if (progressBar.dataset.interval) {
            clearInterval(progressBar.dataset.interval);
        }
        progressFill.style.width = '100%';
        setTimeout(() => {
            progressFill.style.width = '0%';
        }, 500);
    }
}

function showResult(result) {
    currentShareUrl = result.url;
    
    document.getElementById('shareUrl').textContent = result.url;
    document.getElementById('qrCode').src = result.qrCode;
    
    // Show detailed information
    const shareDetails = document.getElementById('shareDetails');
    shareDetails.innerHTML = `
        <div style="background: #f0f8ff; padding: 1rem; border-radius: 8px; margin: 1rem 0; text-align: left;">
            <p><strong>Files:</strong> ${result.files.count} (${formatFileSize(result.files.totalSize)})</p>
            <p><strong>Slug:</strong> ${result.slug}</p>
            ${result.security.hasPin ? '<p><strong>Protected:</strong> ✅ PIN Required</p>' : '<p><strong>Protected:</strong> ❌ No PIN</p>'}
            ${result.security.expiresAt ? `<p><strong>Expires:</strong> ${new Date(result.security.expiresAt).toLocaleString()}</p>` : '<p><strong>Expires:</strong> Never</p>'}
            ${result.security.maxDownloads ? `<p><strong>Max Downloads:</strong> ${result.security.maxDownloads}</p>` : '<p><strong>Max Downloads:</strong> Unlimited</p>'}
        </div>
    `;
    
    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('uploadForm').style.display = 'none';
}

function copyToClipboard() {
    navigator.clipboard.writeText(currentShareUrl).then(() => {
        showNotification('Link copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentShareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Link copied to clipboard!', 'success');
    });
}

function resetForm() {
    document.getElementById('uploadForm').style.display = 'block';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('uploadForm').reset();
    selectedFiles = [];
    document.getElementById('fileList').innerHTML = '';
    currentShareUrl = '';
}

// Receiver functions
async function checkShare() {
    const shareLink = document.getElementById('shareLink').value.trim();
    if (!shareLink) {
        showNotification('Please enter a share link', 'error');
        return;
    }

    // Extract slug from URL
    const urlParts = shareLink.split('/');
    const downloadIndex = urlParts.indexOf('download');
    if (downloadIndex === -1 || downloadIndex === 0) {
        showNotification('Invalid share link format', 'error');
        return;
    }
    const slug = urlParts[downloadIndex - 1];
    
    try {
        const response = await fetch(`${API_BASE}/share/${slug}/info`);
        if (response.ok) {
            const info = await response.json();
            showShareInfo(info, slug);
        } else {
            const error = await response.json();
            showNotification(error.error || 'Share not found or expired', 'error');
        }
    } catch (error) {
        console.error('Check share error:', error);
        showNotification('Error checking share', 'error');
    }
}

function showShareInfo(info, slug) {
    const shareDetails = document.getElementById('shareDetails');
    shareDetails.innerHTML = `
        <p><strong>Files:</strong> ${info.filesCount}</p>
        <p><strong>Total Size:</strong> ${formatFileSize(info.totalSize)}</p>
        <p><strong>Downloads:</strong> ${info.downloads}${info.maxDownloads ? ` / ${info.maxDownloads}` : ''}</p>
        <p><strong>Protected:</strong> ${info.hasPin ? 'Yes - PIN Required' : 'No'}</p>
        <p><strong>Created:</strong> ${new Date(info.createdAt).toLocaleString()}</p>
        ${info.expiresAt ? `<p><strong>Expires:</strong> ${new Date(info.expiresAt).toLocaleString()}</p>` : '<p><strong>Expires:</strong> Never</p>'}
        ${info.fileNames && info.fileNames.length > 0 ? `<p><strong>Files:</strong> ${info.fileNames.join(', ')}</p>` : ''}
    `;

    const pinInputSection = document.getElementById('pinInputSection');
    if (info.hasPin) {
        pinInputSection.style.display = 'block';
    } else {
        pinInputSection.style.display = 'none';
    }

    document.getElementById('shareInfo').style.display = 'block';
}

function downloadFiles() {
    const shareLink = document.getElementById('shareLink').value.trim();
    const pin = document.getElementById('receiverPin').value.trim();

    if (!shareLink) {
        showNotification('Please enter a share link', 'error');
        return;
    }

    let downloadUrl = shareLink;
    if (pin) {
        const separator = shareLink.includes('?') ? '&' : '?';
        downloadUrl += `${separator}pin=${pin}`;
    }

    // Open download in new tab
    window.open(downloadUrl, '_blank');
    showNotification('Download started!', 'success');
}

// Show active shares
async function showActiveShares() {
    try {
        const response = await fetch(`${API_BASE}/share`);
        if (response.ok) {
            const result = await response.json();
            displayActiveShares(result.shares);
        } else {
            showNotification('Failed to load active shares', 'error');
        }
    } catch (error) {
        console.error('Load shares error:', error);
        showNotification('Error loading shares', 'error');
    }
}

function displayActiveShares(shares) {
    if (shares.length === 0) {
        showNotification('No active shares found', 'info');
        return;
    }

    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 15px; padding: 2rem; max-width: 800px; max-height: 80vh; overflow-y: auto; position: relative;">
                <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                <h3>Active Shares (${shares.length})</h3>
                <div style="margin-top: 1rem;">
                    ${shares.map(share => `
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin: 0.5rem 0;">
                            <p><strong>Slug:</strong> ${share.slug}</p>
                            <p><strong>Files:</strong> ${share.filesCount} (${formatFileSize(share.totalSize)})</p>
                            <p><strong>Downloads:</strong> ${share.downloads}${share.maxDownloads ? ` / ${share.maxDownloads}` : ''}</p>
                            <p><strong>Protected:</strong> ${share.hasPin ? 'Yes' : 'No'}</p>
                            <p><strong>Created:</strong> ${new Date(share.createdAt).toLocaleString()}</p>
                            ${share.timeRemaining ? `<p><strong>Expires in:</strong> ${Math.round(share.timeRemaining / 60000)} minutes</p>` : ''}
                            <button onclick="copyToClipboard('${share.url}')" style="background: #4ecdc4; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; margin: 0.5rem 0.5rem 0 0; cursor: pointer;">Copy Link</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Newsletter subscription
async function subscribeNewsletter() {
    const email = document.getElementById('newsletterEmail').value.trim();
    const button = document.querySelector('.newsletter-btn');
    
    if (!email) {
        showNotification('Please enter your email address', 'error');
        return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    // Show loading state
    const originalText = button.textContent;
    button.textContent = 'Subscribing...';
    button.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/newsletter/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (result.success) {
            showNotification(result.message, 'success');
            document.getElementById('newsletterEmail').value = '';
        } else {
            showNotification(result.error || 'Subscription failed', 'error');
        }

    } catch (error) {
        console.error('Newsletter subscription error:', error);
        showNotification('Failed to subscribe. Please try again later.', 'error');
    } finally {
        // Reset button state
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 4000);
}

// Utility function for copying text
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}

// Initialize tooltips and other UI enhancements
function initializeUI() {
    // Add hover effects and animations
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Call UI initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);
