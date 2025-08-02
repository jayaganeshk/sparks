/**
 * Album service for interacting with the album API endpoints
 */
import apiService from './api';

export const albumService = {
  /**
   * Get all albums for the logged-in organizer
   * @returns {Promise} - Response promise with an array of albums
   */
  getAlbums: () => {
    return apiService.get('/albums');
  },

  /**
   * Create a new album
   * @param {{title: string, description: string}} albumData - The data for the new album
   * @returns {Promise} - Response promise with the newly created album object
   */
  createAlbum: (albumData) => {
    return apiService.post('/albums', albumData);
  },

  /**
   * Get a specific album by its ID
   * @param {string} albumId - The ID of the album
   * @returns {Promise} - Response promise with album details
   */
  getAlbumById: (albumId) => {
    return apiService.get(`/albums/${albumId}`);
  },

  /**
   * Add an image to a specific album
   * @param {string} albumId - The ID of the album
   * @param {string} imageId - The ID of the image to add
   * @returns {Promise} - Response promise with the album-image link object
   */
  addImageToAlbum: (albumId, imageId) => {
    return apiService.post(`/albums/${albumId}/images`, { imageId });
  },

  /**
   * Get all images within a specific album
   * @param {string} albumId - The ID of the album
   * @returns {Promise} - Response promise with an array of full image objects
   */
  getImagesInAlbum: (albumId) => {
    return apiService.get(`/albums/${albumId}/images`);
  },

  /**
   * Remove an image from a specific album
   * @param {string} albumId - The ID of the album
   * @param {string} imageId - The ID of the image to remove
   * @returns {Promise} - Response promise with the result of the operation
   */
  removeImageFromAlbum: (albumId, imageId) => {
    return apiService.delete(`/albums/${albumId}/images/${imageId}`);
  },

  /**
   * Set an image as the album cover
   * @param {string} albumId - The ID of the album
   * @param {string} imageId - The ID of the image to set as cover
   * @returns {Promise} - Response promise with the updated album object
   */
  setAlbumCover: (albumId, imageId) => {
    return apiService.put(`/albums/${albumId}/cover`, { imageId });
  },

  /**
   * Update the privacy setting of an album
   * @param {string} albumId - The ID of the album
   * @param {boolean} isPublic - Whether the album should be public
   * @returns {Promise} - Response promise with the updated album object
   */
  updateAlbumPrivacy: (albumId, isPublic) => {
    return apiService.put(`/albums/${albumId}/privacy`, { isPublic });
  },
};

export default albumService;
