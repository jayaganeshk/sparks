# Sparks UI Migration Plan

This document outlines the plan to migrate the Sparks UI from the old implementation to a new Vue 3 project with the latest Vuetify version, using our new Express API and AWS Amplify UI for authentication.

## Current UI Architecture (Old Repository)

- **Framework**: Vue 3
- **UI Library**: Vuetify 3
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **Authentication**: Direct AWS Cognito integration with hosted UI
- **Data Access**: Direct AWS SDK calls to DynamoDB and S3
- **Build Tool**: Vite

## Target Architecture

- **Framework**: Vue 3 (latest version)
- **UI Library**: Vuetify 3 (latest version)
- **State Management**: Pinia 2
- **Routing**: Vue Router 4
- **Authentication**: AWS Amplify UI components
- **Data Access**: Express.js API endpoints
- **Build Tool**: Vite 4+
- **Deployment**: AWS Amplify

## Migration Strategy

### 1. Project Setup

- [ ] Initialize a new Vue 3 project with Vite
- [ ] Install and configure latest Vuetify
- [ ] Set up TypeScript for better type safety
- [ ] Configure ESLint and Prettier for code quality
- [ ] Set up project structure (views, components, services, stores)
- [ ] Configure environment variables for different deployment stages

### 2. Authentication Implementation

- [ ] Install AWS Amplify and Amplify UI Vue components
- [ ] Configure Amplify with existing Cognito user pool
- [ ] Implement sign-in component
- [ ] Implement sign-up component
- [ ] Implement password recovery flow
- [ ] Create authentication store with Pinia
- [ ] Implement protected routes with navigation guards

### 3. API Service Layer

- [ ] Create base API service with Axios or Fetch
- [ ] Implement authentication token management
- [ ] Create services for each API endpoint group:
  - [ ] Photos service
  - [ ] Users service
  - [ ] Persons service
  - [ ] Me service
  - [ ] Upload service
  - [ ] Events service
  - [ ] Livestream service
- [ ] Implement error handling and response interceptors
- [ ] Add request caching where appropriate

### 4. State Management

- [ ] Create Pinia stores:
  - [ ] Auth store
  - [ ] Photos store
  - [ ] Users store
  - [ ] Persons store
  - [ ] Settings store
- [ ] Implement actions that call API services
- [ ] Set up proper state persistence
- [ ] Implement loading and error states

### 5. Core Components

- [ ] Create layout components:
  - [ ] App bar with navigation (v-app-bar)
  - [ ] Bottom navigation (v-bottom-navigation)
  - [ ] Main content area (v-main)
- [ ] Migrate existing components:
  - [ ] AppBar.vue - Simple app bar with logo
  - [ ] BottomNavigation.vue - Navigation with dynamic menu items
  - [ ] ImageUpload.vue - Floating action button with upload functionality
  - [ ] LiveAlertBanner.vue - Banner for livestream notifications
- [ ] Create reusable UI components:
  - [ ] Photo card component (v-card, v-img)
  - [ ] User avatar component (v-avatar)
  - [ ] Loading indicators (v-progress-circular)
  - [ ] Notification components (v-snackbar, v-alert)
  - [ ] Dialog components (v-dialog)
  - [ ] Confirmation dialogs

### 6. Views Implementation

- [ ] Implement Home view with photo grid
- [ ] Implement User Profile view
- [ ] Implement Photo Detail view
- [ ] Implement Person/Face Recognition view
- [ ] Implement Upload view
- [ ] Implement Settings view
- [ ] Implement Admin view (if applicable)

### 7. File Upload Implementation

- [ ] Implement image selection and preview
- [ ] Add image compression before upload
- [ ] Integrate with `/upload-url` endpoint
- [ ] Implement progress indicators
- [ ] Add error handling and retry logic

### 8. UX Enhancements

- [ ] Implement responsive design for all views
- [ ] Add lazy loading for images
- [ ] Implement infinite scrolling for lists
- [ ] Add animations and transitions
- [ ] Improve accessibility (ARIA attributes, keyboard navigation)
- [ ] Implement dark mode support

### 9. Asset Migration

- [ ] Migrate SCSS styles from old repository
- [ ] Import and configure logo and brand assets
- [ ] Migrate Vuetify theme configuration
- [ ] Transfer custom fonts and icons

### 10. Testing

- [ ] Set up testing framework (Vitest or Jest)
- [ ] Write unit tests for critical components
- [ ] Write integration tests for API interactions
- [ ] Implement end-to-end tests for critical user flows

### 11. Deployment

- [ ] Configure AWS Amplify for hosting
- [ ] Set up CI/CD pipeline
- [ ] Configure environment-specific builds
- [ ] Implement monitoring and analytics
- [ ] Set up error tracking

## Implementation Timeline

1. **Week 1**: Project setup, authentication implementation
2. **Week 2**: Core components and views migration
3. **Week 3**: API integration and state management
4. **Week 4**: UX enhancements, testing, and deployment

## Key Differences from Old UI

1. **Authentication Flow**: Moving from Cognito hosted UI to Amplify UI components for a more integrated experience.
2. **Data Access**: Replacing direct AWS SDK calls with Express API endpoints for better security and maintainability.
3. **TypeScript**: Adding type safety to improve code quality and developer experience.
4. **Responsive Design**: Enhancing the mobile experience with improved responsive layouts.
5. **Asset Reuse**: Migrating and improving existing SCSS, logos, and theme configurations.

## Migration Approach

We will follow a "rebuild and replace" approach rather than trying to incrementally update the old codebase. This will allow us to:

1. Start with a clean, modern foundation
2. Avoid technical debt from the old implementation
3. Implement best practices from the beginning
4. Take advantage of the latest features in Vue 3 and Vuetify

The migration will focus on preserving the core functionality and user experience while improving the technical implementation and adding new features where appropriate.
