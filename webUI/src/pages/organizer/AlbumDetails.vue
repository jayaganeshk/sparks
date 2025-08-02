<template>
  <v-container>
    <div v-if="loading" class="d-flex justify-center align-center" style="height: 300px;">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <template v-else>
      <!-- Album Header with Cover Image -->
      <div class="d-flex mb-6">
        <div>
          <v-btn icon class="mr-4" to="/organizer">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
        </div>
        
        <div class="d-flex flex-column flex-md-row align-start">
          <!-- Album Cover Image -->
          <div class="album-cover-container mr-4 mb-4">
            <v-img
              v-if="coverImage"
              :src="coverImage"
              width="200"
              height="200"
              cover
              class="rounded-lg"
            >
              <template v-slot:placeholder>
                <v-row class="fill-height ma-0" align="center" justify="center">
                  <v-progress-circular indeterminate color="grey-lighten-5"></v-progress-circular>
                </v-row>
              </template>
            </v-img>
            <div v-else class="album-placeholder d-flex align-center justify-center rounded-lg" style="width: 200px; height: 200px; background-color: #f5f5f5;">
              <v-icon size="64" color="grey-darken-1">mdi-image-album</v-icon>
            </div>
          </div>
          
          <!-- Album Details -->
          <div>
            <h1 class="text-h4">{{ album.title }}</h1>
            <p class="text-subtitle-1 text-medium-emphasis">{{ album.description || 'No description provided' }}</p>
            <p class="text-caption">Created on {{ formatDate(album.createdAt) }}</p>
            
            <!-- Privacy Toggle -->
            <div class="mt-4 d-flex align-center">
              <v-switch
                v-model="isPublic"
                color="primary"
                :loading="updatingPrivacy"
                @change="updatePrivacy"
                hide-details
                density="compact"
              ></v-switch>
              <span class="ml-2">{{ isPublic ? 'Public' : 'Private' }} Album</span>
              <v-tooltip location="right">
                <template v-slot:activator="{ props }">
                  <v-icon
                    class="ml-2"
                    size="small"
                    v-bind="props"
                  >mdi-information-outline</v-icon>
                </template>
                <span>{{ isPublic ? 'This album is visible to all participants' : 'This album is only visible to organizers' }}</span>
              </v-tooltip>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Alert -->
      <v-alert
        v-if="error"
        type="error"
        class="mb-4"
        :text="error"
        variant="tonal"
        closable
        @click:close="error = null"
      ></v-alert>

      <!-- Success Alert -->
      <v-alert
        v-if="successMessage"
        type="success"
        class="mb-4"
        :text="successMessage"
        variant="tonal"
        closable
        @click:close="successMessage = null"
      ></v-alert>

      <!-- Actions Bar -->
      <div class="d-flex justify-space-between align-center mb-4">
        <div>
          <span class="text-body-1">{{ images.length }} photos</span>
        </div>
        <div>
          <v-btn 
            color="primary" 
            :to="`/organizer/upload?albumId=${albumId}`"
            prepend-icon="mdi-plus"
          >
            Add Photos
          </v-btn>
        </div>
      </div>

      <!-- No Images Message -->
      <v-card v-if="images.length === 0" class="pa-4 text-center">
        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-image-off</v-icon>
        <p class="text-h6">No photos in this album yet</p>
        <p class="text-body-2 mb-4">Upload some photos to get started</p>
        <v-btn 
          color="primary" 
          :to="`/organizer/upload?albumId=${albumId}`"
        >
          Upload Photos
        </v-btn>
      </v-card>

      <!-- Image Grid -->
      <v-row v-else>
        <v-col 
          v-for="(image, index) in images" 
          :key="image.imageId" 
          cols="12" sm="6" md="4" lg="3"
        >
          <v-card>
            <v-img
              :src="image.s3Key"
              aspect-ratio="1"
              cover
              class="bg-grey-lighten-2"
            >
              <template v-slot:placeholder>
                <v-row class="fill-height ma-0" align="center" justify="center">
                  <v-progress-circular indeterminate color="grey-lighten-5"></v-progress-circular>
                </v-row>
              </template>
            </v-img>
            <v-card-actions>
              <v-btn 
                :to="`/photo/${image.imageId}`" 
                variant="text" 
                color="primary"
              >
                View
              </v-btn>
              <v-spacer></v-spacer>
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn 
                    icon
                    v-bind="props"
                  >
                    <v-icon>mdi-dots-vertical</v-icon>
                  </v-btn>
                </template>
                <v-list>
                  <v-list-item @click="setCoverImage(image)">
                    <v-list-item-title>
                      <v-icon class="mr-2" small>mdi-image</v-icon>
                      Set as Cover
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="confirmRemoveImage(image)">
                    <v-list-item-title>
                      <v-icon class="mr-2" small color="error">mdi-delete</v-icon>
                      Remove
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="showConfirmDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">Remove photo from album?</v-card-title>
        <v-card-text>
          This will remove the photo from this album, but will not delete it from the system.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" text @click="showConfirmDialog = false">Cancel</v-btn>
          <v-btn 
            color="error" 
            text 
            @click="removeImage" 
            :loading="removing"
          >
            Remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { albumService } from '@/services';

