# ShareLink Backend API 🚀

A powerful, secure backend API for instant file sharing with beautiful links, PIN protection, and QR codes.

## 🎯 Features

### Core API Features
- **Multi-file Upload** - Upload up to 10 files (500MB each)
- **Custom Short Links** - Username-style custom slugs
- **PIN Protection** - 4-digit PIN with SHA-256 hashing
- **Auto Expiry** - TTL-based automatic cleanup
- **Download Limits** - Max download count restrictions
- **QR Code Generation** - Multiple formats (PNG, SVG, DataURL)
- **Range Requests** - Streaming support for large files
- **ZIP Bundling** - Multiple files auto-compressed

### Security Features
- **Input Validation** - Comprehensive data validation
- **File Type Filtering** - Dangerous file extensions blocked
- **PIN Hashing** - Secure SHA-256 with salt
- **CORS Protection** - Configurable cross-origin requests
- **Memory Management** - Automatic cleanup of expired shares

## 🛠️ Installation

```bash
cd backend
npm install
```

## 🚀 Quick Start

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Health Check
```http
GET /api/health
```

### Upload Endpoints

#### Upload Multiple Files
```http
POST /api/upload
Content-Type: multipart/form-data

files: File[]           # Array of files (max 10)
customSlug?: string     # Custom link slug
pin?: string           # 4-digit PIN
ttl?: number           # TTL in minutes (1-10080)
maxDownloads?: number  # Max downloads (1-1000)
```

**Response:**
```json
{
  "success": true,
  "slug": "abc123",
  "url": "http://localhost:5000/api/share/abc123/download",
  "qrCode": "data:image/png;base64,...",
  "files": {
    "count": 2,
    "totalSize": 1048576,
    "names": ["file1.jpg", "file2.pdf"]
  },
  "security": {
    "hasPin": true,
    "expiresAt": 1693920000000,
    "maxDownloads": 10
  },
  "createdAt": 1693920000000
}
```

#### Upload Single File
```http
POST /api/upload/single
Content-Type: multipart/form-data

file: File             # Single file
customSlug?: string    # Custom link slug
pin?: string          # 4-digit PIN
ttl?: number          # TTL in minutes
maxDownloads?: number # Max downloads
```

### Share Endpoints

#### Get Share Information
```http
GET /api/share/:slug/info
```

**Response:**
```json
{
  "slug": "abc123",
  "filesCount": 2,
  "totalSize": 1048576,
  "createdAt": 1693920000000,
  "downloads": 5,
  "maxDownloads": 10,
  "hasPin": true,
  "expiresAt": 1693920000000,
  "fileNames": ["file1.jpg", "file2.pdf"],
  "isExpired": false
}
```

#### Download Files
```http
GET /api/share/:slug/download?pin=1234
```

**Headers (Alternative PIN):**
```http
X-Download-Pin: 1234
```

**Features:**
- Single file: Direct download with range request support
- Multiple files: Auto-generated ZIP archive
- Progress tracking and streaming

#### List All Shares
```http
GET /api/share
```

#### Delete Share
```http
DELETE /api/share/:slug
Content-Type: application/json

{
  "pin": "1234"  // Required if share is PIN protected
}
```

#### Get Download Statistics
```http
GET /api/share/:slug/stats
```

### QR Code Endpoints

#### Generate QR Code
```http
GET /api/qr/:slug?format=png&size=200&pin=1234
```

**Query Parameters:**
- `format`: `png` | `svg` | `dataurl` (default: png)
- `size`: QR code width in pixels (default: 200)
- `pin`: Include PIN in QR code URL

#### Custom QR Code
```http
POST /api/qr/custom
Content-Type: application/json

{
  "data": "https://example.com",
  "format": "dataurl",
  "size": 300,
  "options": {
    "margin": 2,
    "darkColor": "#000000",
    "lightColor": "#FFFFFF",
    "errorLevel": "M"
  }
}
```

