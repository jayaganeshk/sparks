<template>
  <v-container>
    <v-card
      v-if="isAuthenticated"
      class="profile-header d-flex align-center pa-2"
      color="grey-lighten-4"
    >
      <v-avatar
        color="primary"
        size="50"
        class="mr-4"
        @click="openProfilePictureDialog"
      >
        <v-img
          v-if="profilePictureUrl"
          :src="profilePictureUrl"
          alt="Profile Picture"
        ></v-img>
        <span v-else class="white--text">{{ userInitial }}</span>
      </v-avatar>
      <div>
        <div class="text-h6">{{ userName }}</div>
        <div class="text-subtitle-2">{{ userEmail }}</div>
      </div>
      <v-spacer></v-spacer>
      <v-btn @click="handleLogout" color="secondary">Logout</v-btn>
    </v-card>

    <v-divider class="my-8"></v-divider>

    <v-tabs v-model="activeTab" color="primary" align-tabs="center">
      <v-tab value="uploaded">My Uploads</v-tab>
      <v-tab value="tagged">Photos With Me</v-tab>
    </v-tabs>

    <v-window v-model="activeTab" class="mt-4">
      <v-window-item value="uploaded">
        <InfinitePhotoGrid
          :photos="uploadedPhotos"
          :loading="uploadedLoading"
          :has-more="!!uploadedLastEvaluatedKey"
          empty-message="You haven't uploaded any photos yet."
          :allow-delete="true"
          @load-more="loadMoreUploadedPhotos"
          @delete-photo="handleDeletePhoto"
        />
      </v-window-item>

      <v-window-item value="tagged">
        <!-- Case 1: No profile picture uploaded yet -->
        <div
          v-if="!profilePictureUrl && !userPersonId"
          class="text-center pa-4"
        >
          <p class="mb-4">
            To see photos where you appear, you need to upload a profile picture
            for face recognition.
          </p>
          <v-btn color="primary" @click="openProfilePictureDialog"
            >Upload Profile Picture</v-btn
          >
        </div>

        <!-- Case 2: Profile picture uploaded but still processing -->
        <div v-else-if="processingProfilePicture" class="text-center pa-4">
          <v-progress-circular
            indeterminate
            color="primary"
            size="64"
            class="mb-4"
          ></v-progress-circular>
          <p class="mb-4">
            {{ processingMessage }}
          </p>
        </div>

        <!-- Case 3: Profile picture processed and photos available -->
        <InfinitePhotoGrid
          v-else
          :photos="taggedPhotos"
          :loading="taggedLoading"
          :has-more="!!taggedLastEvaluatedKey"
          empty-message="No photos with you have been found yet."
          @load-more="loadMoreTaggedPhotos"
        />
      </v-window-item>
    </v-window>

    <!-- Profile Picture Upload Dialog -->
    <v-dialog v-model="profilePictureDialog" max-width="500px">
      <v-card>
        <v-card-title>Upload Profile Picture</v-card-title>
        <v-card-text>
          <p class="mb-4">
            Upload a clear photo of your face to enable face recognition.
          </p>

          <v-file-input
            v-model="profilePictureFile"
            accept="image/*"
            label="Select a profile picture"
            prepend-icon="mdi-camera"
            show-size
            :error-messages="fileError"
          ></v-file-input>

          <div v-if="profilePicturePreview" class="text-center mt-4">
            <v-img
              :src="profilePicturePreview"
              max-height="200"
              contain
              class="mx-auto"
            ></v-img>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="closeProfilePictureDialog"
            >Cancel</v-btn
          >
          <v-btn
            color="primary"
            @click="uploadProfilePicture"
            :loading="uploadingProfilePicture"
            :disabled="!profilePictureFile || uploadingProfilePicture"
          >
            Upload
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useAppStore } from "@/store/app";
import { useRouter } from "vue-router";
import { apiService, meService, apiCacheService } from "@/services";
import { useApiCache } from "@/utils/useApiCache";
import InfinitePhotoGrid from "@/components/InfinitePhotoGrid.vue";

const appStore = useAppStore();
const router = useRouter();

const isAuthenticated = computed(() => appStore.isAuthenticated);
const userName = computed(() => appStore.userName || "User");
const userEmail = computed(() => appStore.userEmail || "");
const userInitial = computed(() => {
  if (!userEmail.value) return "";
  return userEmail.value.charAt(0).toUpperCase();
});

// Tabs
const activeTab = ref("uploaded");

// Uploaded photos tab
const uploadedPhotos = ref([]);
const uploadedLoading = ref(true);
const uploadedLastEvaluatedKey = ref(null);

// Tagged photos tab
const taggedPhotos = ref([]);
const taggedLoading = ref(false);
const taggedLastEvaluatedKey = ref(null);
const userPersonId = ref(null);
const processingProfilePicture = ref(false);
const processingMessage = ref("");

