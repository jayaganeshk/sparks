# Sparks API Plan

This document outlines the API endpoints for the Sparks application, served by an Express.js backend.

| Method | Endpoint                               | Description                                                                 | Authentication |
| :----- | :------------------------------------- | :-------------------------------------------------------------------------- | :------------- |
| `GET`  | `/photos`                              | Get a paginated list of all photos.                                         | Cognito        |
| `GET`  | `/users`                               | Get a list of all users who have uploaded photos.                           | Cognito        |
| `GET`  | `/users/:email/photos`                 | Get a paginated list of photos uploaded by a specific user.                 | Cognito        |
| `GET`  | `/persons`                             | Get a paginated list of all unique people detected across all photos.       | Cognito        |
| `GET`  | `/persons/:personId/photos`            | Get a paginated list of photos that a specific person is tagged in.         | Cognito        |
| `GET`  | `/me/limit`                            | Get the current user's upload limit.                                        | Cognito        |
| `PUT`  | `/me/limit`                            | Set the current user's upload limit. (Admin only)                           | Cognito        |
| `PUT`  | `/me/profile`                          | Update the current user's display name.                                     | Cognito        |
| `GET`  | `/livestream`                          | Check for and retrieve the current live stream configuration.               | Cognito        |
| `POST` | `/events`                              | Log a web event.                                                            | Cognito        |
| `GET`  | `/upload-url`                          | Get a pre-signed S3 URL for uploading a new photo.                          | Cognito        |
