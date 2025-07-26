<template>
  <div class="floatingActionButton">
    <v-btn icon="mdi-plus" color="primary" size="x-large">
      <v-icon>mdi-plus</v-icon>
      <v-menu activator="parent">
        <v-list>
          <v-list-item @click="selectImage">
            <v-list-item-title>Image</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-btn>
  </div>

  <!-- File input (hidden) -->
  <input
    type="file"
    ref="fileInput"
    style="display: none"
    @change="onFileChange"
    accept="image/*"
    multiple
  />

  <!-- Image Preview Dialog -->
  <v-dialog v-model="dialog" fullscreen>
    <v-card>
      <v-toolbar dark color="primary">
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>Preview</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-toolbar-items>
          <v-btn
            variant="text"
            :disabled="isUploading || isCompressing"
            @click="uploadImage"
          >
            Upload
          </v-btn>
        </v-toolbar-items>
      </v-toolbar>

      <v-card-text class="pa-0">
        <v-container fluid class="pa-0">
          <!-- Image Preview -->
          <div
            v-if="imagePreview && files.length > 0"
            @touchstart="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
            :style="{
              transform: `translateX(${translateX}px)`,
              transition: 'transform 0.3s ease-out',
            }"
          >
            <v-img
              :src="imagePreview"
              cover
              height="70vh"
              class="mx-auto"
            ></v-img>
          </div>

          <!-- Image Navigation -->
          <v-row v-if="files.length > 1" class="mt-2">
            <v-col cols="4">
              <v-btn
                block
                :disabled="currentPreview === 0"
                @click="prevImage"
                prepend-icon="mdi-chevron-left"
              >
                Previous
              </v-btn>
            </v-col>
            <v-col cols="4" class="text-center">
              {{ currentPreview + 1 }} / {{ files.length }}
            </v-col>
            <v-col cols="4">
              <v-btn
                block
                :disabled="currentPreview === files.length - 1"
                @click="nextImage"
                append-icon="mdi-chevron-right"
              >
                Next
              </v-btn>
            </v-col>
          </v-row>

          <!-- Thumbnails -->
          <v-row class="mt-2">
            <v-col
              v-for="(url, index) in urls"
              :key="index"
              cols="3"
              sm="2"
              md="1"
            >
              <v-card
                :class="{
                  'border border-primary border-3': index === currentPreview,
                }"
                @click="currentPreview = index; imagePreview = urls[currentPreview]"
              >
                <v-img :src="url" aspect-ratio="1" cover></v-img>
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  color="error"
                  variant="flat"
                  class="float-end"
                  style="position: absolute; top: 0; right: 0"
                  @click.stop="deleteImage(index)"
                ></v-btn>
              </v-card>
            </v-col>
          </v-row>

          <!-- Upload Progress -->
          <v-row v-if="isUploading || isCompressing">
            <v-col cols="12">
              <v-card>
                <v-card-text>
                  <div v-if="isCompressing">
                    Compressing image: {{ Math.round(compressionProgress) }}%
                  </div>
                  <div v-else>
                    Uploading image {{ currentUploading + 1 }} of
                    {{ files.length }}
                  </div>
                  <v-progress-linear
                    :model-value="
                      isCompressing
                        ? compressionProgress
                        : uploadProgress
                    "
                    color="primary"
                    height="25"
                  >
                    <template v-slot:default="{ value }">
                      <strong>{{ Math.ceil(value) }}%</strong>
                    </template>
                  </v-progress-linear>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useAppStore } from '@/store/app';
import imageCompression from 'browser-image-compression';
import { uploadService } from '@/services';

// State
const fileInput = ref(null);
const files = ref([]);
const urls = ref([]);
const currentPreview = ref(0);
const imagePreview = ref(null);
const dialog = ref(false);
const isUploading = ref(false);
const isCompressing = ref(false);
const compressionProgress = ref(0);
const uploadProgress = ref(0);
const currentUploading = ref(0);
const touchStartX = ref(0);
const touchEndX = ref(0);
const translateX = ref(0);

const appStore = useAppStore();

// Methods
const selectImage = () => {
  fileInput.value.click();
};

const onFileChange = (event) => {
  const selectedFiles = event.target.files;
  if (!selectedFiles.length) return;
  
  // Convert FileList to Array
  files.value = Array.from(selectedFiles);
  
  // Generate preview URLs
  urls.value = files.value.map(file => URL.createObjectURL(file));
  
  // Set initial preview
  currentPreview.value = 0;
  imagePreview.value = urls.value[0];
  
  // Show dialog
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
  urls.value = [];
  files.value = [];
  currentPreview.value = 0;
  imagePreview.value = null;
};

const deleteImage = (index) => {
  // Update current preview if necessary
  if (index === urls.value.length - 1) {
    currentPreview.value = 0;
  } else if (currentPreview.value > index) {
    currentPreview.value--;
  }
  
  // Remove image from arrays
  urls.value.splice(index, 1);
  files.value.splice(index, 1);
  
  // Close dialog if no images left
  if (files.value.length === 0) {
    dialog.value = false;
    return;
  }
  
  // Update preview
  imagePreview.value = urls.value[currentPreview.value];
};

const prevImage = () => {
  if (currentPreview.value > 0) {
    currentPreview.value--;
    imagePreview.value = urls.value[currentPreview.value];
  }
};

const nextImage = () => {
  if (currentPreview.value < files.value.length - 1) {
    currentPreview.value++;
    imagePreview.value = urls.value[currentPreview.value];
  }
};

const uploadImage = async () => {
  isUploading.value = true;
  
  try {
    for (let i = 0; i < files.value.length; i++) {
      currentUploading.value = i;
      const file = files.value[i];
      
      // Compress image
      isCompressing.value = true;
      compressionProgress.value = 0;
      
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        onProgress: (progress) => {
          compressionProgress.value = progress;
        }
      };
      
      const compressedFile = await imageCompression(file, options);
      isCompressing.value = false;
      
      // Get pre-signed URL from API
      const { uploadUrl, imageId, key } = await uploadService.getUploadUrl();
      
      // Upload to S3 using pre-signed URL
      await uploadService.uploadToS3(uploadUrl, compressedFile, (progress) => {
        uploadProgress.value = progress;
      });
      
      // Here you would typically call another API endpoint to notify the backend
      // that the upload is complete and pass the imageId and key.
      console.log('Upload complete for image:', imageId, 'with key:', key);
    }
    
    // Success notification would go here
    console.log('Upload complete!');
  } catch (error) {
    console.error('Upload error:', error);
    // Error notification would go here
  } finally {
    isUploading.value = false;
    dialog.value = false;
  }
};

// Touch events for swipe navigation
const onTouchStart = (event) => {
  touchStartX.value = event.touches[0].clientX;
};

const onTouchMove = (event) => {
  touchEndX.value = event.touches[0].clientX;
  translateX.value = touchEndX.value - touchStartX.value;
};

const onTouchEnd = () => {
  const threshold = 50;
  
  if (translateX.value > threshold) {
    // Right swipe - previous image
    prevImage();
  } else if (translateX.value < -threshold) {
    // Left swipe - next image
    nextImage();
  }
  
  // Reset translation
  translateX.value = 0;
};
</script>

<style scoped>
.floatingActionButton {
  position: fixed;
  bottom: 70px;
  right: 20px;
  z-index: 2;
}
</style>