// Profile picture
const profilePictureDialog = ref(false);
const profilePictureFile = ref(null);
const profilePicturePreview = ref(null);
const profilePictureUrl = computed(() => appStore.profilePictureUrl);
const uploadingProfilePicture = ref(false);
const fileError = ref("");

const handleLogout = async () => {
  await appStore.logout();
  router.push("/auth/login");
};

const openProfilePictureDialog = () => {
  profilePictureDialog.value = true;
};

const closeProfilePictureDialog = () => {
  profilePictureDialog.value = false;
  profilePictureFile.value = null;
  profilePicturePreview.value = null;
  fileError.value = "";
};

const uploadProfilePicture = async () => {
  if (!profilePictureFile.value) return;

  uploadingProfilePicture.value = true;
  fileError.value = "";

  try {
    // 1. Get a pre-signed URL for uploading
    const uploadUrlResponse = await apiService.get(
      "/me/profile-picture-upload"
    );

    if (!uploadUrlResponse || !uploadUrlResponse.uploadUrl) {
      throw new Error("Failed to get upload URL");
    }

    // 2. Upload the file directly to S3 using the pre-signed URL
    const { uploadUrl, key, fileId } = uploadUrlResponse;

    // Upload the file to S3 directly
    await fetch(uploadUrl, {
      method: "PUT",
      body: profilePictureFile.value,
      headers: {
        "Content-Type": profilePictureFile.value.type,
      },
    });

    // 3. Notify the backend that the upload is complete
    const response = await apiService.post("/me/profile-picture/complete", {
      key,
    });

    if (response && response.profilePictureUrl) {
      // Update the profile picture URL in the app store
      appStore.setProfilePicture(response.profilePictureUrl);
      closeProfilePictureDialog();

      // Show success message with processing info
      if (response.processingStatus === "started") {
        // You could show a toast notification here
        console.log(
          "Profile picture uploaded. Face recognition processing started."
        );

        // Refresh the tagged photos after a delay to check for results
        setTimeout(() => {
          fetchTaggedPhotos();
        }, 10000); // Wait 10 seconds then check for face recognition results
      }

      // If we're on the tagged tab, load the photos
      if (activeTab.value === "tagged") {
        fetchTaggedPhotos();
      }
    }
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    fileError.value = "Failed to upload profile picture. Please try again.";
  } finally {
    uploadingProfilePicture.value = false;
  }
};

// Watch for file changes to create preview
watch(profilePictureFile, (newFile) => {
  if (newFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
      profilePicturePreview.value = e.target.result;
    };
    reader.readAsDataURL(newFile);
    fileError.value = "";
  } else {
    profilePicturePreview.value = null;
  }
});

// Use our API cache utility for user photos with caching
const {
  data: uploadedPhotosData,
  isLoading: uploadedDataLoading,
  isRefreshing: uploadedRefreshing,
  error: uploadedError,
  refresh: refreshUserPhotos
} = useApiCache(
  // API function to call (with cache handling)
  async (forceRefresh = false) => {
    return await meService.getMyPhotos(null, forceRefresh);
  },
  // Dependencies that should trigger reload
  [],
  // Options
  { autoLoad: false } // We'll load this manually when user is authenticated
);

// Update our reactive references to use the cached data
watch(uploadedPhotosData, (newData) => {
  if (newData) {
    uploadedPhotos.value = newData.items || [];
    uploadedLastEvaluatedKey.value = newData.lastEvaluatedKey || null;
  }
});

// Watch for loading state changes
watch(uploadedDataLoading, (loading) => {
  uploadedLoading.value = loading;
});

const fetchUserPhotos = async () => {
  // Simply call refresh on our cached data
  await refreshUserPhotos();
};

// Handle delete photo event from grid
const handleDeletePhoto = async ({ imageId }) => {
  try {
    // Optimistic UI update: remove the photo locally
    const idx = uploadedPhotos.value.findIndex(
      (p) => p.imageId === imageId || p.PK === imageId
    );
    if (idx !== -1) {
      uploadedPhotos.value.splice(idx, 1);
    }

    await meService.deleteMyPhoto(imageId);

    // Invalidate cached uploads and refresh in background
    apiCacheService.clearCache('/me/photos');
    setTimeout(() => refreshUserPhotos(true), 50);
  } catch (err) {
    console.error('Failed to delete photo', err);
    // On failure, hard refresh to get server state
    await refreshUserPhotos(true);
  }
};

// Use API cache utility for tagged photos
const {
  data: taggedPhotosData,
  isLoading: taggedDataLoading,
  isRefreshing: taggedRefreshing,
  error: taggedError,
  refresh: refreshTaggedPhotos
} = useApiCache(
  // API function to call (with cache handling)
  async (forceRefresh = false) => {
    return await meService.getPhotosWithMe(null, forceRefresh);
  },
  // Dependencies that should trigger reload
  [],
  // Options
  { autoLoad: false } // We'll load this manually based on the active tab
);

