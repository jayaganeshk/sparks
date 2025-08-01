<template>
  <div>
    <!-- Loading skeleton for initial load -->
    <div v-if="loading && photos.length === 0" class="loading-skeleton">
      <div v-for="n in 6" :key="n" class="skeleton-row">
        <v-skeleton-loader
          v-for="m in getRandomSkeletonCount()"
          :key="m"
          type="image"
          :style="{
            width: getRandomSkeletonWidth(),
            height: '200px',
            marginRight: '4px',
          }"
        ></v-skeleton-loader>
      </div>
    </div>

    <!-- Error message -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert
          type="error"
          title="Error loading photos"
          :text="error"
        ></v-alert>
      </v-col>
    </v-row>

    <!-- No photos message -->
    <v-row v-else-if="photos.length === 0 && !loading">
      <v-col cols="12" class="text-center text-grey mt-8">
        <v-icon size="64" color="grey-lighten-1" class="mb-4"
          >mdi-image-off</v-icon
        >
        <p class="text-h6">{{ emptyMessage || "No photos found" }}</p>
      </v-col>
    </v-row>

    <!-- Justified photo layout with infinite scroll -->
    <v-infinite-scroll
      v-else
      @load="loadMorePhotos"
      :empty="!hasMore"
      mode="intersect"
      side="end"
    >
      <div class="justified-gallery" ref="galleryContainer">
        <div
          v-for="row in justifiedRows"
          :key="row.id"
          class="gallery-row"
          :style="{ height: row.height + 'px' }"
        >
          <div
            v-for="(photo, photoIndex) in row.photos"
            :key="photo.PK || photo.id || photoIndex"
            class="gallery-item"
            :style="{
              width: photo.displayWidth + 'px',
              height: row.height + 'px',
            }"
            @click="openFullscreen(photo.originalIndex)"
          >
            <v-img
              :src="getImageUrl(photo)"
              :aspect-ratio="photo.aspectRatio"
              cover
              class="gallery-image"
            >
              <template v-slot:placeholder>
                <div class="image-placeholder">
                  <v-progress-circular
                    indeterminate
                    color="primary"
                    size="24"
                  ></v-progress-circular>
                </div>
              </template>

              <!-- Overlay with photo info on hover -->
              <div class="photo-overlay">
                <div class="photo-info">
                  <div v-if="photo.uploadedBy" class="text-caption">
                    <v-icon size="small" class="mr-1">mdi-account</v-icon>
                    {{ photo.uploadedBy }}
                  </div>
                  <div v-if="photo.timestamp" class="text-caption">
                    <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
                    {{ formatDate(photo.timestamp) }}
                  </div>
                </div>
              </div>
            </v-img>
          </div>
        </div>
      </div>

      <!-- Loading more indicator -->
      <template v-slot:loading>
        <div class="loading-more">
          <v-progress-circular
            indeterminate
            color="primary"
            size="32"
          ></v-progress-circular>
          <p class="text-caption mt-2">Loading more photos...</p>
        </div>
      </template>

      <!-- No more photos indicator -->
      <template v-slot:empty>
        <div class="all-loaded">
          <v-icon color="grey-lighten-1" class="mb-2">mdi-check-circle</v-icon>
          <p class="text-caption text-grey">All photos loaded</p>
        </div>
      </template>
    </v-infinite-scroll>

    <!-- Fullscreen photo dialog -->
    <v-dialog
      v-model="fullscreenDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <div v-if="currentPhoto" class="fullscreen-container">
        <!-- Row 1: Top toolbar -->
        <div class="fullscreen-toolbar">
          <v-card color="rgba(0, 0, 0, 0.9)" flat class="toolbar-card">
            <v-card-actions class="pa-2">
              <v-spacer></v-spacer>

              <v-btn
                icon="mdi-download"
                variant="text"
                color="white"
                @click="downloadPhoto"
                :loading="downloading"
              >
              </v-btn>

              <v-btn
                icon="mdi-close"
                variant="text"
                color="white"
                @click="closeFullscreen"
              >
              </v-btn>
            </v-card-actions>
          </v-card>
        </div>

        <!-- Row 2: Image display area -->
        <div class="fullscreen-image-area">
          <v-card color="black" flat class="image-card">
            <div
              class="photo-container"
              @touchstart="handleTouchStart"
              @touchmove="handleTouchMove"
              @touchend="handleTouchEnd"
            >
              <v-img
                :src="getFullscreenImageUrl(currentPhoto)"
                class="fullscreen-image"
                contain
              >
                <template v-slot:placeholder>
                  <div class="image-placeholder-fullscreen">
                    <v-progress-circular
                      indeterminate
                      color="white"
                      size="64"
                    ></v-progress-circular>
                  </div>
                </template>
              </v-img>

              <!-- Navigation arrows -->
              <v-btn
                v-if="currentIndex > 0"
                icon="mdi-chevron-left"
                class="nav-btn nav-btn-left"
                color="white"
                variant="elevated"
                size="large"
                @click="previousPhoto"
              >
              </v-btn>

              <v-btn
                v-if="currentIndex < photos.length - 1"
                icon="mdi-chevron-right"
                class="nav-btn nav-btn-right"
                color="white"
                variant="elevated"
                size="large"
                @click="nextPhoto"
              >
              </v-btn>

              <!-- Photo information panel -->
              <div class="photo-details" v-if="showDetails">
                <v-card class="details-card ma-4" elevation="4">
                  <v-card-title class="text-h6">Photo Details</v-card-title>
                  <v-card-text>
                    <div v-if="currentPhoto.uploadedBy" class="mb-2">
                      <strong>Uploaded by:</strong>
                      {{ currentPhoto.uploadedBy }}
                    </div>
                    <div v-if="currentPhoto.timestamp" class="mb-2">
                      <strong>Date:</strong>
                      {{ formatDate(currentPhoto.timestamp) }}
                    </div>
                    <div v-if="currentPhoto.fileName" class="mb-2">
                      <strong>File:</strong> {{ currentPhoto.fileName }}
                    </div>
                    <div
                      v-if="currentPhoto.tags && currentPhoto.tags.length"
                      class="mb-2"
                    >
                      <strong>Tags:</strong>
                      <v-chip
                        v-for="tag in currentPhoto.tags"
                        :key="tag"
                        size="small"
                        class="ml-1"
                      >
                        {{ tag }}
                      </v-chip>
                    </div>
                    <!-- Persons detected -->
                    <div class="mb-2">
                      <div
                        v-if="loadingPersons"
                        class="d-flex justify-center py-2"
                      >
                        <v-progress-circular
                          indeterminate
                          color="primary"
                          size="24"
                        />
                      </div>

                      <div
                        v-else-if="persons.length"
                        class="persons-scroll d-flex"
                      >
                        <v-card
                          v-for="person in persons"
                          :key="person.personId"
                          width="50"
                          height="50"
                          class="ma-1"
                          @click="viewPersonPhotos(person.personId)"
                          style="cursor: pointer"
                          elevation="0"
                        >
                          <v-img
                            :src="
                              getFullscreenImageUrl(person, person.imageUrl)
                            "
                            alt="Person"
                          />
                        </v-card>
                      </div>

                      <div v-else class="text-caption">No people detected</div>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </div>
          </v-card>
        </div>

        <!-- Row 3: Bottom controls -->
        <div class="fullscreen-bottom">
          <v-card color="rgba(0, 0, 0, 0.9)" flat class="bottom-card">
            <v-card-actions class="pa-2">
              <v-btn
                :icon="showDetails ? 'mdi-information-off' : 'mdi-information'"
                variant="text"
                color="white"
                @click="showDetails = !showDetails"
              >
              </v-btn>

              <v-spacer></v-spacer>

              <span class="text-caption text-white">
                {{ currentIndex + 1 }} of {{ photos.length }}
              </span>
            </v-card-actions>
          </v-card>
        </div>
      </div>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { photosService } from "@/services";

