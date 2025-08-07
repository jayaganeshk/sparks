<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h2 class="text-h4 mb-4">Feedback Management</h2>
        <v-card>
          <v-card-text>
            <v-data-table
              v-model:items-per-page="itemsPerPage"
              :headers="headers"
              :items="feedbackItems"
              :loading="loading"
              density="comfortable"
              class="elevation-1"
            >
              <template v-slot:item.type="{ item }">
                <v-chip
                  :color="getTypeColor(item.type)"
                  size="small"
                  label
                  class="text-white"
                >
                  {{ item.type }}
                </v-chip>
              </template>

              <template v-slot:item.message="{ item }">
                <div class="text-truncate" style="max-width: 300px;">
                  {{ item.message }}
                </div>
              </template>

              <template v-slot:item.createdAt="{ item }">
                {{ formatDate(item.createdAt) }}
              </template>

              <template v-slot:item.rating="{ item }">
                <v-rating
                  v-if="item.rating"
                  :model-value="item.rating"
                  color="amber"
                  density="compact"
                  size="small"
                  readonly
                  half-increments
                ></v-rating>
                <span v-else>N/A</span>
              </template>

              <template v-slot:item.status="{ item }">
                <v-chip
                  :color="getStatusColor(item.status)"
                  size="small"
                  label
                >
                  {{ item.status }}
                </v-chip>
              </template>

              <template v-slot:item.actions="{ item }">
                <v-btn
                  icon="mdi-eye"
                  variant="text"
                  size="small"
                  @click="openFeedbackDetails(item)"
                  color="primary"
                  title="View Details"
                ></v-btn>
              </template>

              <template v-slot:bottom>
                <div class="d-flex align-center justify-space-between pa-2">
                  <span v-if="feedbackItems.length > 0">
                    Showing {{ feedbackItems.length }} item(s)
                  </span>
                  <span v-else>
                    No feedback found
                  </span>
                  <div>
                    <v-btn
                      v-if="lastEvaluatedKey"
                      prepend-icon="mdi-refresh"
                      variant="text"
                      :disabled="loading"
                      @click="loadMore"
                    >
                      Load More
                    </v-btn>
                  </div>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Feedback Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="700">
      <v-card v-if="selectedFeedback">
        <v-card-title class="text-h5 pa-4">
          Feedback Details
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showDetailsDialog = false" size="small"></v-btn>
        </v-card-title>
        
        <v-divider></v-divider>
        
        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12" sm="6">
              <strong>Type:</strong>
              <v-chip
                :color="getTypeColor(selectedFeedback.type)"
                size="small"
                label
                class="text-white ml-2"
              >
                {{ selectedFeedback.type }}
              </v-chip>
            </v-col>
            
            <v-col cols="12" sm="6">
              <strong>Status:</strong>
              <v-select
                v-model="selectedFeedback.status"
                :items="['NEW', 'IN_REVIEW', 'RESOLVED']"
                variant="outlined"
                density="compact"
                hide-details
                class="status-select d-inline-block ml-2"
                style="max-width: 150px;"
              ></v-select>
            </v-col>
            
            <v-col cols="12" sm="6">
              <strong>Date:</strong> {{ formatDate(selectedFeedback.createdAt) }}
            </v-col>
            
            <v-col cols="12" sm="6">
              <strong>User:</strong> {{ selectedFeedback.userId || 'Anonymous' }}
            </v-col>
            
            <v-col cols="12" sm="6" v-if="selectedFeedback.email">
              <strong>Email:</strong> {{ selectedFeedback.email }}
            </v-col>
            
            <v-col cols="12" sm="6" v-if="selectedFeedback.rating">
              <strong>Rating:</strong>
              <v-rating
                :model-value="selectedFeedback.rating"
                color="amber"
                density="compact"
                size="small"
                readonly
                half-increments
                class="d-inline-flex ml-2"
              ></v-rating>
            </v-col>
            
            <v-col cols="12">
              <v-card variant="outlined" class="mt-2 pa-3">
                <h3 class="text-subtitle-1 font-weight-bold mb-2">Feedback Message:</h3>
                <p class="text-body-1">{{ selectedFeedback.message }}</p>
              </v-card>
            </v-col>

            <v-col cols="12" v-if="selectedFeedback.metadata">
              <v-expansion-panels variant="accordion">
                <v-expansion-panel>
                  <v-expansion-panel-title>Technical Details</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list density="compact">
                      <v-list-item v-if="selectedFeedback.metadata.browser">
                        <template v-slot:prepend>
                          <v-icon icon="mdi-web"></v-icon>
                        </template>
                        <v-list-item-title>Browser: {{ selectedFeedback.metadata.browser }}</v-list-item-title>
                      </v-list-item>
                      
                      <v-list-item v-if="selectedFeedback.metadata.os">
                        <template v-slot:prepend>
                          <v-icon icon="mdi-laptop"></v-icon>
                        </template>
                        <v-list-item-title>OS: {{ selectedFeedback.metadata.os }}</v-list-item-title>
                      </v-list-item>
                      
                      <v-list-item v-if="selectedFeedback.metadata.viewport">
                        <template v-slot:prepend>
                          <v-icon icon="mdi-monitor"></v-icon>
                        </template>
                        <v-list-item-title>
                          Viewport: {{ selectedFeedback.metadata.viewport.width }}x{{ selectedFeedback.metadata.viewport.height }}
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn 
            color="primary" 
            variant="text"
            @click="showDetailsDialog = false"
          >
            Close
          </v-btn>
          <v-btn 
            color="primary" 
            variant="elevated"
            @click="updateFeedbackStatus"
            :loading="updating"
          >
            Update Status
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import feedbackService from '../services/feedback';

