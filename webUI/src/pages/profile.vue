<template>
  <v-container>
    <v-card
      v-if="isAuthenticated"
      class="profile-header d-flex align-center pa-2"
      color="grey-lighten-4"
    >
      <v-avatar color="primary" size="50" class="mr-4">
        <span class="white--text">{{ userInitial }}</span>
      </v-avatar>
      <div>
        <div class="text-h6">{{ userName }}</div>
        <div class="text-subtitle-2">{{ userEmail }}</div>
      </div>
      <v-spacer></v-spacer>
      <v-btn @click="handleLogout" color="secondary">Logout</v-btn>
    </v-card>

    <v-divider class="my-8"></v-divider>

    <h2 class="text-h6 mb-4">My Photos</h2>
    <v-row v-if="loading">
      <v-col v-for="n in 6" :key="n" cols="12" sm="6" md="4">
        <v-skeleton-loader type="card"></v-skeleton-loader>
      </v-col>
    </v-row>
    <v-row v-else-if="photos.length > 0">
      <v-col v-for="photo in photos" :key="photo.PK" cols="12" sm="6" md="4">
        <v-card>
          <v-img :src="photo.url" aspect-ratio="1" class="grey lighten-2" cover>
            <template v-slot:placeholder>
              <v-row class="fill-height ma-0" align="center" justify="center">
                <v-progress-circular
                  indeterminate
                  color="grey-lighten-5"
                ></v-progress-circular>
              </v-row>
            </template>
          </v-img>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-else>
      <v-col cols="12" class="text-center text-grey mt-8">
        <p>You haven't uploaded any photos yet.</p>
      </v-col>
    </v-row>

    <v-row v-if="lastEvaluatedKey" class="mt-8">
      <v-col class="text-center">
        <v-btn :loading="loadingMore" @click="loadMorePhotos" color="primary"
          >Load More</v-btn
        >
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAppStore } from "@/store/app";
import { useRouter } from "vue-router";
import { apiService } from "@/services/api";

const appStore = useAppStore();
const router = useRouter();

const isAuthenticated = computed(() => appStore.isAuthenticated);
const userName = computed(() => appStore.userName || "User");
const userEmail = computed(() => appStore.userEmail || "");
const userInitial = computed(() => {
  if (!userEmail.value) return "";
  return userEmail.value.charAt(0).toUpperCase();
});

const photos = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const lastEvaluatedKey = ref(null);

const handleLogout = async () => {
  await appStore.logout();
  router.push("/auth/login");
};

const fetchUserPhotos = async () => {
  loading.value = true;
  try {
    const response = await apiService.get("/me/photos");
    photos.value = response.items;
    lastEvaluatedKey.value = response.lastEvaluatedKey;
  } catch (error) {
    console.error("Error fetching user photos:", error);
  } finally {
    loading.value = false;
  }
};

const loadMorePhotos = async () => {
  if (!lastEvaluatedKey.value) return;
  loadingMore.value = true;
  try {
    const response = await apiService.get(
      `/me/photos?lastEvaluatedKey=${lastEvaluatedKey.value}`
    );
    photos.value.push(...response.items);
    lastEvaluatedKey.value = response.lastEvaluatedKey;
  } catch (error) {
    console.error("Error fetching more user photos:", error);
  } finally {
    loadingMore.value = false;
  }
};

onMounted(() => {
  if (appStore.isAuthenticated) {
    fetchUserPhotos();
  } else {
    loading.value = false;
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
</style>
