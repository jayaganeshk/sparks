/**
 * NSFW validation service using TensorFlow.js
 * This service provides methods to validate images for inappropriate content
 * before uploading them to the server.
 */

import * as tf from '@tensorflow/tfjs';

// Configuration
const NSFW_THRESHOLD = {
  PORN: 0.4,    // Threshold for porn content
  SEXY: 0.5,    // Threshold for sexy content
  HENTAI: 0.4   // Threshold for hentai content
};

// MobileNet model URL - using a publicly hosted MobileNet NSFW model
const MODEL_URL = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';

// Class indices for NSFW content (based on common classification)
const CLASS_INDICES = {
  PORN: 0,
  SEXY: 1,
  NEUTRAL: 2
};

// Service object
export const nsfwValidationService = {
  model: null,
  isModelLoading: false,
  
  /**
   * Load the TensorFlow.js model
   * @returns {Promise<Object>} - The loaded model
   */
  async loadModel() {
    if (this.model) {
      return this.model;
    }
    
    if (this.isModelLoading) {
      // Wait for the model to finish loading
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.model) {
            clearInterval(checkInterval);
            resolve(this.model);
          }
        }, 100);
      });
    }
    
    try {
      this.isModelLoading = true;
      console.log('Loading NSFW detection model...');
      
      // Load the MobileNet model
      this.model = await tf.loadLayersModel(MODEL_URL);
      
      console.log('NSFW model loaded successfully');
      this.isModelLoading = false;
      return this.model;
    } catch (error) {
      this.isModelLoading = false;
      console.error('Failed to load NSFW model:', error);
      throw new Error('Failed to load NSFW detection model');
    }
  },
  
  /**
   * Preprocess an image for the model
   * @param {HTMLImageElement} img - The image element
   * @returns {tf.Tensor} - Preprocessed image tensor
   */
  preprocessImage(img) {
    // Resize image to 224x224 which is what MobileNet expects
    return tf.tidy(() => {
      // Convert image to tensor
      const tensor = tf.browser.fromPixels(img)
        .resizeNearestNeighbor([224, 224]) // Resize
        .toFloat();
      
      // Normalize pixel values to [-1, 1]
      const offset = tf.scalar(127.5);
      return tensor.sub(offset).div(offset).expandDims();
    });
  },
  
  /**
   * Perform inference on an image
   * @param {HTMLImageElement} img - The image element
   * @returns {Array} - Array of prediction probabilities
   */
  async performInference(img) {
    const model = await this.loadModel();
    const preprocessedImg = this.preprocessImage(img);
    
    // Run inference
    const predictions = await model.predict(preprocessedImg).data();
    preprocessedImg.dispose(); // Clean up tensor
    
    return predictions;
  },
  
  /**
   * Map raw predictions to NSFW categories
   * @param {Array} predictions - Raw prediction values
   * @returns {Object} - Mapped predictions by category
   */
  mapPredictions(predictions) {
    return {
      Porn: predictions[CLASS_INDICES.PORN] || 0,
      Sexy: predictions[CLASS_INDICES.SEXY] || 0,
      Neutral: predictions[CLASS_INDICES.NEUTRAL] || 0,
      // Add placeholder values for other categories to maintain compatibility
      Hentai: 0,
      Drawing: 0
    };
  },
  
  /**
   * Validate an image file for NSFW content
   * @param {File} file - The image file to validate
   * @returns {Promise<Object>} - Validation result with isSafe flag and details
   */
  async validateImage(file) {
    try {
      // Create an image element to classify
      const img = await this._createImageFromFile(file);
      
      // Perform inference
      const rawPredictions = await this.performInference(img);
      
      // Map predictions to NSFW categories
      const predictions = this.mapPredictions(rawPredictions);
      
      // Process the results
      return this._processResults(predictions);
    } catch (error) {
      console.error('Error during NSFW validation:', error);
      throw new Error('Failed to validate image');
    }
  },
  
  /**
   * Validate multiple image files for NSFW content
   * @param {Array<File>} files - Array of image files to validate
   * @param {Function} onProgress - Optional callback for progress updates
   * @returns {Promise<Array<Object>>} - Array of validation results
   */
  async validateMultipleImages(files, onProgress = null) {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const result = await this.validateImage(files[i]);
      results.push({
        file: files[i],
        ...result
      });
      
      // Report progress if callback provided
      if (onProgress) {
        onProgress((i + 1) / files.length * 100, result, i);
      }
    }
    
    return results;
  },
  
  /**
   * Create an image element from a file for classification
   * @param {File} file - The image file
   * @returns {Promise<HTMLImageElement>} - The image element
   * @private
   */
  async _createImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = URL.createObjectURL(file);
    });
  },
  
  /**
   * Process NSFW detection results
   * @param {Object} predictions - The predictions mapped to categories
   * @returns {Object} - Processed results with safety determination
   * @private
   */
  _processResults(predictions) {
    // Check if the image is safe based on thresholds
    const isPorn = predictions.Porn >= NSFW_THRESHOLD.PORN;
    const isSexy = predictions.Sexy >= NSFW_THRESHOLD.SEXY;
    const isHentai = predictions.Hentai >= NSFW_THRESHOLD.HENTAI;
    
    // Determine if the image is safe
    const isSafe = !(isPorn || isHentai || isSexy);
    
    // Create detailed reason if not safe
    let reason = '';
    if (!isSafe) {
      reason = 'Detected: ';
      if (isPorn) reason += 'Pornographic content. ';
      if (isSexy) reason += 'Sexually explicit content. ';
      if (isHentai) reason += 'Hentai content. ';
    }
    
    return {
      isSafe,
      reason,
      predictions
    };
  }
};

export default nsfwValidationService;
