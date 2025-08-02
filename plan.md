# Sparks - Album Feature Development Plan

This document outlines the detailed plan for implementing the new album management feature for event organizers and participants.

## 1. Guiding Principles & Core Concepts

- **Unified Data, Segregated Presentation**: The system will use a single, unified data model for all images but will provide a tailored UI for each user persona (Participant vs. Organizer).
- **Organizer-First Curation**: All photos uploaded by an organizer **must** be assigned to an album, ensuring all official content is structured.
- **Role-Based Access Control (RBAC)**: All organizer-specific functionality, both in the backend API and frontend UI, will be strictly protected and accessible only to users in the `Organizers` Cognito group.

## 2. Data Model Changes (`data_model.md`)

- **`USER` Entity**: Add a `role` attribute to distinguish between `PARTICIPANT` and `ORGANIZER`.
- **`ALBUM` Entity**: A new entity to store album metadata (title, description, creator).
- **`ALBUM_IMAGE` Entity**: A new linking entity to create a many-to-many relationship between albums and images.

## 3. Backend Implementation (`src/express-api`)

### Phase 3.1: Foundation & Authorization (Completed)

- **[COMPLETED]** Create `isOrganizer` middleware in `middleware/auth.js` to protect routes by checking for the `Organizers` Cognito group.
- **[COMPLETED]** Create the new route file at `routes/albums.js`.
- **[COMPLETED]** Register the `/albums` router in the main `index.js` entry point.

### Phase 3.2: API Endpoint Implementation (Completed)

- **[COMPLETED] `POST /albums`**: Create a new album. (Organizer only)
- **[COMPLETED] `GET /albums`**: List all albums for the logged-in organizer. (Organizer only)
- **[COMPLETED] `GET /albums/:albumId`**: Retrieve details for a single album. (Organizer only)
- **[COMPLETED] `POST /albums/:albumId/images`**: Add an existing image to an album. (Organizer only)
- **[COMPLETED] `GET /albums/:albumId/images`**: List all images within a specific album. (Any authenticated user)

## 4. Frontend Implementation (`webUI`)

### Phase 4.1: Organizer Foundation (Completed)

- **[COMPLETED]** Create a placeholder `Dashboard.vue` page for the organizer.
- **[COMPLETED]** Create a `Forbidden.vue` page for unauthorized access attempts.
- **[COMPLETED]** Update the router in `router/index.js` to add a protected `/organizer` route using a `requiresOrganizer` meta flag.
- **[COMPLETED]** Update `BottomNavigation.vue` to conditionally show a "Manage" link for organizers.

### Phase 4.2: Organizer Dashboard UI (Current Phase)

- **[IN PROGRESS]** Create a new `albumService.js` in `src/services` to handle all API calls to the `/albums` endpoints.
- **[TODO]** On the `Dashboard.vue` page, fetch and display the list of albums belonging to the organizer.
- **[TODO]** Implement a UI (e.g., a modal dialog) for creating a new album.
- **[TODO]** Implement the specialized organizer photo upload UI that requires album selection before uploading.
- **[TODO]** Build the UI to view and manage the photos within a specific album (e.g., remove photos).

### Phase 4.3: Participant Experience UI (Upcoming)

- **[TODO]** Add an "Albums" tab to the main navigation for all users.
- **[TODO]** Build the UI to display the public list of all official albums.
- **[TODO]** Build the UI to display the photos within a selected album.
- **[TODO]** Implement the `Official` and `Community` filters on the main photo feed and face recognition results pages.