// Props
const props = defineProps({
  photos: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: null,
  },
  hasMore: {
    type: Boolean,
    default: true,
  },
  emptyMessage: {
    type: String,
    default: "No photos found",
  },
});

// Emits
const emit = defineEmits(["load-more"]);

// Reactive data
const fullscreenDialog = ref(false);
const currentIndex = ref(0);
const showDetails = ref(false);
const downloading = ref(false);

// Persons detected in current photo
const persons = ref([]);
const loadingPersons = ref(false);

// Router
const router = useRouter();

// Load persons for the current fullscreen photo
const loadPersons = async () => {
  if (!currentPhoto.value || !currentPhoto.value.PK) {
    persons.value = [];
    return;
  }
  loadingPersons.value = true;
  try {
    const response = await photosService.getPersonsInPhoto(
      currentPhoto.value.PK
    );
    persons.value = response.items || [];
  } catch (err) {
    console.error("Error loading persons in photo:", err);
    persons.value = [];
  } finally {
    loadingPersons.value = false;
  }
};

// Navigate to the person folder when a thumbnail is clicked
const viewPersonPhotos = (personId) => {
  // close the dialog
  fullscreenDialog.value = false;
  router.push({ name: "PersonFolder", params: { id: personId } });
};
const galleryContainer = ref(null);
const containerWidth = ref(1200);

