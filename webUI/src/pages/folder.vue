<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Uploaded By</h1>
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
        <v-alert type="error" title="Error loading users" :text="error"></v-alert>
      </v-col>
    </v-row>

    <!-- No users message -->
    <v-row v-else-if="users.length === 0">
      <v-col cols="12">
        <v-alert type="info" title="No users" text="No users have uploaded photos yet."></v-alert>
      </v-col>
    </v-row>

    <!-- Users grid -->
    <v-row v-else>
      <v-col
        v-for="user in users"
        :key="user.email"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card @click="viewUserPhotos(user.email)" class="mx-auto my-2" :elevation="2">
          <v-card-title class="text-subtitle-1">
            {{ user.displayName || user.email }}
          </v-card-title>

          <v-card-subtitle>
            {{ user.photoCount }} photo{{ user.photoCount !== 1 ? 's' : '' }}
          </v-card-subtitle>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              icon="mdi-image-multiple"
              variant="text"
              size="small"
              @click.stop="viewUserPhotos(user.email)"
            >
              <v-tooltip activator="parent" location="bottom">
                View Photos
              </v-tooltip>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usersService } from '@/services';

const router = useRouter();

// State
const users = ref([]);
const loading = ref(true);
const error = ref(null);

// Load users from API
const loadUsers = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const data = await usersService.getAllUsers();
    users.value = data.items;
  } catch (err) {
    console.error('Error loading users:', err);
    error.value = 'Failed to load users. Please try again later.';
  } finally {
    loading.value = false;
  }
};

// View user photos
const viewUserPhotos = (email) => {
  router.push({ name: 'folder-email', params: { email } });
};

// Load data on component mount
onMounted(() => {
  loadUsers();
});
</script>
