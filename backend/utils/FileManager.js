const fs = require('fs');
const path = require('path');

class FileManager {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads');
    this.ensureUploadsDir();
  }

  ensureUploadsDir() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
      console.log('📁 Created uploads directory');
    }
  }

  // Get file stats
  getFileStats(filePath) {
    try {
      return fs.statSync(filePath);
    } catch (error) {
      return null;
    }
  }

  // Check if file exists
  fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  // Delete file safely
  deleteFile(filePath) {
    try {
      if (this.fileExists(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted file: ${path.basename(filePath)}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error.message);
      return false;
    }
  }

  // Delete multiple files
  deleteFiles(filePaths) {
    let deletedCount = 0;
    filePaths.forEach(filePath => {
      if (this.deleteFile(filePath)) {
        deletedCount++;
      }
    });
    return deletedCount;
  }

  // Get directory size
  getDirectorySize(dirPath = this.uploadsDir) {
    let totalSize = 0;
    try {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      });
    } catch (error) {
      console.error('Error calculating directory size:', error.message);
    }
    return totalSize;
  }

  // Get file count in uploads directory
  getFileCount(dirPath = this.uploadsDir) {
    try {
      const files = fs.readdirSync(dirPath);
      return files.length;
    } catch (error) {
      console.error('Error counting files:', error.message);
      return 0;
    }
  }

  // Clean up old files (older than specified hours)
  cleanupOldFiles(hoursOld = 24) {
    const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000);
    let deletedCount = 0;

    try {
      const files = fs.readdirSync(this.uploadsDir);
      files.forEach(file => {
        const filePath = path.join(this.uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
          if (this.deleteFile(filePath)) {
            deletedCount++;
          }
        }
      });
      
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} old files`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    }

    return deletedCount;
  }

  // Get file info
  getFileInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        name: path.basename(filePath),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: path.extname(filePath),
        exists: true
      };
    } catch (error) {
      return {
        name: path.basename(filePath),
        exists: false,
        error: error.message
      };
    }
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get uploads directory stats
  getUploadsStats() {
    const totalSize = this.getDirectorySize();
    const fileCount = this.getFileCount();
    
    return {
      totalSize,
      totalSizeFormatted: this.formatFileSize(totalSize),
      fileCount,
      directory: this.uploadsDir
    };
  }

  // Validate file path (security check)
  isValidFilePath(filePath) {
    const normalizedPath = path.normalize(filePath);
    const uploadsPath = path.normalize(this.uploadsDir);
    
    // Ensure file is within uploads directory
    return normalizedPath.startsWith(uploadsPath);
  }

  // Move file
  moveFile(sourcePath, destinationPath) {
    try {
      if (!this.fileExists(sourcePath)) {
        throw new Error('Source file does not exist');
      }

      // Ensure destination directory exists
      const destDir = path.dirname(destinationPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.renameSync(sourcePath, destinationPath);
      console.log(`📁 Moved file: ${path.basename(sourcePath)} → ${path.basename(destinationPath)}`);
      return true;
    } catch (error) {
      console.error('Error moving file:', error.message);
      return false;
    }
  }

  // Copy file
  copyFile(sourcePath, destinationPath) {
    try {
      if (!this.fileExists(sourcePath)) {
        throw new Error('Source file does not exist');
      }

      // Ensure destination directory exists
      const destDir = path.dirname(destinationPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.copyFileSync(sourcePath, destinationPath);
      console.log(`📋 Copied file: ${path.basename(sourcePath)} → ${path.basename(destinationPath)}`);
      return true;
    } catch (error) {
      console.error('Error copying file:', error.message);
      return false;
    }
  }
}

module.exports = new FileManager();