// Touch/swipe handling
const touchStartX = ref(0);
const touchStartY = ref(0);
const touchEndX = ref(0);
const touchEndY = ref(0);
const minSwipeDistance = 50;

// Layout configuration
const targetRowHeight = 250;
const maxRowHeight = 350;
const minRowHeight = 180;
const spacing = 4;

// Computed properties
const currentPhoto = computed(() => {
  return props.photos[currentIndex.value] || null;
});

// Process photos with aspect ratios and create justified layout
const processedPhotos = computed(() => {
  return props.photos.map((photo, index) => {
    // Default aspect ratio if not provided
    let aspectRatio = 1;

    // Try to get aspect ratio from photo metadata
    if (photo.width && photo.height) {
      aspectRatio = photo.width / photo.height;
    } else if (photo.aspectRatio) {
      aspectRatio = photo.aspectRatio;
    } else {
      // Default to common photo aspect ratios based on orientation hint
      aspectRatio =
        Math.random() > 0.7
          ? Math.random() > 0.5
            ? 4 / 3
            : 3 / 4
          : Math.random() > 0.3
          ? 16 / 9
          : 1;
    }

    return {
      ...photo,
      aspectRatio,
      originalIndex: index,
    };
  });
});

// Create justified rows
const justifiedRows = computed(() => {
  if (!processedPhotos.value.length) return [];

  const rows = [];
  let currentRow = [];
  let currentRowWidth = 0;
  let rowId = 0;

  const availableWidth = containerWidth.value - spacing * 2; // Account for container padding

  for (let i = 0; i < processedPhotos.value.length; i++) {
    const photo = processedPhotos.value[i];
    const photoWidth = targetRowHeight * photo.aspectRatio;

    // Check if adding this photo would exceed the row width
    if (
      currentRow.length > 0 &&
      currentRowWidth + photoWidth + currentRow.length * spacing >
        availableWidth
    ) {
      // Finalize current row
      const finalizedRow = finalizeRow(currentRow, availableWidth, rowId++);
      if (finalizedRow) rows.push(finalizedRow);

      // Start new row
      currentRow = [photo];
      currentRowWidth = photoWidth;
    } else {
      // Add photo to current row
      currentRow.push(photo);
      currentRowWidth += photoWidth;
    }
  }

  // Handle last row
  if (currentRow.length > 0) {
    const finalizedRow = finalizeRow(currentRow, availableWidth, rowId++, true);
    if (finalizedRow) rows.push(finalizedRow);
  }

  return rows;
});

// Finalize a row by calculating exact dimensions
const finalizeRow = (photos, availableWidth, rowId, isLastRow = false) => {
  if (!photos.length) return null;

  const totalSpacing = (photos.length - 1) * spacing;
  const availablePhotoWidth = availableWidth - totalSpacing;

  // Calculate total width at target height
  const totalWidthAtTargetHeight = photos.reduce((sum, photo) => {
    return sum + targetRowHeight * photo.aspectRatio;
  }, 0);

  // Calculate scale factor to fit the row
  let scaleFactor = availablePhotoWidth / totalWidthAtTargetHeight;
  let rowHeight = targetRowHeight * scaleFactor;

  // Constrain row height
  if (rowHeight > maxRowHeight) {
    rowHeight = maxRowHeight;
    scaleFactor = rowHeight / targetRowHeight;
  } else if (rowHeight < minRowHeight && !isLastRow) {
    rowHeight = minRowHeight;
    scaleFactor = rowHeight / targetRowHeight;
  }

  // For last row, don't stretch if it would make images too large
  if (isLastRow && rowHeight > targetRowHeight * 1.2) {
    rowHeight = targetRowHeight;
    scaleFactor = 1;
  }

  // Calculate display width for each photo
  const processedPhotos = photos.map((photo) => ({
    ...photo,
    displayWidth: Math.floor(rowHeight * photo.aspectRatio),
  }));

  return {
    id: rowId,
    height: Math.floor(rowHeight),
    photos: processedPhotos,
  };
};

