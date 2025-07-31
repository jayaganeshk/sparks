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

  <!-- Image Preview Dialog - WhatsApp Style -->
  <v-dialog v-model="dialog" fullscreen>
    <v-card class="whatsapp-dialog">
      <!-- Header with close button only -->
      <div class="whatsapp-header">
        <v-btn
          icon
          variant="text"
          color="white"
          size="large"
          @click="closeDialog"
          class="close-btn"
        >
          <v-icon size="28">mdi-close</v-icon>
        </v-btn>
      </div>

      <!-- Main image display area -->
      <div class="image-display-container">
        <!-- Left Navigation Arrow -->
        <v-btn
          v-if="files.length > 1 && currentPreview > 0"
          icon
          variant="text"
          color="white"
          size="large"
          class="nav-arrow nav-arrow-left"
          @click="prevImage"
        >
          <v-icon size="32">mdi-chevron-left</v-icon>
        </v-btn>

        <div
          v-if="imagePreview && files.length > 0"
          class="image-wrapper"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
          :style="{
            transform: `translateX(${translateX}px)`,
            transition: translateX === 0 ? 'transform 0.3s ease-out' : 'none',
          }"
        >
          <img :src="imagePreview" class="preview-image" alt="Preview" />
        </div>

        <!-- Right Navigation Arrow -->
        <v-btn
          v-if="files.length > 1 && currentPreview < files.length - 1"
          icon
          variant="text"
          color="white"
          size="large"
          class="nav-arrow nav-arrow-right"
          @click="nextImage"
        >
          <v-icon size="32">mdi-chevron-right</v-icon>
        </v-btn>

        <!-- Navigation dots for multiple images -->
        <div v-if="files.length > 1" class="navigation-dots">
          <div
            v-for="(_, index) in files"
            :key="index"
            class="dot"
            :class="{ active: index === currentPreview }"
            @click="goToImage(index)"
          ></div>
        </div>
      </div>

      <!-- Bottom section with thumbnails and actions -->
      <div class="bottom-section">
        <!-- Thumbnails strip -->
        <div v-if="files.length > 0" class="thumbnails-container">
          <div class="thumbnails-strip" ref="thumbnailsStrip">
            <div
              v-for="(url, index) in urls"
              :key="index"
              class="thumbnail-item"
              :class="{ active: index === currentPreview }"
              @click="handleThumbnailClick(index)"
              :ref="
                (el) => {
                  if (el) thumbnailRefs[index] = el;
                }
              "
            >
              <img :src="url" alt="Thumbnail" class="thumbnail-image" />
              <div
                v-if="index === currentPreview"
                class="thumbnail-overlay active-overlay"
              >
                <v-btn
                  icon
                  size="x-small"
                  color="error"
                  variant="flat"
                  class="delete-btn"
                  @click.stop="deleteImage(index)"
                >
                  <v-icon size="16">mdi-delete</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
        </div>

        <!-- Upload Progress -->
        <div v-if="isUploading || isCompressing" class="progress-container">
          <div class="progress-text">
            <span v-if="isCompressing">
              Compressing... {{ Math.round(compressionProgress) }}%
            </span>
            <span v-else>
              Uploading {{ currentUploading + 1 }} of {{ files.length }}
            </span>
          </div>
          <v-progress-linear
            :model-value="isCompressing ? compressionProgress : uploadProgress"
            color="primary"
            height="4"
            rounded
          />
        </div>

        <!-- Action button -->
        <div class="action-container">
          <v-btn
            color="white"
            size="large"
            variant="flat"
            :disabled="isUploading || isCompressing"
            :loading="isUploading || isCompressing"
            @click="uploadImage"
            class="upload-btn"
            block
          >
            <v-icon left>mdi-cloud-upload</v-icon>
            Upload {{ files.length > 1 ? `${files.length} Photos` : "Photo" }}
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, nextTick } from "vue";
import { useAppStore } from "@/store/app";
import imageCompression from "browser-image-compression";
import { apiService } from "@/services/api";
import { uploadService } from "@/services";

// State
const fileInput = ref(null);
const thumbnailsStrip = ref(null);
const thumbnailRefs = ref({});
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

const onFileChange = async (event) => {
  const selectedFiles = event.target.files;
  if (!selectedFiles.length) return;

  // Convert FileList to Array
  files.value = Array.from(selectedFiles);

  // Generate preview URLs
  urls.value = files.value.map((file) => URL.createObjectURL(file));

  // Set initial preview
  currentPreview.value = 0;
  imagePreview.value = urls.value[0];

  // Show dialog
  dialog.value = true;

  // Scroll to first thumbnail after dialog opens
  await scrollToActiveThumbnail();
};

const closeDialog = () => {
  dialog.value = false;
  urls.value.forEach((url) => URL.revokeObjectURL(url));
  urls.value = [];
  files.value = [];
  currentPreview.value = 0;
  imagePreview.value = null;
  translateX.value = 0;
  thumbnailRefs.value = {};
};

const scrollToActiveThumbnail = async () => {
  await nextTick();
  if (thumbnailsStrip.value && thumbnailRefs.value[currentPreview.value]) {
    const activeThumb = thumbnailRefs.value[currentPreview.value];
    const container = thumbnailsStrip.value;

    const thumbLeft = activeThumb.offsetLeft;
    const thumbWidth = activeThumb.offsetWidth;
    const containerWidth = container.offsetWidth;
    const containerScrollLeft = container.scrollLeft;

    // Calculate the center position
    const thumbCenter = thumbLeft + thumbWidth / 2;
    const containerCenter = containerScrollLeft + containerWidth / 2;

    // Calculate new scroll position to center the thumbnail
    const newScrollLeft = thumbLeft - containerWidth / 2 + thumbWidth / 2;

    // Smooth scroll to the new position
    container.scrollTo({
      left: Math.max(0, newScrollLeft),
      behavior: "smooth",
    });
  }
};

