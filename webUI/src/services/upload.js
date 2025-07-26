/**
 * Upload service for interacting with the upload-url API endpoint
 */
import apiService from './api';

export const uploadService = {
  /**
   * Get a pre-signed S3 URL for uploading a new photo
   * @returns {Promise} - Response promise with upload URL, image ID, and key
   */
  getUploadUrl: () => {
    return apiService.get('/upload-url');
  },
  
  /**
   * Upload a file to S3 using a pre-signed URL
   * @param {string} uploadUrl - Pre-signed S3 URL
   * @param {File} file - File to upload
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise} - Response promise
   */
  uploadToS3: (uploadUrl, file, onProgress = null) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Set up progress tracking
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(percentComplete);
          }
        };
      }
      
      // Set up completion handler
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            success: true,
            status: xhr.status
          });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      
      // Set up error handler
      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };
      
      // Open connection and send the file
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }
};

export default uploadService;