// Skeleton loading helpers
const getRandomSkeletonCount = () => Math.floor(Math.random() * 3) + 2;
const getRandomSkeletonWidth = () =>
  `${Math.floor(Math.random() * 200) + 150}px`;

// Methods
const getImageUrl = (photo) => {
  if (!photo) return "";

  // // Use thumbnail if available, otherwise use original
  // if (photo.thumbnailFileName) {
  //   return `${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${
  //     photo.thumbnailFileName
  //   }`;
  // }

  return `${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${photo.s3Key}`;
};

const getFullscreenImageUrl = (photo, key) => {
  if (!photo) return "";

  if (key) return `${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${key}`;

  // Always use original s3Key for fullscreen view
  return `${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${photo.s3Key}`;
};

const formatDate = (timestamp) => {
  if (!timestamp) return "Unknown date";

  const date = new Date(Number(timestamp));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isLoadingMore = ref(false);

const loadMorePhotos = async ({ done }) => {
  if (isLoadingMore.value) {
    // Already fetching next page; do nothing yet.
    return;
  }

  if (!props.hasMore) {
    done("empty");
    return;
  }

  isLoadingMore.value = true;

  // Tell parent to load next page
  emit("load-more");

  // Watch for parent to finish loading (props.loading goes false)
  const stop = watch(
    () => props.loading,
    (val) => {
      if (val === false) {
        done(props.hasMore ? "ok" : "empty");
        isLoadingMore.value = false;
        stop();
      }
    },
    { immediate: false }
  );
  // Note: further pagination handling occurs once parent finishes loading.
};

const openFullscreen = async (index) => {
  currentIndex.value = index;
  fullscreenDialog.value = true;
  showDetails.value = false;
  await loadPersons();
};

const closeFullscreen = () => {
  fullscreenDialog.value = false;
  currentIndex.value = 0;
};

const nextPhoto = async () => {
  if (currentIndex.value < props.photos.length - 1) {
    currentIndex.value++;
    await loadPersons();
  }
};

const previousPhoto = async () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    await loadPersons();
  }
};

