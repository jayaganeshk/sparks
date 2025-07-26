<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Folders</h1>
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
        <v-alert type="error" title="Error loading users" :text="error"></v-alert>
      </v-col>
    </v-row>

    <!-- No users message -->
    <v-row v-else-if="users.length === 0">
      <v-col cols="12" class="text-center text-grey mt-8">
        <p>No users have uploaded photos yet.</p>
      </v-col>
    </v-row>

    <!-- Users grid -->
    <v-row v-else>
      <v-col v-for="user in users" :key="user.PK" cols="12" sm="6" md="4" lg="3">
        <v-card @click="viewUserPhotos(user.email)" hover>
          <v-card-title class="text-subtitle-1 d-flex align-center">
            <v-icon start icon="mdi-folder-account"></v-icon>
            <span>{{ user.displayName || user.email }}</span>
          </v-card-title>
          <v-card-subtitle>{{ user.email }}</v-card-subtitle>
        </v-card>
      </v-col>
    </v-row>

    <!-- Infinite scroll loader -->
    <v-row v-if="loadingMore" class="mt-8">
      <v-col class="text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiService } from '@/services/api';

const router = useRouter();
const users = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(null);
const lastEvaluatedKey = ref(null);

const fetchUsers = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await apiService.get('/users');
    users.value = response.data.items;
    lastEvaluatedKey.value = response.data.lastEvaluatedKey;
  } catch (err) {
    console.error('Error fetching users:', err);
    error.value = 'Failed to load users. Please try again later.';
  } finally {
    loading.value = false;
  }
};

const loadMoreUsers = async () => {
  if (!lastEvaluatedKey.value || loadingMore.value) return;

  loadingMore.value = true;
  try {
    const response = await apiService.get(`/users?lastEvaluatedKey=${lastEvaluatedKey.value}`);
    users.value.push(...response.data.items);
    lastEvaluatedKey.value = response.data.lastEvaluatedKey;
  } catch (err) {
    console.error('Error fetching more users:', err);
  } finally {
    loadingMore.value = false;
  }
};

const viewUserPhotos = (email) => {
  router.push({ name: 'UserFolder', params: { email } });
};

const handleScroll = () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
  if (nearBottom && lastEvaluatedKey.value && !loadingMore.value) {
    loadMoreUsers();
  }
};

onMounted(() => {
  fetchUsers();
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>
