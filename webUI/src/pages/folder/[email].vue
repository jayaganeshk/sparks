<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-btn
          prepend-icon="mdi-arrow-left"
          variant="text"
          @click="router.back()"
          class="mb-4"
        >
          Back to Users
        </v-btn>
        <h1 class="text-h6 mb-4">Photos by {{ userDisplayName }}</h1>
      </v-col>
    </v-row>

    <InfinitePhotoGrid
      :photos="photos"
      :loading="loading"
      :error="error"
      :has-more="hasMorePhotos"
      :empty-message="`${userDisplayName} hasn't uploaded any photos yet.`"
      @load-more="loadMorePhotos"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import InfinitePhotoGrid from "@/components/InfinitePhotoGrid.vue";
import { usersService } from "@/services";

const router = useRouter();
const route = useRoute();
const userEmail = computed(() => route.params.email);

// State
const userDisplayName = ref("");
const photos = ref([]);
const loading = ref(true);
const error = ref(null);
const lastEvaluatedKey = ref(null);
const hasMorePhotos = ref(false);

// Load user photos
const loadUserPhotos = async () => {
  loading.value = true;
  error.value = null;

  try {
    const [userData, photosData] = await Promise.all([
      usersService.getUserByEmail(userEmail.value),
      usersService.getUserPhotos(userEmail.value),
    ]);

    userDisplayName.value = userData.displayName || userEmail.value;
    photos.value = photosData.items;
    lastEvaluatedKey.value = photosData.lastEvaluatedKey;
    hasMorePhotos.value = !!photosData.lastEvaluatedKey;
  } catch (err) {
    console.error("Error loading user photos:", err);
    error.value = "Failed to load photos. Please try again later.";
  } finally {
    loading.value = false;
  }
};

// Load more photos
const loadMorePhotos = async () => {
  if (!lastEvaluatedKey.value || loading.value) return;

  loading.value = true;
  try {
    const data = await usersService.getUserPhotos(
      userEmail.value,
      lastEvaluatedKey.value
    );
    photos.value.push(...data.items);
    lastEvaluatedKey.value = data.lastEvaluatedKey;
    hasMorePhotos.value = !!data.lastEvaluatedKey;
  } catch (err) {
    console.error("Error loading more photos:", err);
    error.value = "Failed to load more photos. Please try again.";
  } finally {
    loading.value = false;
  }
};

// Load data on component mount
onMounted(() => {
  loadUserPhotos();
});

// Watch for route changes to reload data
watch(
  () => route.params.email,
  (newEmail) => {
    if (newEmail) {
      loadUserPhotos();
    }
  }
);
</script>