const downloadPhoto = async () => {
  if (!currentPhoto.value) return;

  downloading.value = true;
  try {
    const imageUrl = getFullscreenImageUrl(currentPhoto.value);
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download =
      currentPhoto.value.fileName ||
      `photo-${currentPhoto.value.PK || Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Error downloading photo:", error);
  } finally {
    downloading.value = false;
  }
};

// Touch/swipe handling methods
const handleTouchStart = (event) => {
  touchStartX.value = event.touches[0].clientX;
  touchStartY.value = event.touches[0].clientY;
};

const handleTouchMove = (event) => {
  // Prevent default scrolling behavior during swipe
  event.preventDefault();
};

const handleTouchEnd = (event) => {
  touchEndX.value = event.changedTouches[0].clientX;
  touchEndY.value = event.changedTouches[0].clientY;

  handleSwipe();
};

const handleSwipe = () => {
  const deltaX = touchEndX.value - touchStartX.value;
  const deltaY = touchEndY.value - touchStartY.value;

  // Check if it's a horizontal swipe (more horizontal than vertical movement)
  if (
    Math.abs(deltaX) > Math.abs(deltaY) &&
    Math.abs(deltaX) > minSwipeDistance
  ) {
    if (deltaX > 0) {
      // Swipe right - go to previous photo
      previousPhoto();
    } else {
      // Swipe left - go to next photo
      nextPhoto();
    }
  }
};

// Resize handling
const updateContainerWidth = () => {
  if (galleryContainer.value) {
    containerWidth.value = galleryContainer.value.offsetWidth;
  }
};

const handleResize = () => {
  updateContainerWidth();
};

// Keyboard navigation
const handleKeydown = (event) => {
  if (!fullscreenDialog.value) return;

  switch (event.key) {
    case "Escape":
      closeFullscreen();
      break;
    case "ArrowLeft":
      previousPhoto();
      break;
    case "ArrowRight":
      nextPhoto();
      break;
    case "i":
    case "I":
      showDetails.value = !showDetails.value;
      break;
  }
};

// Lifecycle hooks
onMounted(() => {
  nextTick(() => {
    updateContainerWidth();
  });
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

// Watch for fullscreen dialog changes to add/remove keyboard listeners
watch(fullscreenDialog, (newValue) => {
  if (newValue) {
    document.addEventListener("keydown", handleKeydown);
  } else {
    document.removeEventListener("keydown", handleKeydown);
  }
});

// Watch for photos changes to update layout
watch(
  () => props.photos,
  () => {
    nextTick(() => {
      updateContainerWidth();
    });
  },
  { deep: true }
);
</script>

<style scoped>
/* Justified Gallery Styles */
.justified-gallery {
  padding: 4px;
}

.gallery-row {
  display: flex;
  margin-bottom: 4px;
  gap: 4px;
}

.gallery-item {
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.gallery-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.gallery-image {
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  padding: 12px;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
}

.gallery-item:hover .photo-overlay {
  opacity: 1;
}

.photo-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Loading States */
.loading-skeleton {
  padding: 4px;
}

.skeleton-row {
  display: flex;
  margin-bottom: 4px;
  gap: 4px;
}

.loading-more,
.all-loaded {
  text-align: center;
  padding: 32px 16px;
}

/* Fullscreen Styles */
.fullscreen-container {
  background-color: black;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Row 1: Top toolbar */
.fullscreen-toolbar {
  flex-shrink: 0;
  z-index: 1000;
}

.toolbar-card {
  border-radius: 0 !important;
}

/* Row 2: Image area */
.fullscreen-image-area {
  flex: 1;
  min-height: 0;
}

.image-card {
  height: 100%;
  border-radius: 0 !important;
}

.photo-container {
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: pan-y;
}

.fullscreen-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-placeholder-fullscreen {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: black;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.nav-btn:hover {
  opacity: 1;
}

.nav-btn-left {
  left: 20px;
}

.nav-btn-right {
  right: 20px;
}

.photo-details {
  position: absolute;
  top: 20px;
  right: 20px;
  max-width: 300px;
  z-index: 3;
}

.details-card {
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

/* Row 3: Bottom controls */
.fullscreen-bottom {
  flex-shrink: 0;
  z-index: 1000;
}

.bottom-card {
  border-radius: 0 !important;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Responsive Design */
@media (max-width: 768px) {
  .justified-gallery {
    padding: 2px;
  }

  .gallery-row {
    margin-bottom: 2px;
    gap: 2px;
  }

  .photo-overlay {
    padding: 8px;
  }

  .nav-btn {
    opacity: 0.6;
    transform: translateY(-50%) scale(0.8);
  }

  .nav-btn-left {
    left: 10px;
  }

  .nav-btn-right {
    right: 10px;
  }

  .photo-details {
    position: absolute;
    top: auto;
    bottom: 20px; /* Position from bottom of content area */
    left: 20px;
    right: 20px;
    max-width: none;
    z-index: 999;
  }

  .details-card {
    margin: 0;
    max-height: 40vh;
    overflow-y: auto;
  }

  .toolbar-card .v-card-actions,
  .bottom-card .v-card-actions {
    padding: 8px 16px;
  }
}

@media (max-width: 480px) {
  .justified-gallery {
    padding: 1px;
  }

  .gallery-row {
    margin-bottom: 1px;
    gap: 1px;
  }

  .photo-overlay {
    padding: 6px;
  }

  .photo-info .text-caption {
    font-size: 0.7rem;
  }

  .photo-details {
    left: 10px;
    right: 10px;
    bottom: 10px;
  }

  .nav-btn-left {
    left: 5px;
  }

  .nav-btn-right {
    right: 5px;
  }

  .toolbar-card .v-card-actions,
  .bottom-card .v-card-actions {
    padding: 4px 12px;
  }
}
.persons-scroll {
  overflow-x: auto;
}
</style>
