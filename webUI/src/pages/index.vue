<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h6 mb-4">Photos</h1>
      </v-col>
    </v-row>

    <InfinitePhotoGrid
      :photos="photos"
      :loading="loading"
      :error="error"
      :has-more="!!lastEvaluatedKey"
      empty-message="No photos have been uploaded yet."
      @load-more="loadMorePhotos"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import InfinitePhotoGrid from "@/components/InfinitePhotoGrid.vue";
import { apiService } from "@/services/api";

const photos = ref([]);
const loading = ref(true);
const error = ref(null);
const lastEvaluatedKey = ref(null);

const fetchPhotos = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await apiService.get("/photos");
    console.log("response", response);
    // Ensure we have a valid response with items array
    if (response && response && Array.isArray(response.items)) {
      photos.value = response.items;
      lastEvaluatedKey.value = response.lastEvaluatedKey || null;
    } else {
      // If response doesn't have expected structure, set empty array
      console.warn("Unexpected API response format:", response);
      photos.value = [];
      lastEvaluatedKey.value = null;
    }
  } catch (err) {
    console.error("Error fetching photos:", err);
    error.value = "Failed to load photos. Please try again later.";
    photos.value = []; // Ensure photos is always an array
  } finally {
    loading.value = false;
  }
};

const loadMorePhotos = async () => {
  if (!lastEvaluatedKey.value) return;

  try {
    const response = await apiService.get(
      `/photos?lastEvaluatedKey=${lastEvaluatedKey.value}`
    );
    
    if (response && Array.isArray(response.items)) {
      photos.value.push(...response.items);
      lastEvaluatedKey.value = response.lastEvaluatedKey || null;
    }
  } catch (err) {
    console.error("Error fetching more photos:", err);
    error.value = "Failed to load more photos. Please try again.";
  }
};

onMounted(() => {
  fetchPhotos();
});
</script>