const route = useRoute();
const albumId = computed(() => route.params.id);

const album = ref({});
const images = ref([]);
const loading = ref(true);
const error = ref(null);
const successMessage = ref(null);
const showConfirmDialog = ref(false);
const selectedImage = ref(null);
const removing = ref(false);
const settingCover = ref(false);
const coverImage = ref(null);
const isPublic = ref(true);
const updatingPrivacy = ref(false);

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Load album details and images
const loadAlbumDetails = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    // Fetch album details
    album.value = await albumService.getAlbumById(albumId.value);
    
    // Fetch images in the album
    const albumImages = await albumService.getImagesInAlbum(albumId.value);
    images.value = albumImages;
    
    // Set cover image if available
    if (album.value.coverImageId) {
      const coverImg = albumImages.find(img => img.imageId === album.value.coverImageId);
      if (coverImg) {
        coverImage.value = coverImg.s3Key;
      }
    }
    
    // Set privacy toggle state
    isPublic.value = album.value.isPublic !== false; // Default to true if not specified
  } catch (err) {
    console.error('Failed to load album details:', err);
    error.value = 'Failed to load album details. Please try again.';
  } finally {
    loading.value = false;
  }
};

// Confirm before removing an image
const confirmRemoveImage = (image) => {
  selectedImage.value = image;
  showConfirmDialog.value = true;
};

// Remove an image from the album
const removeImage = async () => {
  if (!selectedImage.value) return;
  
  try {
    removing.value = true;
    
    // Call API to remove image from album
    await albumService.removeImageFromAlbum(albumId.value, selectedImage.value.imageId);
    
    // Remove from local state
    images.value = images.value.filter(img => img.imageId !== selectedImage.value.imageId);
    
    // Show success message
    successMessage.value = 'Photo removed from album successfully';
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    console.error('Failed to remove image from album:', err);
    error.value = 'Failed to remove photo from album. Please try again.';
    setTimeout(() => {
      error.value = null;
    }, 3000);
  } finally {
    removing.value = false;
    showConfirmDialog.value = false;
    selectedImage.value = null;
  }
};

// Set an image as the album cover
const setCoverImage = async (image) => {
  try {
    settingCover.value = true;
    error.value = null;
    
    await albumService.setAlbumCover(albumId.value, image.imageId);
    
    // Update local state
    album.value.coverImageId = image.imageId;
    coverImage.value = image.s3Key;
    
    successMessage.value = 'Album cover set successfully!';
    
    // Auto-dismiss success message after 3 seconds
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    console.error('Failed to set album cover:', err);
    error.value = 'Failed to set album cover. Please try again.';
    
    // Auto-dismiss error after 5 seconds
    setTimeout(() => {
      error.value = null;
    }, 5000);
  } finally {
    settingCover.value = false;
  }
};

// Update album privacy setting
const updatePrivacy = async () => {
  try {
    updatingPrivacy.value = true;
    error.value = null;
    
    await albumService.updateAlbumPrivacy(albumId.value, isPublic.value);
    
    // Update local state
    album.value.isPublic = isPublic.value;
    
    successMessage.value = `Album is now ${isPublic.value ? 'public' : 'private'}`;
    
    // Auto-dismiss success message after 3 seconds
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    console.error('Failed to update album privacy:', err);
    error.value = 'Failed to update album privacy. Please try again.';
    
    // Revert the toggle if there was an error
    isPublic.value = !isPublic.value;
    
    // Auto-dismiss error after 5 seconds
    setTimeout(() => {
      error.value = null;
    }, 5000);
  } finally {
    updatingPrivacy.value = false;
  }
};

// Load data when component is mounted
onMounted(loadAlbumDetails);
</script>