const goToImage = async (index) => {
  currentPreview.value = index;
  imagePreview.value = urls.value[index];
  translateX.value = 0;
  await scrollToActiveThumbnail();
};

const handleThumbnailClick = (index) => {
  // Always switch to the clicked image, regardless of current state
  goToImage(index);
};

const prevImage = async () => {
  if (currentPreview.value > 0) {
    currentPreview.value--;
    imagePreview.value = urls.value[currentPreview.value];
    translateX.value = 0;
    await scrollToActiveThumbnail();
  }
};

const nextImage = async () => {
  if (currentPreview.value < files.value.length - 1) {
    currentPreview.value++;
    imagePreview.value = urls.value[currentPreview.value];
    translateX.value = 0;
    await scrollToActiveThumbnail();
  }
};

const deleteImage = async (index) => {
  // Revoke the URL to free memory
  URL.revokeObjectURL(urls.value[index]);

  // Remove image from arrays
  urls.value.splice(index, 1);
  files.value.splice(index, 1);

  // Remove from refs
  delete thumbnailRefs.value[index];

  // Close dialog if no images left
  if (files.value.length === 0) {
    closeDialog();
    return;
  }

  // Update current preview if necessary
  if (currentPreview.value >= files.value.length) {
    currentPreview.value = files.value.length - 1;
  }

  // Update preview
  imagePreview.value = urls.value[currentPreview.value];

  // Scroll to new active thumbnail
  await scrollToActiveThumbnail();
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
        },
      };

      const compressedFile = await imageCompression(file, options);
      isCompressing.value = false;

      // Get pre-signed URL from API
      const response = await apiService.get("/upload");
      const { uploadUrl, imageId, key } = response;

      // Upload to S3 using pre-signed URL
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", compressedFile.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            uploadProgress.value = progress;
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during upload."));
        };

        xhr.send(compressedFile);
      });

      // Notify the backend that the upload is complete
      await apiService.post("/upload/complete", { imageId, key });
      console.log("Upload and record creation complete for image:", imageId);
    }

    // Success notification would go here
    console.log("Upload complete!");
    appStore.notifyPhotoUploaded();
    closeDialog();
  } catch (error) {
    console.error("Upload error:", error);
    // Error notification would go here
  } finally {
    isUploading.value = false;
    isCompressing.value = false;
  }
};

// Touch events for swipe navigation
const onTouchStart = (event) => {
  if (files.value.length <= 1) return;
  touchStartX.value = event.touches[0].clientX;
};

const onTouchMove = (event) => {
  if (files.value.length <= 1) return;
  touchEndX.value = event.touches[0].clientX;
  const diff = touchEndX.value - touchStartX.value;

  // Limit swipe distance
  if (Math.abs(diff) > 100) return;
  translateX.value = diff;
};

const onTouchEnd = () => {
  if (files.value.length <= 1) {
    translateX.value = 0;
    return;
  }

  const threshold = 50;

  if (translateX.value > threshold && currentPreview.value > 0) {
    // Right swipe - previous image
    currentPreview.value--;
    imagePreview.value = urls.value[currentPreview.value];
    scrollToActiveThumbnail();
  } else if (
    translateX.value < -threshold &&
    currentPreview.value < files.value.length - 1
  ) {
    // Left swipe - next image
    currentPreview.value++;
    imagePreview.value = urls.value[currentPreview.value];
    scrollToActiveThumbnail();
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

.whatsapp-dialog {
  background: #0a0a0a !important;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.whatsapp-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 16px;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    transparent 100%
  );
}

.close-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px);
}

.image-display-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 60px 16px 16px;
  overflow: hidden;
}

.image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 0px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.navigation-dots {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 5;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dot.active {
  background: white;
  transform: scale(1.2);
}

.bottom-section {
  background: #1a1a1a;
  border-top: 1px solid #333;
  padding: 16px;
  margin-top: auto;
}

.thumbnails-container {
  margin-bottom: 16px;
}

.thumbnails-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.thumbnails-strip::-webkit-scrollbar {
  display: none;
}

.thumbnail-item {
  position: relative;
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.thumbnail-item.active {
  border-color: #25d366;
  transform: scale(1.05);
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 5;
  background: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.nav-arrow:hover {
  background: rgba(0, 0, 0, 0.7) !important;
  transform: translateY(-50%) scale(1.1);
}

.nav-arrow-left {
  left: 16px;
}

.nav-arrow-right {
  right: 16px;
}

.thumbnail-overlay {
  position: absolute;
  top: 2px;
  right: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.active-overlay {
  opacity: 1 !important;
}

.delete-btn {
  background: rgba(244, 67, 54, 0.9) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.progress-container {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.progress-text {
  color: #e0e0e0;
  font-size: 14px;
  margin-bottom: 8px;
  text-align: center;
}

.action-container {
  display: flex;
  justify-content: center;
}

.upload-btn {
  font-weight: 500;
  height: 48px;
  border-radius: 24px;
  text-transform: none;
  font-size: 16px;
}

.upload-btn:hover {
  background: #128c7e !important;
}

.upload-btn:disabled {
  background: #666 !important;
}

/* Media queries for responsive design */
@media (max-width: 600px) {
  .whatsapp-header {
    padding: 12px;
  }

  .image-display-container {
    padding: 50px 8px 8px;
  }

  .bottom-section {
    padding: 12px;
  }

  .thumbnail-item {
    width: 50px;
    height: 50px;
  }

  .upload-btn {
    height: 44px;
    font-size: 15px;
  }
}
</style>
