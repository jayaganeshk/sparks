<template>
  <v-container>
    <h1 class="text-h4 mb-4">Upload Photos to an Album</h1>

    <!-- Step 1: Choose Album -->
    <v-stepper v-model="step">
      <v-stepper-header>
        <v-stepper-item :complete="step > 1" value="1">Choose Album</v-stepper-item>
        <v-divider></v-divider>
        <v-stepper-item :complete="step > 2" value="2">Upload Files</v-stepper-item>
      </v-stepper-header>

      <v-stepper-window>
        <v-stepper-window-item value="1">
          <v-card-title>Select a destination album</v-card-title>
          <v-card-text>
            <v-select
              label="Select an existing album"
              :items="albums"
              item-title="title"
              item-value="albumId"
              v-model="selectedAlbum"
              :loading="loadingAlbums"
            ></v-select>
            <p class="text-center my-4">OR</p>
            <v-btn block @click="showCreateDialog = true">Create a New Album</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn @click="step = 2" :disabled="!selectedAlbum">Continue</v-btn>
          </v-card-actions>
        </v-stepper-window-item>

        <v-stepper-window-item value="2">
          <v-card-title>Upload to: {{ selectedAlbumTitle }}</v-card-title>
          <v-card-text class="text-center">
            <p>Select photos to upload to this album. After uploading, they will be automatically processed for face recognition.</p>
            
            <!-- Custom upload button that triggers the ImageUpload component -->
            <v-btn color="primary" class="mt-4" @click="triggerUpload">
              <v-icon left>mdi-camera</v-icon>
              Select Photos
            </v-btn>
            
            <!-- Hidden file input that will be triggered by the button -->
            <input
              type="file"
              ref="fileInput"
              style="display: none"
              @change="onFileSelected"
              accept="image/*"
              multiple
            />
            
            <v-alert
              v-if="uploadSuccess"
              type="success"
              class="mt-4"
              text="Photos successfully uploaded and added to the album!"
              variant="tonal"
            ></v-alert>
            
            <v-alert
              v-if="uploadError"
              type="error"
              class="mt-4"
              :text="uploadError"
              variant="tonal"
            ></v-alert>
          </v-card-text>
          <v-card-actions>
            <v-btn @click="step = 1">Back</v-btn>
            <v-spacer></v-spacer>
            <v-btn color="primary" to="/organizer">Finish</v-btn>
          </v-card-actions>
        </v-stepper-window-item>
      </v-stepper-window>
    </v-stepper>

    <create-album-dialog
      v-model="showCreateDialog"
      @album-created="handleAlbumCreated"
    ></create-album-dialog>
    
    <!-- Use the ImageUpload component with our enhanced props -->
    <image-upload
      ref="imageUploadComponent"
      :album-id="selectedAlbum"
      v-model="showUploadDialog"
      :external-files="selectedFiles"
      @upload-complete="handleUploadComplete"
      @upload-error="handleUploadError"
    ></image-upload>

  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { albumService } from '@/services';
import CreateAlbumDialog from '@/components/organizer/CreateAlbumDialog.vue';
import ImageUpload from '@/components/ImageUpload.vue';

const step = ref(1);
const albums = ref([]);
const loadingAlbums = ref(true);
const selectedAlbum = ref(null);
const showCreateDialog = ref(false);
const fileInput = ref(null);
const imageUploadComponent = ref(null);
const showUploadDialog = ref(false);
const selectedFiles = ref([]);
const uploadSuccess = ref(false);
const uploadError = ref(null);

const selectedAlbumTitle = computed(() => {
  const album = albums.value.find(a => a.albumId === selectedAlbum.value);
  return album ? album.title : '';
});

const fetchAlbums = async () => {
  try {
    loadingAlbums.value = true;
    albums.value = await albumService.getAlbums();
  } catch (error) {
    console.error('Failed to fetch albums:', error);
  } finally {
    loadingAlbums.value = false;
  }
};

const handleAlbumCreated = async () => {
  await fetchAlbums();
  // Auto-select the newly created album (assuming it's the last one added)
  if (albums.value.length > 0) {
    selectedAlbum.value = albums.value[albums.value.length - 1].albumId;
  }
};

const triggerUpload = () => {
  // Trigger the file input click event
  fileInput.value.click();
};

const onFileSelected = (event) => {
  // Reset status
  uploadSuccess.value = false;
  uploadError.value = null;
  
  // Get the selected files
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  // Pass the files to the ImageUpload component
  selectedFiles.value = Array.from(files);
  showUploadDialog.value = true;
};

const handleUploadComplete = () => {
  // Show success message
  uploadSuccess.value = true;
  selectedFiles.value = [];
  
  // Reset after a delay
  setTimeout(() => {
    uploadSuccess.value = false;
  }, 5000);
};

const handleUploadError = (error) => {
  uploadError.value = 'Failed to upload photos. Please try again.';
  selectedFiles.value = [];
  
  // Reset after a delay
  setTimeout(() => {
    uploadError.value = null;
  }, 5000);
};

onMounted(fetchAlbums);
</script>

<style scoped>
/* Add any specific styles for the upload page here */
</style>
