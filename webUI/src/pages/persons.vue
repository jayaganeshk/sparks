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
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { apiService } from "@/services/api";

const router = useRouter();
const persons = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(null);
const lastEvaluatedKey = ref(null);
const editDialog = ref(false);
const editedPerson = ref(null);
const editedName = ref("");
const saving = ref(false);

// const imageUrl = computed((s3Key) => {
//   return `${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${s3Key}`;
// });

const imageUrl = (s3Key) => {
  return `${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${s3Key}`;
};

const fetchPersons = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await apiService.get("/persons");
    // Ensure we have a valid response with items array
    if (response && response && Array.isArray(response.items)) {
      persons.value = response.items;
      lastEvaluatedKey.value = response.lastEvaluatedKey || null;
    } else {
      // If response doesn't have expected structure, set empty array
      console.warn("Unexpected API response format:", response);
      persons.value = [];
      lastEvaluatedKey.value = null;
    }
  } catch (err) {
    console.error("Error fetching persons:", err);
    error.value = "Failed to load people. Please try again later.";
    persons.value = []; // Ensure persons is always an array
  } finally {
    loading.value = false;
  }
};

const loadMorePersons = async () => {
  if (!lastEvaluatedKey.value || loadingMore.value) return;

  loadingMore.value = true;
  try {
    const response = await apiService.get(
      `/persons?lastEvaluatedKey=${lastEvaluatedKey.value}`
    );
    persons.value.push(...response.items);
    lastEvaluatedKey.value = response.lastEvaluatedKey;
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

  console.log("editedPerson", editedPerson);

  saving.value = true;
  try {
    const updatedPerson = await apiService.put(
      `/persons/${editedPerson.value.SK}`,
      { name: editedName.value }
    );

    const index = persons.value.findIndex(
      (p) => p.PK === editedPerson.value.PK
    );
    if (index !== -1) {
      persons.value[index] = updatedPerson;
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
  fetchPersons();
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
