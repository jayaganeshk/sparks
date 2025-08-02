<template>
  <v-container>
    <h1 class="text-h4 mb-4">Albums</h1>

    <!-- Loading state -->
    <div v-if="loading" class="d-flex justify-center my-8">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <!-- Error state -->
    <v-alert
      v-if="error"
      type="error"
      class="mb-4"
      :text="error"
      variant="tonal"
      closable
      @click:close="error = null"
    ></v-alert>

    <!-- Empty state -->
    <v-card v-if="!loading && albums.length === 0" class="pa-4 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-image-album</v-icon>
      <p class="text-h6">No albums available</p>
      <p class="text-body-2">Check back later for event albums</p>
    </v-card>

    <!-- Albums grid -->
    <v-row v-if="!loading && albums.length > 0">
      <v-col
        v-for="album in albums"
        :key="album.albumId"
        cols="12" sm="6" md="4" lg="3"
      >
        <v-card
          class="album-card"
          :to="`/albums/${album.albumId}`"
          height="100%"
        >
          <v-img
            v-if="album.coverImage"
            :src="album.coverImage"
            height="180"
            cover
            class="album-cover"
          >
            <template v-slot:placeholder>
              <v-row class="fill-height ma-0" align="center" justify="center">
                <v-progress-circular indeterminate color="grey-lighten-5"></v-progress-circular>
              </v-row>
            </template>
          </v-img>
          <div v-else class="album-placeholder d-flex align-center justify-center" style="height: 180px; background-color: #f5f5f5;">
            <v-icon size="64" color="grey-darken-1">mdi-image-album</v-icon>
          </div>
          
          <v-card-title class="text-truncate">{{ album.title }}</v-card-title>
          <v-card-subtitle>
            <v-icon small class="mr-1">mdi-calendar</v-icon>
            {{ formatDate(album.createdAt) }}
          </v-card-subtitle>
          <v-card-text class="text-truncate">
            {{ album.description || 'No description provided' }}
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" color="primary">View Album</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { albumService } from '@/services';

const albums = ref([]);
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

// Fetch all public albums
const fetchAlbums = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    // In a real implementation, we would call an API endpoint that returns all public albums
    // For now, we'll use the existing getAlbums endpoint which returns the organizer's albums
    // This will be replaced with a proper endpoint for public albums later
    const response = await albumService.getAlbums();
    
    // Add a placeholder cover image for demonstration
    albums.value = response.map(album => ({
      ...album,
      coverImage: null // In a real implementation, this would be the URL to the album's cover image
    }));
  } catch (err) {
    console.error('Failed to fetch albums:', err);
    error.value = 'Failed to load albums. Please try again later.';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchAlbums);
</script>

<style scoped>
.album-card {
  transition: transform 0.2s;
}

.album-card:hover {
  transform: translateY(-5px);
}

.album-placeholder {
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
}
</style>