// Update our reactive references to use the cached data
watch(taggedPhotosData, (newData) => {
  if (newData) {
    taggedPhotos.value = newData.items || [];
    taggedLastEvaluatedKey.value = newData.lastEvaluatedKey || null;
    
    // Update userPersonId if returned from the API
    if (newData.personId) {
      userPersonId.value = newData.personId;
    }
  }
});

// Watch for loading state changes
watch(taggedDataLoading, (loading) => {
  taggedLoading.value = loading;
});

const fetchTaggedPhotos = async () => {
  processingProfilePicture.value = false;
  processingMessage.value = "";
  
  try {
    // Use the cached API call
    await refreshTaggedPhotos();
    
    // Check if we have a profile picture but no personId yet (still processing)
    if (profilePictureUrl.value && !userPersonId.value) {
      // Only show processing message if we actually have a profile picture in the app store
      // This means the profile picture has been uploaded but face recognition is still processing
      processingProfilePicture.value = true;
      processingMessage.value =
        "Your profile picture is being processed. Please wait a few moments while we detect your face.";

      // Schedule another check in 10 seconds
      setTimeout(() => {
        fetchTaggedPhotos();
      }, 15000);
    }
  } catch (error) {
    console.error("Error fetching tagged photos:", error);
    taggedPhotos.value = [];
  }
};

// Use API cache utility for user profile
const {
  data: profileData,
  isLoading: profileLoading,
  isRefreshing: profileRefreshing,
  error: profileError,
  refresh: refreshUserProfile
} = useApiCache(
  // API function to call (with cache handling)
  async (forceRefresh = false) => {
    return await meService.getProfile(forceRefresh);
  },
  // Dependencies that should trigger reload
  [],
  // Options
  { autoLoad: false } // We'll load this manually when user is authenticated
);

// Update based on profile data changes
watch(profileData, (newData) => {
  if (newData) {
    if (newData.personId) {
      userPersonId.value = newData.personId;
    }
    if (newData.profilePictureUrl) {
      appStore.setProfilePicture(newData.profilePictureUrl);
    }
  }
});

const fetchUserProfile = async () => {
  try {
    // Use the cached API call
    await refreshUserProfile();
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
};

const loadMoreUploadedPhotos = async () => {
  if (!uploadedLastEvaluatedKey.value || uploadedLoading.value) return;

  uploadedLoading.value = true;
  try {
    // Use the me service with caching for pagination
    const response = await meService.getMyPhotos(uploadedLastEvaluatedKey.value, true);

    // If we have data, append new items to existing data
    if (uploadedPhotosData.value && response && Array.isArray(response.items)) {
      if (!uploadedPhotosData.value.items) {
        uploadedPhotosData.value.items = [];
      }
      uploadedPhotosData.value.items.push(...response.items);
      uploadedPhotosData.value.lastEvaluatedKey = response.lastEvaluatedKey || null;
      
      // Update our references
      uploadedPhotos.value.push(...response.items);
      uploadedLastEvaluatedKey.value = response.lastEvaluatedKey || null;
    }
  } catch (error) {
    console.error("Error fetching more user photos:", error);
  } finally {
    uploadedLoading.value = false;
  }
};

const loadMoreTaggedPhotos = async () => {
  if (!taggedLastEvaluatedKey.value || taggedLoading.value) return;

  taggedLoading.value = true;
  try {
    // Use the me service with caching for pagination
    const response = await meService.getPhotosWithMe(taggedLastEvaluatedKey.value, true);

    // If we have data, append new items to existing data
    if (taggedPhotosData.value && response && Array.isArray(response.items)) {
      if (!taggedPhotosData.value.items) {
        taggedPhotosData.value.items = [];
      }
      taggedPhotosData.value.items.push(...response.items);
      taggedPhotosData.value.lastEvaluatedKey = response.lastEvaluatedKey || null;
      
      // Update our references
      taggedPhotos.value.push(...response.items);
      taggedLastEvaluatedKey.value = response.lastEvaluatedKey || null;
    }
  } catch (error) {
    console.error("Error fetching more tagged photos:", error);
  } finally {
    taggedLoading.value = false;
  }
};

// Watch for tab changes to load appropriate data
watch(activeTab, (newTab) => {
  console.log("watch activie tab", newTab);
  if (
    newTab === "tagged"
    // &&
    // userPersonId.value &&
    // taggedPhotos.value.length === 0
  ) {
    fetchTaggedPhotos();
  }
});

onMounted(() => {
  if (appStore.isAuthenticated) {
    fetchUserProfile();
    fetchUserPhotos();
    
    // If we already have cached data, refresh it in the background
    if (profileData.value) {
      setTimeout(() => refreshUserProfile(true), 100);
    }
    if (uploadedPhotosData.value) {
      setTimeout(() => refreshUserPhotos(true), 100);
    }
  } else {
    uploadedLoading.value = false;
  }
});
</script>

<style scoped>
.profile-header {
  margin-bottom: 2rem;
}
.white--text {
  color: white !important;
}
.v-avatar {
  cursor: pointer;
}
</style>
