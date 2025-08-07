<template>
  <div>
    <!-- Loading state with skeleton loader when no data is available yet -->
    <v-skeleton-loader
      v-if="isLoading && !data"
      type="card, list-item-three-line@3"
    ></v-skeleton-loader>
    
    <!-- Data display when available -->
    <v-card v-else-if="data" variant="outlined" class="mb-4">
      <v-card-title class="d-flex align-center">
        <span>Photos</span>
        <v-spacer></v-spacer>
        
        <!-- Refresh indicator -->
        <v-progress-circular
          v-if="isRefreshing"
          indeterminate
          size="20"
          width="2"
          color="primary"
          class="mr-2"
        ></v-progress-circular>
        
        <!-- Manual refresh button -->
        <v-btn
          icon="mdi-refresh"
          variant="text"
          size="small"
          @click="refresh"
          :disabled="isRefreshing"
        ></v-btn>
      </v-card-title>
      
      <v-card-subtitle v-if="lastLoaded">
        Last updated: {{ formatDate(lastLoaded) }}
      </v-card-subtitle>
      
      <v-card-text>
        <v-list lines="two" class="bg-transparent">
          <v-list-item v-for="photo in data?.items || []" :key="photo.id">
            <v-list-item-title>{{ photo.title || 'Untitled Photo' }}</v-list-item-title>
            <v-list-item-subtitle>{{ photo.description || 'No description' }}</v-list-item-subtitle>
          </v-list-item>
          
          <v-list-item v-if="!data?.items?.length">
            <v-list-item-title>No photos found</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
    
    <!-- Error display -->
    <v-alert v-if="error" type="error" variant="tonal" class="my-3">
      Error loading data: {{ error.message }}
      <template v-slot:append>
        <v-btn variant="text" @click="refresh">Retry</v-btn>
      </template>
    </v-alert>
  </div>
</template>

<script>
import { useApiCache } from '@/utils/useApiCache';
import { photosService } from '@/services';
import { onMounted } from 'vue';

export default {
  name: 'ExampleCachedComponent',
  
  props: {
    limit: {
      type: Number,
      default: 10
    }
  },
  
  setup(props) {
    // Use our API cache composition function with the photos service
    const { 
      data, 
      isLoading,
      isRefreshing, 
      error,
      lastLoaded,
      refresh 
    } = useApiCache(
      // The API function to call (will use cache when available)
      () => photosService.getAllPhotos(null, props.limit),
      // Dependencies to watch for changes (will trigger a reload)
      [() => props.limit],
      // Options
      { 
        autoLoad: true, // Load data immediately
        forceRefresh: false // Don't force refresh on first load
      }
    );

    // When component mounts, refresh data in the background
    // This ensures we show cached data immediately if available,
    // but also fetch fresh data
    onMounted(() => {
      if (data.value) {
        // If we have cached data, refresh in background
        setTimeout(() => refresh(), 100);
      }
    });
    
    // Helper function to format dates nicely
    const formatDate = (date) => {
      if (!date) return '';
      return new Date(date).toLocaleString();
    };
    
    return {
      data,
      isLoading,
      isRefreshing,
      error,
      lastLoaded,
      refresh,
      formatDate
    };
  }
};
</script>
