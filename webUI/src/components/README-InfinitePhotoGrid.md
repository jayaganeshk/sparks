# InfinitePhotoGrid Component

A reusable Vue.js component for displaying photos in a responsive grid layout with infinite scrolling and fullscreen viewing capabilities.

## Features

- **Responsive Grid Layout**: Automatically adjusts to different screen sizes (12/6/4/3 columns)
- **Infinite Scrolling**: Uses Vuetify's `v-infinite-scroll` for seamless loading of more photos
- **Fullscreen Dialog**: Click any photo to view it in fullscreen with navigation controls
- **Image Navigation**: Navigate between photos using arrow buttons or keyboard shortcuts
- **Download Functionality**: Download photos directly from the fullscreen view
- **Loading States**: Skeleton loaders and progress indicators for better UX
- **Error Handling**: Graceful error display and recovery
- **Empty States**: Customizable messages when no photos are available
- **Photo Information**: Display metadata like uploader, date, and tags

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `photos` | Array | `[]` | Array of photo objects to display |
| `loading` | Boolean | `false` | Shows loading skeleton when true |
| `error` | String | `null` | Error message to display |
| `hasMore` | Boolean | `true` | Whether more photos can be loaded |
| `emptyMessage` | String | `'No photos found'` | Message shown when no photos available |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `load-more` | None | Emitted when more photos should be loaded |

## Photo Object Structure

Each photo object should have the following structure:

```javascript
{
  PK: "unique-id",           // Primary key
  s3Key: "path/to/image.jpg", // S3 object key
  thumbnailFileName: "path/to/thumb.jpg", // Optional thumbnail
  uploadedBy: "user@example.com", // Optional uploader info
  timestamp: "1640995200000", // Optional timestamp
  fileName: "image.jpg",      // Optional original filename
  tags: ["tag1", "tag2"]      // Optional tags array
}
```

## Usage Examples

### Basic Usage

```vue
<template>
  <InfinitePhotoGrid
    :photos="photos"
    :loading="loading"
    :has-more="hasMore"
    @load-more="loadMorePhotos"
  />
</template>

<script setup>
import InfinitePhotoGrid from '@/components/InfinitePhotoGrid.vue'

const photos = ref([])
const loading = ref(false)
const hasMore = ref(true)

const loadMorePhotos = async () => {
  // Load more photos logic
}
</script>
```

### With Error Handling

```vue
<template>
  <InfinitePhotoGrid
    :photos="photos"
    :loading="loading"
    :error="error"
    :has-more="hasMore"
    empty-message="No photos uploaded yet."
    @load-more="loadMorePhotos"
  />
</template>
```

### With Custom Empty Message

```vue
<template>
  <InfinitePhotoGrid
    :photos="userPhotos"
    :loading="loading"
    :has-more="hasMore"
    :empty-message="`${userName} hasn't uploaded any photos yet.`"
    @load-more="loadMorePhotos"
  />
</template>
```

## Fullscreen Controls

### Keyboard Shortcuts
- **Escape**: Close fullscreen view
- **Left Arrow**: Previous photo
- **Right Arrow**: Next photo
- **I**: Toggle photo information panel

### Mouse/Touch Controls
- **Click photo**: Open fullscreen view
- **Click navigation arrows**: Navigate between photos
- **Swipe left**: Next photo (mobile/touch devices)
- **Swipe right**: Previous photo (mobile/touch devices)
- **Click close button**: Close fullscreen view
- **Click download button**: Download current photo (uses original s3Key)
- **Click info button**: Toggle information panel

### Swipe Gestures
The component supports touch gestures for navigation:
- **Horizontal swipes** are detected with a minimum distance of 50px
- **Swipe right**: Navigate to previous photo
- **Swipe left**: Navigate to next photo
- **Vertical swipes** are ignored to allow normal scrolling
- Touch events are optimized to prevent conflicts with page scrolling

## Styling

The component uses scoped CSS with the following key classes:

- `.photo-card`: Individual photo card styling with hover effects
- `.photo-overlay`: Hover overlay with photo info and gradient background
- `.fullscreen-card`: Fullscreen dialog container with black background
- `.fullscreen-app-bar`: Fixed top bar with backdrop blur effect
- `.fullscreen-content`: Main content area with proper spacing for fixed elements
- `.photo-container`: Image container with swipe gesture support
- `.nav-btn`: Navigation button styling with opacity transitions
- `.photo-details`: Information panel with backdrop blur
- `.bottom-controls`: Fixed bottom bar with photo counter and controls

### CSS Custom Properties
The component respects the following layout calculations:
- Top bar height: 48px
- Bottom controls height: 60px
- Image area: `calc(100vh - 108px)` (subtracts both bars)

## Image Display Behavior

### Grid View
- Uses `thumbnailFileName` if available for better performance
- Falls back to `s3Key` if no thumbnail exists
- Images are lazy-loaded and cached by the browser

### Fullscreen View
- Always uses the original `s3Key` for highest quality
- Images are displayed with `contain` sizing to fit the viewport
- Maintains aspect ratio while fitting within available space

### Layout Structure
- **Fixed top bar**: Contains download and close buttons
- **Flexible image area**: Adjusts to available space between top bar and bottom controls
- **Fixed bottom controls**: Shows photo counter and info toggle
- **Overlay details panel**: Slides in from the right (desktop) or bottom (mobile)

## Environment Variables

The component requires the following environment variable:

```env
VITE_CLOUDFRONT_DOMAIN=https://your-cloudfront-domain.com
```

## Dependencies

- Vue 3 (Composition API)
- Vuetify 3
- Modern browser with fetch API support

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- Mobile browsers with modern JavaScript support

## Performance Considerations

- Images are lazy-loaded using Vuetify's `v-img` component
- Thumbnails are preferred over full-size images for grid display
- Infinite scroll uses intersection observer for optimal performance
- Keyboard event listeners are properly cleaned up
