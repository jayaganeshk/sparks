<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">People</h1>
      </v-col>
    </v-row>

    <!-- Loading indicator -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
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
      <v-col cols="12">
        <v-alert type="info" title="No people detected" text="No people have been detected in your photos yet."></v-alert>
      </v-col>
    </v-row>

    <!-- Persons grid -->
    <v-row v-else>
      <v-col
        v-for="person in persons"
        :key="person.personId"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card @click="viewPerson(person.personId)" class="mx-auto my-2" :elevation="2">
          <v-img
            :src="person.thumbnailUrl"
            :aspect-ratio="1"
            cover
          >
            <template v-slot:placeholder>
              <v-row class="fill-height ma-0" align="center" justify="center">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
              </v-row>
            </template>
          </v-img>

          <v-card-title class="text-subtitle-1 pb-0">
            {{ person.name || 'Unknown Person' }}
          </v-card-title>

          <v-card-subtitle class="pt-1">
            {{ person.faceCount }} photo{{ person.faceCount !== 1 ? 's' : '' }}
          </v-card-subtitle>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              icon="mdi-image-multiple"
              variant="text"
              size="small"
              @click.stop="viewPerson(person.personId)"
            >
              <v-tooltip activator="parent" location="bottom">
                View Photos
              </v-tooltip>
            </v-btn>
            <v-btn
              icon="mdi-pencil"
              variant="text"
              size="small"
              @click.stop="editPersonName(person)"
            >
              <v-tooltip activator="parent" location="bottom">
                Edit Name
              </v-tooltip>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <!-- Edit Person Name Dialog -->
  <v-dialog v-model="editDialog" max-width="500px">
    <v-card>
      <v-card-title>Edit Person Name</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="saveName">
          <v-text-field
            v-model="editedName"
            label="Name"
            :rules="[v => !!v || 'Name is required']"
            required
            autofocus
          ></v-text-field>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="editDialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="saveName" :loading="saving">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { personsService } from '@/services';

const router = useRouter();

// State
const persons = ref([]);
const loading = ref(true);
const error = ref(null);
const editDialog = ref(false);
const editedPerson = ref(null);
const editedName = ref('');
const saving = ref(false);

// Load persons from API
const loadPersons = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const data = await personsService.getAllPersons();
    persons.value = data.items;
  } catch (err) {
    console.error('Error loading persons:', err);
    error.value = 'Failed to load people. Please try again later.';
  } finally {
    loading.value = false;
  }
};

// View person photos
const viewPerson = (personId) => {
  router.push({ name: 'persons-id', params: { id: personId } });
};

// Edit person name
const editPersonName = (person) => {
  editedPerson.value = person;
  editedName.value = person.name || '';
  editDialog.value = true;
};

// Save person name
const saveName = async () => {
  if (!editedPerson.value) return;
  
  saving.value = true;
  
  try {
    await personsService.updatePersonName(editedPerson.value.personId, editedName.value);
    
    // Update local state
    const index = persons.value.findIndex(p => p.personId === editedPerson.value.personId);
    if (index !== -1) {
      persons.value[index].name = editedName.value;
    }
    
    // Close dialog
    editDialog.value = false;
    editedPerson.value = null;
    editedName.value = '';
  } catch (err) {
    console.error('Error updating person name:', err);
    alert('Failed to update name. Please try again later.');
  } finally {
    saving.value = false;
  }
};

// Load data on component mount
onMounted(() => {
  loadPersons();
});
</script>
