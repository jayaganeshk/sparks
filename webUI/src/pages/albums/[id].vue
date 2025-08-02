<template>
  <v-container>
    <div v-if="loading" class="d-flex justify-center align-center" style="height: 300px;">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <template v-else>
      <!-- Album Header -->
      <div class="d-flex align-center mb-6">
        <div>
          <v-btn icon class="mr-4" to="/albums">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
        </div>
        <div>
          <h1 class="text-h4">{{ album.title }}</h1>
          <p class="text-subtitle-1 text-medium-emphasis">{{ album.description || 'No description provided' }}</p>
          <p class="text-caption">Created on {{ formatDate(album.createdAt) }}</p>
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

      <!-- No Images Message -->
      <v-card v-if="images.length === 0" class="pa-4 text-center">
        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-image-off</v-icon>
        <p class="text-h6">No photos in this album yet</p>
        <p class="text-body-2 mb-4">Check back later for photos</p>
      </v-card>

      <!-- Image Grid -->
      <v-row v-else>
        <v-col 
          v-for="(image, index) in images" 
          :key="image.imageId" 
          cols="12" sm="6" md="4" lg="3"
        >
          <v-card
            @click="openPhotoDetail(image)"
            class="photo-card"
            hover
          >
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
            
            <!-- Photo metadata overlay on hover -->
            <div class="photo-overlay d-flex align-end">
              <div class="pa-2 white--text">
                <div v-if="image.uploadedBy" class="text-caption">
                  <v-icon small color="white">mdi-account</v-icon>
                  {{ image.uploadedBy.split('@')[0] }}
                </div>
                <div class="text-caption">
                  <v-icon small color="white">mdi-calendar</v-icon>
                  {{ formatDate(image.uploaded_datetime) }}
                </div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { albumService } from '@/services';

const route = useRoute();
const router = useRouter();
const albumId = computed(() => route.params.id);

const album = ref({});
const images = ref([]);
const loading = ref(true);
const error = ref(null);

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

// Navigate to photo detail page
const openPhotoDetail = (image) => {
  router.push(`/photo/${image.imageId}`);
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
  } catch (err) {
    console.error('Failed to load album details:', err);
    error.value = 'Failed to load album details. Please try again.';
  } finally {
    loading.value = false;
  }
};

// Load data when component is mounted
onMounted(loadAlbumDetails);
</script>

<style scoped>
.photo-card {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.photo-card:hover {
  transform: scale(1.02);
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  opacity: 0;
  transition: opacity 0.3s;
}

.photo-card:hover .photo-overlay {
  opacity: 1;
}
</style>
