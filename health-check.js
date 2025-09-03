#!/usr/bin/env node

/**
 * Health Check Script for ShareLink Application
 * Verifies all components are ready for deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ShareLink Health Check\n');

// Check required files
const requiredFiles = [
  'backend/package.json',
  'frontend/package.json',
  'backend/server.js',
  'frontend/index.html',
  'frontend/app.js',
  'docker-compose.yml',
  'nginx.conf',
  '.env.example',
  'README.md'
];

let allFilesExist = true;

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json dependencies
console.log('\n📦 Checking backend dependencies...');
try {
  const backendPkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
  const requiredDeps = ['express', 'multer', 'cors', 'qrcode', 'archiver', 'uuid', 'mime-types'];
  
  requiredDeps.forEach(dep => {
    if (backendPkg.dependencies && backendPkg.dependencies[dep]) {
      console.log(`  ✅ ${dep}: ${backendPkg.dependencies[dep]}`);
    } else {
      console.log(`  ❌ ${dep} - MISSING`);
      allFilesExist = false;
    }
  });
} catch (error) {
  console.log('  ❌ Error reading backend package.json');
  allFilesExist = false;
}

// Check frontend package.json
console.log('\n🌐 Checking frontend package...');
try {
  const frontendPkg = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
  console.log(`  ✅ Frontend package configured: ${frontendPkg.name}`);
} catch (error) {
  console.log('  ❌ Error reading frontend package.json');
  allFilesExist = false;
}

// Check Docker configuration
console.log('\n🐳 Checking Docker configuration...');
if (fs.existsSync('docker-compose.yml')) {
  console.log('  ✅ Docker Compose configured');
} else {
  console.log('  ❌ Docker Compose missing');
  allFilesExist = false;
}

// Check deployment scripts
console.log('\n🚀 Checking deployment readiness...');
const deploymentFiles = ['deploy.sh', 'DEPLOYMENT_GUIDE.sh'];
deploymentFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ⚠️  ${file} - Optional deployment script`);
  }
});

// Final result
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 SUCCESS: ShareLink is ready for deployment!');
  console.log('\n🔗 GitHub Repository: https://github.com/Ankit956021/ShareLink.git');
  console.log('\n📋 Next Steps:');
  console.log('  1. Start development: npm run dev (in backend/)');
  console.log('  2. Deploy with Docker: docker-compose up');
  console.log('  3. Deploy to Heroku: git push heroku main');
  console.log('  4. Access admin panel: /newsletter-admin.html');
  process.exit(0);
} else {
  console.log('❌ FAILED: Some components are missing');
  console.log('Please check the missing files above and ensure all dependencies are installed.');
  process.exit(1);
}
