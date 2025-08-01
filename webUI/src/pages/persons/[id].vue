<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-btn
          prepend-icon="mdi-arrow-left"
          variant="text"
          @click="router.push({ name: 'Persons' })"
          class="mb-4"
        >
          Back to People
        </v-btn>
      </v-col>
    </v-row>

    <div>Photos of {{ personName }}</div>

    <InfinitePhotoGrid
      :photos="photos"
      :loading="loading"
      :error="error"
      :has-more="hasMorePhotos"
      :empty-message="`No photos found with ${personName}.`"
      @load-more="loadMorePhotos"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import InfinitePhotoGrid from "@/components/InfinitePhotoGrid.vue";
import { personsService } from "@/services";

const router = useRouter();
const route = useRoute();
const personId = computed(() => route.params.id);

// State
const personName = ref("Loading...");
const photos = ref([]);
const loading = ref(true);
const error = ref(null);
const lastEvaluatedKey = ref(null);
const hasMorePhotos = ref(false);

// Load person details and photos
const loadPersonPhotos = async () => {
  loading.value = true;
  error.value = null;

  try {
    const [personData, photosData] = await Promise.all([
      personsService.getPersonById(personId.value),
      personsService.getPersonPhotos(personId.value),
    ]);

    personName.value = personData.displayName || "Unknown Person";
    photos.value = photosData.items;
    lastEvaluatedKey.value = photosData.lastEvaluatedKey;
    hasMorePhotos.value = !!photosData.lastEvaluatedKey;
  } catch (err) {
    console.error("Error loading person photos:", err);
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
    const data = await personsService.getPersonPhotos(
      personId.value,
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
  loadPersonPhotos();
});

// Watch for route changes to reload data
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadPersonPhotos();
    }
  }
);
</script>
