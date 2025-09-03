# 🚀 ShareLink - Complete Setup & Deployment Guide

## 📧 Newsletter Email Management

### ✅ Email Data Collection Setup Complete!

**Where Your Email Data Goes:**
- **Storage**: `backend/data/newsletter.json`
- **Admin Panel**: `http://your-domain.com/newsletter-admin.html`
- **API Access**: Real-time via REST endpoints

**How to Access Email Subscribers:**

1. **Via Admin Panel** (Recommended):
   ```
   http://localhost:3001/newsletter-admin.html
   ```
   - Live dashboard with real-time statistics
   - Export CSV/JSON with one click
   - Beautiful analytics interface

2. **Via API Endpoints**:
   ```bash
   # Get analytics
   curl http://localhost:5001/api/newsletter/analytics
   
   # Export CSV
   curl "http://localhost:5001/api/newsletter/export?format=csv" > subscribers.csv
   
   # Export JSON
   curl "http://localhost:5001/api/newsletter/export?format=json" > subscribers.json
   ```

3. **Direct File Access**:
   ```bash
   cat backend/data/newsletter.json
   ```

## 🌐 Deployment Options

### Option 1: Heroku (Easiest for Beginners)

**Step 1: Prepare Heroku**
```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login to Heroku
heroku login
```

**Step 2: Deploy Backend**
```bash
# Create backend app
heroku create your-app-name-backend

# Navigate to backend
cd backend

# Deploy backend
git init
git add .
git commit -m "Deploy backend"
heroku git:remote -a your-app-name-backend
git push heroku main
```

**Step 3: Deploy Frontend**
```bash
# Create frontend app
heroku create your-app-name-frontend

# Navigate to frontend
cd ../frontend

# Update API_BASE in app.js
# Change: const API_BASE = 'http://localhost:5001/api';
# To: const API_BASE = 'https://your-app-name-backend.herokuapp.com/api';

# Deploy frontend
git init
git add .
git commit -m "Deploy frontend"
heroku git:remote -a your-app-name-frontend
git push heroku main
```

**Your URLs:**
- Frontend: `https://your-app-name-frontend.herokuapp.com`
- Newsletter Admin: `https://your-app-name-frontend.herokuapp.com/newsletter-admin.html`

### Option 2: Vercel + Railway (Modern & Fast)

**Frontend on Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel

# Follow prompts, then update API_BASE with Railway backend URL
```

**Backend on Railway:**
1. Go to [railway.app](https://railway.app)
2. Connect GitHub repository
3. Select `backend` folder
4. Auto-deploys on every push

### Option 3: DigitalOcean App Platform

1. **Connect GitHub**: Link your repository
2. **Configure Build**:
   - Backend: `cd backend && npm install && npm start`
   - Frontend: `cd frontend && npm install && npm start`
3. **Set Environment Variables**:
   ```
   NODE_ENV=production
   API_BASE=https://your-backend-url/api
   ```
4. **Deploy**: One-click deployment

### Option 4: Docker (Self-Hosted)

**Quick Deploy:**
```bash
# Clone repository
git clone https://github.com/Ankit956021/ShareLink.git
cd ShareLink

# One-command deployment
./deploy.sh
```

**Manual Docker:**
```bash
# Build and run
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## 🔧 Configuration for Production

### Environment Variables

Create `.env` file:
```env
NODE_ENV=production
API_BASE=https://your-domain.com/api
CORS_ORIGIN=https://your-domain.com
MAX_FILE_SIZE=500MB
MAX_FILES=10
```

### Custom Domain Setup

**For Heroku:**
```bash
# Add custom domain
heroku domains:add your-domain.com
heroku domains:add www.your-domain.com

# Get DNS target
heroku domains
```

**Update DNS:**
- Add CNAME record: `www` → `your-app-name.herokuapp.com`
- Add ALIAS/ANAME record: `@` → `your-app-name.herokuapp.com`

**SSL Certificate:**
```bash
# Heroku automatically provides SSL
heroku certs:auto:enable
```

## 📊 Newsletter Analytics & Management

### Dashboard Features:
- **📈 Real-time Statistics**: Total, weekly, monthly subscribers
- **👥 Subscriber List**: Complete email database
- **📄 Export Options**: CSV/JSON download
- **🔄 Live Updates**: Auto-refreshing data
- **📧 Email Validation**: Built-in validation

### API Endpoints:
```bash
# Subscribe
POST /api/newsletter/subscribe
{"email": "user@example.com"}

# Get stats
GET /api/newsletter/analytics

# Export data
GET /api/newsletter/export?format=csv
GET /api/newsletter/export?format=json

# Health check
GET /api/newsletter/health
```

## 🛡️ Security & Monitoring

### Health Checks:
- Frontend: `http://your-domain.com/health`
- Backend: `http://your-domain.com/api/health`
- Newsletter: `http://your-domain.com/api/newsletter/health`

### Security Features:
✅ Rate limiting on API endpoints  
✅ File type validation  
✅ PIN protection for shares  
✅ Auto-expiry for links  
✅ CORS protection  
✅ Security headers  

### Monitoring:
```bash
# Check application status
curl https://your-domain.com/api/health

# Monitor newsletter service
curl https://your-domain.com/api/newsletter/health

# View subscriber count
curl https://your-domain.com/api/newsletter/analytics
```

## 📱 Testing Your Deployment

### 1. Test File Sharing:
- Visit your domain
- Upload a test file
- Share the link
- Verify download works

### 2. Test Newsletter:
- Go to your homepage
- Subscribe with a test email
- Check admin panel: `your-domain.com/newsletter-admin.html`
- Export subscriber data

### 3. Test Mobile:
- Open on mobile device
- Test responsive design
- Scan QR codes

## 🚨 Troubleshooting

### Common Issues:

**CORS Errors:**
- Update `API_BASE` in frontend/app.js
- Set correct `CORS_ORIGIN` in backend

**Newsletter Not Working:**
- Check backend logs: `heroku logs --tail -a your-backend-app`
- Verify API endpoints are accessible

**File Upload Fails:**
- Check file size limits (500MB default)
- Verify file types are allowed

**Database/Email Storage:**
- Newsletter data is stored in `backend/data/newsletter.json`
- For production, consider using a database

## 🎯 Next Steps

### Immediate Actions:
1. ✅ Deploy to your preferred platform
2. ✅ Set up custom domain (optional)
3. ✅ Test all functionality
4. ✅ Share your app link!

### Future Enhancements:
- 📧 Email notifications for new shares
- 🔐 User authentication system
- 📊 Advanced analytics dashboard
- 🌐 Progressive Web App (PWA)
- 🔄 Real-time collaboration features

## 📞 Support & Resources

**Repository**: [GitHub.com/Ankit956021/ShareLink](https://github.com/Ankit956021/ShareLink)

**Deployment Help**:
- Heroku: [devcenter.heroku.com](https://devcenter.heroku.com)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Railway: [docs.railway.app](https://docs.railway.app)
- DigitalOcean: [docs.digitalocean.com](https://docs.digitalocean.com)

**Contact**:
- Email: ankit.meena@outlook.in
- GitHub: [@Ankit956021](https://github.com/Ankit956021)

---

## 🎉 Congratulations!

Your ShareLink application is now:
- ✅ **Newsletter Ready**: Collecting emails automatically
- ✅ **Production Ready**: Fully configured for deployment
- ✅ **Mobile Optimized**: Beautiful on all devices
- ✅ **Secure**: PIN protection & auto-expiry
- ✅ **Scalable**: Docker & cloud platform ready

**Your email subscribers will be automatically collected and accessible via the admin panel!**

Happy sharing! 🚀