// Table configuration
const headers = [
  { title: 'Type', align: 'start', key: 'type' },
  { title: 'Message', align: 'start', key: 'message' },
  { title: 'Date', align: 'start', key: 'createdAt' },
  { title: 'Rating', align: 'center', key: 'rating' },
  { title: 'Status', align: 'center', key: 'status' },
  { title: 'Actions', align: 'center', key: 'actions', sortable: false }
];

// Data
const feedbackItems = ref([]);
const loading = ref(false);
const lastEvaluatedKey = ref(null);
const itemsPerPage = ref(10);
const showDetailsDialog = ref(false);
const selectedFeedback = ref(null);
const updating = ref(false);

// Load feedback items
const loadFeedback = async () => {
  try {
    loading.value = true;
    const response = await feedbackService.getAllFeedback();
    feedbackItems.value = response.items || [];
    lastEvaluatedKey.value = response.lastEvaluatedKey || null;
  } catch (error) {
    console.error('Error loading feedback:', error);
  } finally {
    loading.value = false;
  }
};

// Load more feedback items
const loadMore = async () => {
  if (!lastEvaluatedKey.value || loading.value) return;
  
  try {
    loading.value = true;
    const response = await feedbackService.getAllFeedback(lastEvaluatedKey.value);
    feedbackItems.value = [...feedbackItems.value, ...(response.items || [])];
    lastEvaluatedKey.value = response.lastEvaluatedKey || null;
  } catch (error) {
    console.error('Error loading more feedback:', error);
  } finally {
    loading.value = false;
  }
};

// Format date
const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  const date = new Date(Number(timestamp));
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get color for feedback type
const getTypeColor = (type) => {
  const colors = {
    'BUG': 'error',
    'FEATURE': 'primary',
    'GENERAL': 'info'
  };
  
  return colors[type] || 'grey';
};

// Get color for status
const getStatusColor = (status) => {
  const colors = {
    'NEW': 'grey',
    'IN_REVIEW': 'info',
    'RESOLVED': 'success'
  };
  
  return colors[status] || 'grey';
};

// Open feedback details dialog
const openFeedbackDetails = (item) => {
  selectedFeedback.value = { ...item };
  showDetailsDialog.value = true;
};

// Update feedback status
const updateFeedbackStatus = async () => {
  if (!selectedFeedback.value) return;
  
  try {
    updating.value = true;
    // For now, this is just a placeholder as we haven't implemented the update API yet
    // In a real implementation, we would call an API to update the status
    console.log('Updating feedback status:', selectedFeedback.value.PK, selectedFeedback.value.status);
    
    // Update the status in our local state
    const index = feedbackItems.value.findIndex(item => item.PK === selectedFeedback.value.PK);
    if (index !== -1) {
      feedbackItems.value[index].status = selectedFeedback.value.status;
    }
    
    // Close the dialog
    showDetailsDialog.value = false;
  } catch (error) {
    console.error('Error updating feedback status:', error);
  } finally {
    updating.value = false;
  }
};

// Load feedback on component mount
onMounted(() => {
  loadFeedback();
});
</script>

<style scoped>
.status-select :deep(.v-field__input) {
  min-height: 32px;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