#### QR Code Information
```http
GET /api/qr/:slug/info
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:

```env
PORT=5000
NODE_ENV=production
UPLOAD_LIMIT=500MB
MAX_FILES=10
CLEANUP_INTERVAL=60000
CORS_ORIGIN=*
```

### File Upload Limits
- **File Size**: 500MB per file
- **File Count**: 10 files per upload
- **Total Size**: No limit (depends on available disk space)

### Security Settings
- **PIN Format**: Exactly 4 digits
- **TTL Range**: 1-10080 minutes (1 week max)
- **Max Downloads**: 1-1000 downloads
- **Blocked Extensions**: `.exe`, `.bat`, `.cmd`, `.scr`, `.pif`, `.vbs`, `.js`

## 📁 Project Structure

```
backend/
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
├── models/
│   └── Share.js           # Share data model and logic
├── routes/
│   ├── upload.js          # Upload endpoints
│   ├── share.js           # Share management endpoints
│   └── qr.js              # QR code generation endpoints
├── uploads/               # Temporary file storage
└── README.md              # This file
```

## 🚨 Error Codes

### Upload Errors
- `NO_FILES` - No files provided
- `NO_FILE` - No single file provided
- `INVALID_PIN_FORMAT` - PIN must be 4 digits
- `INVALID_TTL` - TTL out of valid range
- `INVALID_MAX_DOWNLOADS` - Max downloads out of range
- `FILE_TOO_LARGE` - File exceeds 500MB limit
- `TOO_MANY_FILES` - More than 10 files uploaded
- `UPLOAD_FAILED` - General upload failure

### Share Errors
- `SHARE_NOT_FOUND` - Share doesn't exist
- `SHARE_EXPIRED` - Share has expired
- `DOWNLOAD_LIMIT_REACHED` - Max downloads exceeded
- `INVALID_PIN` - Incorrect PIN provided
- `PIN_REQUIRED` - PIN required for protected share
- `FILE_NOT_FOUND` - File missing from server
- `NO_FILES_FOUND` - No files available for download

### QR Code Errors
- `QR_GENERATION_FAILED` - Failed to generate QR code
- `NO_DATA` - No data provided for custom QR
- `CUSTOM_QR_FAILED` - Custom QR generation failed

## 🔄 Data Flow

1. **Upload**: Files uploaded → Stored temporarily → Share created → QR generated
2. **Download**: Share validated → PIN checked → Files streamed/zipped → Download count incremented
3. **Cleanup**: Expired shares automatically deleted → Files removed from disk

## 🛡️ Security Features

### Input Validation
- File type validation
- Size limit enforcement
- PIN format validation
- TTL range checking

### Data Protection
- SHA-256 PIN hashing with salt
- No permanent file storage
- Automatic cleanup of expired data
- Memory-only share metadata

### Rate Limiting (Recommended)
For production, consider adding rate limiting middleware:

```bash
npm install express-rate-limit
```

## 🚀 Production Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name sharelink-backend
pm2 startup
pm2 save
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Setup
- Set `NODE_ENV=production`
- Configure proper CORS origins
- Set up reverse proxy (nginx)
- Enable HTTPS
- Configure file upload limits

## 🤝 API Integration

### Frontend Integration Example
```javascript
// Upload files
const formData = new FormData();
files.forEach(file => formData.append('files', file));
formData.append('pin', '1234');
formData.append('ttl', '60');

const response = await fetch('http://localhost:5000/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Share URL:', result.url);
console.log('QR Code:', result.qrCode);
```

### Download with PIN
```javascript
const downloadUrl = `http://localhost:5000/api/share/abc123/download?pin=1234`;
window.open(downloadUrl, '_blank');
```

## 📞 Support

- **Email**: ankit.meena@outlook.in
- **GitHub**: [@ankitmeena023](https://github.com/ankitmeena023)

## 📄 License

MIT License - see LICENSE file for details.

---

⭐ **Built with passion by Ankit Meena** ⭐
