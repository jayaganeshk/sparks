<template>
  <v-card v-if="showDebug" class="cache-debug-panel mb-3" variant="outlined">
    <v-card-title class="d-flex align-center">
      <span>API Cache Status</span>
      <v-spacer></v-spacer>
      <v-btn
        size="small"
        icon="mdi-refresh"
        @click="refreshStats"
        :loading="refreshing"
      ></v-btn>
      <v-btn
        size="small"
        icon="mdi-close"
        @click="showDebug = false"
      ></v-btn>
    </v-card-title>
    <v-card-text>
      <div class="text-subtitle-2">Cache Statistics:</div>
      <ul class="pl-3 mb-2">
        <li>Cached Endpoints: {{ cacheStats.endpointCount }}</li>
        <li>Cache TTL: {{ formatTime(cacheStats.cacheTTL) }}</li>
      </ul>
      
      <div v-if="cachedEndpoints.length > 0">
        <v-expansion-panels variant="accordion">
          <v-expansion-panel title="Cached Endpoints">
            <v-expansion-panel-text>
              <v-list density="compact" class="bg-transparent">
                <v-list-item v-for="endpoint in cachedEndpoints" :key="endpoint" class="px-1">
                  <div class="d-flex w-100">
                    <span class="text-caption text-truncate endpoint-text">{{ endpoint }}</span>
                    <v-spacer></v-spacer>
                    <v-btn
                      size="x-small"
                      icon="mdi-delete"
                      color="error"
                      density="compact"
                      variant="text"
                      @click="clearEndpoint(endpoint)"
                    ></v-btn>
                  </div>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
      
      <v-btn 
        block
        color="primary" 
        class="mt-3" 
        @click="clearAllCache"
        prepend-icon="mdi-delete-sweep"
      >
        Clear All Cache
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script>
import { useApiCacheStore } from '@/store/api-cache';
import { apiCacheService } from '@/services';

export default {
  name: 'CacheDebugPanel',
  
  data() {
    return {
      showDebug: true,
      refreshing: false
    }
  },
  
  computed: {
    cacheStore() {
      return useApiCacheStore();
    },
    
    cacheStats() {
      return this.cacheStore.cacheStats;
    },
    
    cachedEndpoints() {
      return this.cacheStore.cachedEndpoints;
    }
  },
  
  methods: {
    clearEndpoint(endpoint) {
      this.cacheStore.clearCache(endpoint);
      this.refreshStats();
    },
    
    clearAllCache() {
      this.cacheStore.clearAllCache();
      this.refreshStats();
    },
    
    async refreshStats() {
      this.refreshing = true;
      // Brief timeout to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      this.refreshing = false;
    },
    
    formatTime(ms) {
      const seconds = Math.floor(ms / 1000);
      if (seconds < 60) {
        return `${seconds}s`;
      } else {
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ${seconds % 60}s`;
      }
    }
  }
}
</script>

<style scoped>
.cache-debug-panel {
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.endpoint-text {
  max-width: calc(100% - 40px);
  display: inline-block;
}
</style>
