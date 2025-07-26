<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Profile</h1>
      </v-col>
    </v-row>

    <!-- Loading indicator -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
      </v-col>
    </v-row>

    <!-- Error message -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert
          type="error"
          title="Error loading profile"
          :text="error"
        ></v-alert>
      </v-col>
    </v-row>

    <!-- Profile information -->
    <template v-else>
      <v-row>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>User Information</v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon icon="mdi-email"></v-icon>
                  </template>
                  <v-list-item-title>Email</v-list-item-title>
                  <v-list-item-subtitle>{{
                    userProfile.email
                  }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon icon="mdi-account"></v-icon>
                  </template>
                  <v-list-item-title>Display Name</v-list-item-title>
                  <v-list-item-subtitle>{{
                    userProfile.displayName
                  }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon icon="mdi-calendar"></v-icon>
                  </template>
                  <v-list-item-title>Joined</v-list-item-title>
                  <v-list-item-subtitle>{{
                    formatDate(userProfile.createdAt)
                  }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon icon="mdi-image-multiple"></v-icon>
                  </template>
                  <v-list-item-title>Upload Limit</v-list-item-title>
                  <v-list-item-subtitle
                    >{{ userProfile.uploadLimit }} photos</v-list-item-subtitle
                  >
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>Edit Profile</v-card-title>
            <v-card-text>
              <v-form @submit.prevent="updateProfile">
                <v-text-field
                  v-model="form.displayName"
                  label="Display Name"
                  :rules="[(v) => !!v || 'Display name is required']"
                  required
                ></v-text-field>

                <v-btn
                  type="submit"
                  color="primary"
                  block
                  :loading="updating"
                  :disabled="updating"
                >
                  Update Profile
                </v-btn>
              </v-form>
            </v-card-text>
          </v-card>

          <v-card class="mt-4">
            <v-card-title>Sign Out</v-card-title>
            <v-card-text>
              <v-btn
                color="error"
                block
                @click="signOut"
                :loading="signingOut"
                :disabled="signingOut"
              >
                Sign Out
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12">
          <h2 class="text-h5 mb-4">My Photos</h2>
        </v-col>
      </v-row>

      <!-- User photos loading -->
      <v-row v-if="loadingPhotos">
        <v-col cols="12" class="text-center">
          <v-progress-circular
            indeterminate
            color="primary"
            size="64"
          ></v-progress-circular>
        </v-col>
      </v-row>

      <!-- No photos message -->
      <v-row v-else-if="userPhotos.length === 0">
        <v-col cols="12">
          <v-alert
            type="info"
            title="No photos"
            text="You haven't uploaded any photos yet."
          ></v-alert>
        </v-col>
      </v-row>

      <!-- User photos grid -->
      <v-row v-else>
        <v-col
          v-for="photo in userPhotos"
          :key="photo.PK"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <PhotoCard :photo="photo" />
        </v-col>
      </v-row>

      <!-- Load more button -->
      <v-row v-if="hasMorePhotos && !loadingPhotos">
        <v-col cols="12" class="text-center">
          <v-btn color="primary" @click="loadMorePhotos" :loading="loadingMore">
            Load More
          </v-btn>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "@/store/app";
import PhotoCard from "@/components/PhotoCard.vue";
import { meService, usersService } from "@/services";

const router = useRouter();
const appStore = useAppStore();

// State
const userProfile = ref({
  email: "",
  displayName: "",
  createdAt: "",
  uploadLimit: 0,
});
const loading = ref(true);
const updating = ref(false);
const signingOut = ref(false);
const error = ref(null);
const form = reactive({
  displayName: "",
});

// User photos state
const userPhotos = ref([]);
const loadingPhotos = ref(true);
const loadingMore = ref(false);
const lastEvaluatedKey = ref(null);
const hasMorePhotos = ref(false);

// Format date
const formatDate = (timestamp) => {
  if (!timestamp) return "Unknown date";

  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Load user profile
const loadUserProfile = async () => {
  loading.value = true;
  error.value = null;

  try {
    const data = await meService.getProfile();
    userProfile.value = data;
    form.displayName = data.displayName;
    appStore.setUserEmail(data.email);
  } catch (err) {
    console.error("Error loading profile:", err);
    error.value = "Failed to load profile. Please try again later.";
  } finally {
    loading.value = false;
  }
};

// Update profile
const updateProfile = async () => {
  updating.value = true;

  try {
    const updatedProfile = await meService.updateProfile({
      displayName: form.displayName,
    });
    userProfile.value = updatedProfile;
    alert("Profile updated successfully");
  } catch (err) {
    console.error("Error updating profile:", err);
    alert("Failed to update profile. Please try again later.");
  } finally {
    updating.value = false;
  }
};

// Sign out
const signOut = async () => {
  signingOut.value = true;

  try {
    await appStore.logout();
    router.push("/auth/login");
  } catch (err) {
    console.error("Error signing out:", err);
    alert("Failed to sign out. Please try again later.");
  } finally {
    signingOut.value = false;
  }
};

// Load user photos
const loadUserPhotos = async () => {
  loadingPhotos.value = true;

  try {
    const data = await usersService.getUserPhotos(userProfile.value.email);
    userPhotos.value = data.items;
    lastEvaluatedKey.value = data.lastEvaluatedKey;
    hasMorePhotos.value = !!data.lastEvaluatedKey;
  } catch (err) {
    console.error("Error loading user photos:", err);
    // Show error toast or notification
  } finally {
    loadingPhotos.value = false;
  }
};

// Load more photos
const loadMorePhotos = async () => {
  if (!lastEvaluatedKey.value || loadingMore.value) return;

  loadingMore.value = true;

  try {
    const data = await usersService.getUserPhotos(
      userProfile.value.email,
      lastEvaluatedKey.value
    );
    userPhotos.value.push(...data.items);
    lastEvaluatedKey.value = data.lastEvaluatedKey;
    hasMorePhotos.value = !!data.lastEvaluatedKey;
  } catch (err) {
    console.error("Error loading more photos:", err);
    // Show error toast or notification
  } finally {
    loadingMore.value = false;
  }
};

// Load data on component mount
onMounted(async () => {
  await loadUserProfile();
  if (!error.value) {
    loadUserPhotos();
  }
});
</script>
