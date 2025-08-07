<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h6 mb-4">People</h1>
      </v-col>
    </v-row>

    <!-- Loading indicator -->
    <div v-if="loading" class="persons-grid">
      <v-skeleton-loader
        v-for="n in 8"
        :key="n"
        type="card"
        class="ma-2"
      ></v-skeleton-loader>
    </div>

    <!-- Error message -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert
          type="error"
          title="Error loading people"
          :text="error"
        ></v-alert>
      </v-col>
    </v-row>

    <!-- No persons message -->
    <v-row v-else-if="persons.length === 0">
      <v-col cols="12" class="text-center text-grey mt-8">
        <p>No people have been detected in your photos yet.</p>
      </v-col>
    </v-row>

    <!-- Persons grid -->
    <div v-else class="persons-grid">
      <v-card
        v-for="person in persons"
        :key="person.PK"
        @click="viewPerson(person.SK)"
        hover
        class="person-card ma-2"
      >
        <v-img
          :src="imageUrl(person.s3Key)"
          :aspect-ratio="1"
          cover
          height="80"
          width="80"
          class="grey lighten-2"
        >
          <template v-slot:placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular
                indeterminate
                color="grey-lighten-5"
              ></v-progress-circular>
            </div>
          </template>
        </v-img>

        <!-- <v-card-subtitle class="pt-1"
          >{{ person.faceCount }} photo{{
            person.faceCount !== 1 ? "s" : ""
          }}</v-card-subtitle
        > -->
        <v-card-actions>
          <v-card-title class="text-subtitle-1">{{
            person.displayName || "Unknown"
          }}</v-card-title>
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="small"
            @click.stop="editPersonName(person)"
          ></v-btn>
        </v-card-actions>
      </v-card>
    </div>

    <!-- Infinite scroll loader -->
    <div v-if="loadingMore" class="text-center mt-8">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <!-- Edit Person Name Dialog -->
    <v-dialog v-model="editDialog" max-width="500px">
      <v-card>
        <v-card-title>Edit Person Name</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveName">
            <v-text-field
              v-model="editedName"
              label="Name"
              required
              autofocus
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="editDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveName" :loading="saving"
            >Save</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import { personsService, apiCacheService } from "@/services";
import { useApiCache } from "@/utils/useApiCache";

const router = useRouter();
const loadingMore = ref(false);
const editDialog = ref(false);
const editedPerson = ref(null);
const editedName = ref("");
const saving = ref(false);

// Use our API cache utility for loading persons with caching
const {
  data: personsData,
  isLoading: loading,
  isRefreshing,
  error,
  refresh: refreshPersons
} = useApiCache(
  // API function to call (with cache handling)
  async (forceRefresh = false) => {
    return await personsService.getAllPersons(null, forceRefresh);
  },
  // Dependencies that should trigger reload
  [],
  // Options
  { autoLoad: true }
);

// Computed property to access persons data
const persons = computed(() => personsData.value?.items || []);
const lastEvaluatedKey = computed(() => personsData.value?.lastEvaluatedKey || null);

// Use the signed URL directly from the API response
const imageUrl = (s3Key) => {
  // The API now returns s3Key as a signed URL
  return s3Key;
};

// We no longer need fetchPersons as useApiCache handles this
// It's replaced by the refreshPersons function from useApiCache

const loadMorePersons = async () => {
  if (!lastEvaluatedKey.value || loadingMore.value) return;

  loadingMore.value = true;
  try {
    // Use personsService with caching for pagination
    const response = await personsService.getAllPersons(lastEvaluatedKey.value, true);
    
    // If we have data, append new items to existing data
    if (personsData.value && response && Array.isArray(response.items)) {
      if (!personsData.value.items) {
        personsData.value.items = [];
      }
      personsData.value.items.push(...response.items);
      
      // Update lastEvaluatedKey in the cached data
      personsData.value.lastEvaluatedKey = response.lastEvaluatedKey || null;
    }
  } catch (err) {
    console.error("Error fetching more persons:", err);
  } finally {
    loadingMore.value = false;
  }
};

const viewPerson = (personId) => {
  router.push({ name: "PersonFolder", params: { id: personId } });
};

const editPersonName = (person) => {
  editedPerson.value = person;
  editedName.value = person.name || "";
  editDialog.value = true;
};

const saveName = async () => {
  if (!editedPerson.value || !editedName.value) return;

  saving.value = true;
  try {
    // Use personsService for updating
    const updatedPerson = await personsService.updatePerson(
      editedPerson.value.SK,
      { name: editedName.value }
    );

    // Since this is a mutation operation, we should refresh the data
    // But we can also update the local cache directly for immediate feedback
    if (personsData.value && personsData.value.items) {
      const index = personsData.value.items.findIndex(
        (p) => p.PK === editedPerson.value.PK
      );
      if (index !== -1) {
        personsData.value.items[index] = updatedPerson;
      }
    }
    
    editDialog.value = false;
  } catch (err) {
    console.error("Error updating person name:", err);
    // Optionally, show an error message to the user
  } finally {
    saving.value = false;
  }
};

const handleScroll = () => {
  const nearBottom =
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
  if (nearBottom && lastEvaluatedKey.value && !loadingMore.value) {
    loadMorePersons();
  }
};

onMounted(() => {
  // fetchPersons is handled by useApiCache
  // If we have cached data, refresh in background
  if (personsData.value) {
    setTimeout(() => refreshPersons(true), 100);
  }
  
  window.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<style scoped>
.persons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  justify-content: center;
}

.person-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s;
}

.person-card:hover {
  transform: scale(1.05);
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .persons-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}

@media (min-width: 1200px) {
  .persons-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}
</style>
