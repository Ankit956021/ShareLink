# 📤 ShareLink - Instant File Sharing

Beautiful, secure, and ephemeral file sharing with QR codes, PIN protection, and newsletter management.

**🔗 GitHub Repository:** [https://github.com/Ankit956021/ShareLink.git](https://github.com/Ankit956021/ShareLink.git)

## ✨ Features

- **📁 Drag & Drop Upload** - Intuitive file upload interface
- **🔗 Custom Short Links** - Create personalized share URLs
- **🔒 PIN Protection** - 4-digit PIN security for sensitive files
- **📱 QR Code Generation** - Easy sharing via QR codes
- **⏰ Auto-Expiry** - Time-based link expiration (TTL)
- **📊 Download Limits** - Control maximum download count
- **🎨 Beautiful UI** - Glassmorphism design with smooth animations
- **📧 Newsletter System** - Email subscription management
- **🌐 Mobile Responsive** - Works perfectly on all devices
- **🚀 Docker Ready** - Easy deployment with Docker Compose

## 🚀 Quick Start

### Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/Ankit956021/ShareLink.git
cd ShareLink
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Start the servers**
```bash
# Terminal 1 - Backend (Port 5001)
cd backend
npm run dev

# Terminal 2 - Frontend (Port 3001)
cd frontend
npm start
```

4. **Open your browser**
- Frontend: http://localhost:3001
- Backend API: http://localhost:5001/api
- Newsletter Admin: http://localhost:3001/newsletter-admin.html

### Production Deployment

#### Option 1: Docker Compose (Recommended)

1. **Prepare environment**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

2. **Deploy with one command**
```bash
./deploy.sh
```

#### Option 2: Manual Docker

1. **Build images**
```bash
# Backend
cd backend
docker build -t sharelink-backend .

# Frontend
cd ../frontend
docker build -t sharelink-frontend .
```

2. **Run containers**
```bash
# Backend
docker run -d -p 5001:5001 \
  -v $(pwd)/backend/uploads:/app/uploads \
  -v $(pwd)/backend/data:/app/data \
  --name sharelink-backend \
  sharelink-backend

# Frontend
docker run -d -p 3001:3001 \
  --link sharelink-backend \
  --name sharelink-frontend \
  sharelink-frontend
```

#### Option 3: Cloud Deployment

**Heroku:**
```bash
# Install Heroku CLI
# Create apps
heroku create sharelink-backend
heroku create sharelink-frontend

# Deploy backend
cd backend
git init
heroku git:remote -a sharelink-backend
git add .
git commit -m "Deploy backend"
git push heroku main

# Deploy frontend
cd ../frontend
git init
heroku git:remote -a sharelink-frontend
git add .
git commit -m "Deploy frontend"
git push heroku main
```

**DigitalOcean App Platform:**
1. Connect your GitHub repository
2. Configure build settings:
   - Backend: `cd backend && npm install && npm start`
   - Frontend: `cd frontend && npm install && npm start`
3. Set environment variables
4. Deploy

**AWS ECS/Railway/Render:**
- Use the provided Dockerfiles
- Set environment variables
- Configure health checks

## 📧 Newsletter Email Management

### How to Access Email Data:

1. **Admin Panel**: Visit `/newsletter-admin.html`
2. **API Endpoints**:
   - `GET /api/newsletter/analytics` - Subscription statistics
   - `GET /api/newsletter/export?format=csv` - Download CSV
   - `GET /api/newsletter/export?format=json` - Download JSON

3. **File Storage**: Emails are stored in `backend/data/newsletter.json`

### Export Email List:
```bash
# CSV format
curl "http://localhost:5001/api/newsletter/export?format=csv" > subscribers.csv

# JSON format
curl "http://localhost:5001/api/newsletter/export?format=json" > subscribers.json
```

## 🔧 Configuration

### Environment Variables

Create `.env` file in project root:

```env
NODE_ENV=production
BACKEND_PORT=5001
FRONTEND_PORT=3001
API_BASE=https://your-domain.com/api
MAX_FILE_SIZE=500MB
MAX_FILES=10
CORS_ORIGIN=https://your-domain.com
```

### Custom Domain Setup

1. **Update nginx.conf**:
```nginx
server_name your-domain.com www.your-domain.com;
```

2. **SSL Certificate** (Let's Encrypt):
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

3. **Update environment variables**:
```env
API_BASE=https://your-domain.com/api
CORS_ORIGIN=https://your-domain.com
```

## 📊 Monitoring & Analytics

### Health Checks
- Frontend: `http://localhost/health`
- Backend: `http://localhost/api/health`
- Newsletter: `http://localhost/api/newsletter/health`

### Docker Health Monitoring
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Monitor resources
docker stats
```

## 🛡️ Security Features

- **Rate Limiting**: API requests are rate-limited
- **File Type Validation**: Dangerous file types blocked
- **CORS Protection**: Configured for your domain
- **Security Headers**: X-Content-Type-Options, X-Frame-Options
- **PIN Protection**: 4-digit PIN for sensitive shares
- **Auto-Expiry**: Time-based link expiration

## 🔧 Development

### Project Structure
```
file_sharing_app/
├── backend/              # Express.js API server
│   ├── models/          # Data models (Share, Newsletter)
│   ├── routes/          # API routes
│   ├── uploads/         # File storage
│   └── data/           # Newsletter data
├── frontend/            # Static file server
├── docker-compose.yml   # Multi-container setup
├── nginx.conf          # Reverse proxy config
└── deploy.sh           # Deployment script
```

### Adding Features

1. **New API Endpoint**:
   - Add route in `backend/routes/`
   - Register in `backend/server.js`

2. **Frontend Updates**:
   - Modify `frontend/app.js`
   - Update `frontend/index.html`

3. **Database Integration**:
   - Replace file-based storage with database
   - Add database service to `docker-compose.yml`

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**:
```bash
# Check what's using the port
lsof -i :5001
lsof -i :3001

# Kill processes if needed
kill -9 <PID>
```

2. **Docker issues**:
```bash
# Reset Docker
docker-compose down
docker system prune -f
docker-compose up --build
```

3. **Permission errors**:
```bash
# Fix file permissions
chmod +x deploy.sh
sudo chown -R $USER:$USER uploads/
```

### Logs

```bash
# Application logs
docker-compose logs -f sharelink-backend
docker-compose logs -f sharelink-frontend

# Nginx logs
docker-compose logs -f nginx
```

## 📝 API Documentation

### Upload Files
```bash
curl -X POST http://localhost:5001/api/upload \
  -F "files=@file1.txt" \
  -F "files=@file2.jpg" \
  -F "pin=1234" \
  -F "ttl=60"
```

### Newsletter Subscribe
```bash
curl -X POST http://localhost:5001/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📞 Support

- **Email**: ankit.meena@outlook.in
- **GitHub**: [@ankitmeena023](https://github.com/ankitmeena023)
- **LinkedIn**: [ankitmeena023](https://linkedin.com/in/ankitmeena023)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by Ankit Meena**
