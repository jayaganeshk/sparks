<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">People</h1>
      </v-col>
    </v-row>

    <!-- Loading indicator -->
    <v-row v-if="loading">
      <v-col v-for="n in 8" :key="n" cols="12" sm="6" md="4" lg="3">
        <v-skeleton-loader type="card"></v-skeleton-loader>
      </v-col>
    </v-row>

    <!-- Error message -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert type="error" title="Error loading people" :text="error"></v-alert>
      </v-col>
    </v-row>

    <!-- No persons message -->
    <v-row v-else-if="persons.length === 0">
      <v-col cols="12" class="text-center text-grey mt-8">
        <p>No people have been detected in your photos yet.</p>
      </v-col>
    </v-row>

    <!-- Persons grid -->
    <v-row v-else>
      <v-col v-for="person in persons" :key="person.PK" cols="12" sm="6" md="4" lg="3">
        <v-card @click="viewPerson(person.personId)" hover>
          <v-img :src="person.thumbnailUrl" :aspect-ratio="1" cover class="grey lighten-2">
            <template v-slot:placeholder>
              <v-row class="fill-height ma-0" align="center" justify="center">
                <v-progress-circular indeterminate color="grey-lighten-5"></v-progress-circular>
              </v-row>
            </template>
          </v-img>
          <v-card-title class="text-subtitle-1 pb-0">{{ person.name || 'Unknown' }}</v-card-title>
          <v-card-subtitle class="pt-1">{{ person.faceCount }} photo{{ person.faceCount !== 1 ? 's' : '' }}</v-card-subtitle>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-pencil" variant="text" size="small" @click.stop="editPersonName(person)"></v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Infinite scroll loader -->
    <v-row v-if="loadingMore" class="mt-8">
      <v-col class="text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </v-col>
    </v-row>

    <!-- Edit Person Name Dialog -->
    <v-dialog v-model="editDialog" max-width="500px">
      <v-card>
        <v-card-title>Edit Person Name</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveName">
            <v-text-field v-model="editedName" label="Name" required autofocus></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="editDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveName" :loading="saving">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiService } from '@/services/api';

const router = useRouter();
const persons = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(null);
const lastEvaluatedKey = ref(null);
const editDialog = ref(false);
const editedPerson = ref(null);
const editedName = ref('');
const saving = ref(false);

const fetchPersons = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await apiService.get('/persons');
    persons.value = response.data.items;
    lastEvaluatedKey.value = response.data.lastEvaluatedKey;
  } catch (err) {
    console.error('Error fetching persons:', err);
    error.value = 'Failed to load people. Please try again later.';
  } finally {
    loading.value = false;
  }
};

const loadMorePersons = async () => {
  if (!lastEvaluatedKey.value || loadingMore.value) return;

  loadingMore.value = true;
  try {
    const response = await apiService.get(`/persons?lastEvaluatedKey=${lastEvaluatedKey.value}`);
    persons.value.push(...response.data.items);
    lastEvaluatedKey.value = response.data.lastEvaluatedKey;
  } catch (err) {
    console.error('Error fetching more persons:', err);
  } finally {
    loadingMore.value = false;
  }
};

const viewPerson = (personId) => {
  router.push({ name: 'PersonFolder', params: { id: personId } });
};

const editPersonName = (person) => {
  editedPerson.value = person;
  editedName.value = person.name || '';
  editDialog.value = true;
};

const saveName = async () => {
  if (!editedPerson.value || !editedName.value) return;

  saving.value = true;
  try {
    const updatedPerson = await apiService.put(`/persons/${editedPerson.value.personId}`, { name: editedName.value });
    
    const index = persons.value.findIndex(p => p.PK === editedPerson.value.PK);
    if (index !== -1) {
      persons.value[index] = updatedPerson.data;
    }
    editDialog.value = false;
  } catch (err) {
    console.error('Error updating person name:', err);
    // Optionally, show an error message to the user
  } finally {
    saving.value = false;
  }
};

const handleScroll = () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
  if (nearBottom && lastEvaluatedKey.value && !loadingMore.value) {
    loadMorePersons();
  }
};

onMounted(() => {
  fetchPersons();
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>
