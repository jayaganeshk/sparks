<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-4">
      <h1 class="text-h4">My Albums</h1>
      <div>
        <v-btn to="/organizer/upload" class="mr-4">Upload Photos</v-btn>
        <v-btn color="primary" @click="showCreateDialog = true">Create New Album</v-btn>
      </div>
    </div>

    <v-progress-circular
      v-if="loading"
      indeterminate
      color="primary"
      class="d-block mx-auto mt-8"
    ></v-progress-circular>

    <v-alert
      v-if="error"
      type="error"
      class="mb-4"
      :text="error"
      variant="tonal"
      closable
      @click:close="error = null"
    ></v-alert>
    
    <v-alert
      v-if="successMessage"
      type="success"
      class="mb-4"
      :text="successMessage"
      variant="tonal"
      closable
      @click:close="successMessage = null"
    ></v-alert>

    <v-row v-if="!loading && !error">
      <v-col v-if="albums.length === 0">
        <p>You haven't created any albums yet. Click the button above to create your first one!</p>
      </v-col>
      <v-col
        v-for="album in albums"
        :key="album.albumId"
        cols="12" sm="6" md="4"
      >
        <v-card>
          <v-card-title>{{ album.title }}</v-card-title>
          <v-card-subtitle>{{ new Date(album.createdAt).toLocaleDateString() }}</v-card-subtitle>
          <v-card-text>{{ album.description || 'No description provided.' }}</v-card-text>
          <v-card-actions>
            <v-btn text color="primary" :to="`/organizer/album/${album.albumId}`">View</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <create-album-dialog
      v-model="showCreateDialog"
      @album-created="handleAlbumCreated"
    ></create-album-dialog>

  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { albumService } from '@/services';
import CreateAlbumDialog from '@/components/organizer/CreateAlbumDialog.vue';

const albums = ref([]);
const loading = ref(true);
const error = ref(null);
const successMessage = ref(null);
const showCreateDialog = ref(false);

const fetchAlbums = async () => {
  try {
    error.value = null;
    loading.value = true;
    const response = await albumService.getAlbums();
    albums.value = response;
  } catch (err) {
    console.error('Failed to fetch albums:', err);
    error.value = 'Failed to load albums. Please try again later.';
    
    // Auto-dismiss error after 5 seconds
    setTimeout(() => {
      error.value = null;
    }, 5000);
  } finally {
    loading.value = false;
  }
};

const handleAlbumCreated = () => {
  // Show success message
  successMessage.value = 'Album created successfully!';
  
  // Refresh the album list
  fetchAlbums();
  
  // Auto-dismiss success message after 5 seconds
  setTimeout(() => {
    successMessage.value = null;
  }, 5000);
};

onMounted(fetchAlbums);
</script>

<style scoped>
/* Add any specific styles for the dashboard here */
</style>
