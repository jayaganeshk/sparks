import EXIF from 'exif-js';

/**
 * EXIF Orientation values and their corresponding CSS transforms
 * 1 = Normal (0°)
 * 2 = Flip horizontal
 * 3 = Rotate 180°
 * 4 = Flip vertical
 * 5 = Rotate 90° CW + flip horizontal
 * 6 = Rotate 90° CW
 * 7 = Rotate 90° CCW + flip horizontal  
 * 8 = Rotate 90° CCW
 */
const ORIENTATION_TRANSFORMS = {
  1: '', // Normal
  2: 'scaleX(-1)', // Flip horizontal
  3: 'rotate(180deg)', // Rotate 180°
  4: 'scaleY(-1)', // Flip vertical
  5: 'rotate(90deg) scaleX(-1)', // Rotate 90° CW + flip horizontal
  6: 'rotate(90deg)', // Rotate 90° CW
  7: 'rotate(-90deg) scaleX(-1)', // Rotate 90° CCW + flip horizontal
  8: 'rotate(-90deg)', // Rotate 90° CCW
};

/**
 * Get EXIF orientation from an image URL
 * @param {string} imageUrl - The image URL
 * @returns {Promise<number>} - The orientation value (1-8)
 */
export const getImageOrientation = (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      EXIF.getData(img, function () {
        const orientation = EXIF.getTag(this, 'Orientation') || 1;
        resolve(orientation);
      });
    };

    img.onerror = () => {
      // If image fails to load or EXIF reading fails, assume normal orientation
      resolve(1);
    };

    img.src = imageUrl;
  });
};

/**
 * Get CSS transform string for a given orientation
 * @param {number} orientation - EXIF orientation value (1-8)
 * @returns {string} - CSS transform string
 */
export const getOrientationTransform = (orientation) => {
  return ORIENTATION_TRANSFORMS[orientation] || '';
};

/**
 * Check if orientation requires dimension swap (for 90° rotations)
 * @param {number} orientation - EXIF orientation value (1-8)
 * @returns {boolean} - True if width/height should be swapped
 */
export const shouldSwapDimensions = (orientation) => {
  return [5, 6, 7, 8].includes(orientation);
};

/**
 * Get orientation info for an image
 * @param {string} imageUrl - The image URL
 * @returns {Promise<Object>} - Object with orientation, transform, and shouldSwap
 */
export const getImageOrientationInfo = async (imageUrl) => {
  try {
    const orientation = await getImageOrientation(imageUrl);
    return {
      orientation,
      transform: getOrientationTransform(orientation),
      shouldSwap: shouldSwapDimensions(orientation),
      isRotated: orientation !== 1
    };
  } catch (error) {
    console.warn('Failed to get image orientation:', error);
    return {
      orientation: 1,
      transform: '',
      shouldSwap: false,
      isRotated: false
    };
  }
};

/**
 * Create a composable for managing image orientation
 * @returns {Object} - Composable with reactive orientation management
 */
export const useImageOrientation = () => {
  const orientationCache = new Map();

  const getOrientationForImage = async (imageUrl) => {
    if (!imageUrl) return { orientation: 1, transform: '', shouldSwap: false, isRotated: false };

    // Check cache first
    if (orientationCache.has(imageUrl)) {
      return orientationCache.get(imageUrl);
    }

    // Get orientation info
    const info = await getImageOrientationInfo(imageUrl);

    // Cache the result
    orientationCache.set(imageUrl, info);

    return info;
  };

  const clearOrientationCache = () => {
    orientationCache.clear();
  };

  return {
    getOrientationForImage,
    clearOrientationCache
  };
};
