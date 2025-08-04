/**
 * Services index file to export all API services
 */

import apiService from './api';
import photosService from './photos';
import usersService from './users';
import personsService from './persons';
import meService from './me';
import eventsService from './events';
import uploadService from './upload';
import livestreamService from './livestream';
import authService from './auth';
import nsfwValidationService from './nsfwValidation';

// Export all services
export {
  apiService,
  photosService,
  usersService,
  personsService,
  meService,
  eventsService,
  uploadService,
  livestreamService,
  authService,
  nsfwValidationService
};

// Export default as an object containing all services
export default {
  api: apiService,
  photos: photosService,
  users: usersService,
  persons: personsService,
  me: meService,
  events: eventsService,
  upload: uploadService,
  livestream: livestreamService,
  auth: authService,
  nsfwValidation: nsfwValidationService
};
