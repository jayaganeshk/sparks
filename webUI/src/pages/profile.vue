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
    
    <InfinitePhotoGrid
      :photos="photos"
      :loading="loading"
      :has-more="!!lastEvaluatedKey"
      empty-message="You haven't uploaded any photos yet."
      @load-more="loadMorePhotos"
    />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAppStore } from "@/store/app";
import { useRouter } from "vue-router";
import { apiService } from "@/services/api";
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

const photos = ref([]);
const loading = ref(true);
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
  
  try {
    const response = await apiService.get(
      `/me/photos?lastEvaluatedKey=${lastEvaluatedKey.value}`
    );
    
    if (response && Array.isArray(response.items)) {
      photos.value.push(...response.items);
      lastEvaluatedKey.value = response.lastEvaluatedKey || null;
    }
  } catch (error) {
    console.error("Error fetching more user photos:", error);
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
