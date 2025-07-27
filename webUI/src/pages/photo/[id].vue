<template>
  <v-container class="photo-detail">
    <v-row>
      <v-col cols="12">
        <v-btn
          prepend-icon="mdi-arrow-left"
          variant="text"
          @click="router.back()"
          class="mb-4"
        >
          Back
        </v-btn>
      </v-col>
    </v-row>

    <!-- Loading indicator -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
      </v-col>
    </v-row>

    <!-- Error message -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert
          type="error"
          title="Error loading photo"
          :text="error"
        ></v-alert>
      </v-col>
    </v-row>

    <!-- Photo details -->
    <template v-else>
      <v-row>
        <v-col cols="12" md="8">
          <v-card>
            <v-img
              :src="
                photo.imageUrl ||
                `https://${photo.cloudFrontDomain}/${photo.s3Key}`
              "
              max-height="70vh"
              contain
              class="bg-grey-lighten-2"
            >
              <template v-slot:placeholder>
                <v-row class="fill-height ma-0" align="center" justify="center">
                  <v-progress-circular
                    indeterminate
                    color="primary"
                  ></v-progress-circular>
                </v-row>
              </template>
            </v-img>

            <v-card-actions>
              <v-spacer></v-spacer>

              <v-tooltip text="Share">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-share-variant"
                    variant="text"
                    @click="sharePhoto"
                  ></v-btn>
                </template>
              </v-tooltip>

              <v-tooltip text="Download">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-download"
                    variant="text"
                    @click="downloadPhoto"
                  ></v-btn>
                </template>
              </v-tooltip>
            </v-card-actions>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>Photo Details</v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon icon="mdi-calendar"></v-icon>
                  </template>
                  <v-list-item-title>Date</v-list-item-title>
                  <v-list-item-subtitle>{{
                    formatDate(photo.upload_datetime)
                  }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon icon="mdi-account"></v-icon>
                  </template>
                  <v-list-item-title>Uploaded By</v-list-item-title>
                  <v-list-item-subtitle>
                    <a @click="viewUserPhotos(photo.uploadedBy)">{{
                      photo.uploadedBy
                    }}</a>
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="photo.description">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-text"></v-icon>
                  </template>
                  <v-list-item-title>Description</v-list-item-title>
                  <v-list-item-subtitle>{{
                    photo.description
                  }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <!-- People detected in the photo -->
          <v-card class="mt-4">
            <v-card-title class="d-flex align-center">
              People in this photo
              <v-spacer></v-spacer>
              <v-btn
                v-if="!loadingPersons"
                icon="mdi-refresh"
                size="small"
                @click="loadPersons"
                variant="text"
              ></v-btn>
            </v-card-title>
            <v-card-text>
              <!-- Loading state -->
              <div v-if="loadingPersons" class="text-center py-4">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="32"
                ></v-progress-circular>
                <div class="mt-2">Loading people in this photo...</div>
              </div>

              <!-- No persons found -->
              <div v-else-if="!persons.length" class="text-center py-4">
                <v-icon
                  icon="mdi-account-off"
                  size="large"
                  color="grey"
                ></v-icon>
                <div class="mt-2">No people detected in this photo</div>
              </div>

              <!-- Persons list -->
              <v-chip-group v-else>
                <v-chip
                  v-for="person in persons"
                  :key="person.personId"
                  @click="viewPersonPhotos(person.personId)"
                  class="ma-1"
                >
                  <v-avatar start>
                    <v-img :src="person.imageUrl" alt="Person"></v-img>
                  </v-avatar>
                  {{ person.name || "Unknown Person" }}
                </v-chip>
              </v-chip-group>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Related photos -->
      <v-row v-if="relatedPhotos.length > 0" class="mt-4">
        <v-col cols="12">
          <h2 class="text-h5 mb-4">Related Photos</h2>
        </v-col>

        <v-col
          v-for="relatedPhoto in relatedPhotos"
          :key="relatedPhoto.PK"
          cols="6"
          sm="4"
          md="3"
          lg="2"
        >
          <v-card
            @click="viewPhoto(relatedPhoto.PK)"
            class="mx-auto"
            :elevation="2"
          >
            <v-img
              :src="
                relatedPhoto.imageUrl ||
                `https://${relatedPhoto.cloudFrontDomain}/${relatedPhoto.s3Key}`
              "
              :aspect-ratio="1"
              cover
            >
              <template v-slot:placeholder>
                <v-row class="fill-height ma-0" align="center" justify="center">
                  <v-progress-circular
                    indeterminate
                    color="primary"
                  ></v-progress-circular>
                </v-row>
              </template>
            </v-img>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { photosService } from "@/services";

const router = useRouter();
const route = useRoute();
const photoId = computed(() => route.params.id);

// State
const photo = ref({});
const relatedPhotos = ref([]);
const persons = ref([]);
const loading = ref(true);
const loadingPersons = ref(false);
const error = ref(null);

// Format date from timestamp
const formatDate = (timestamp) => {
  if (!timestamp) return "Unknown date";

  const date = new Date(Number(timestamp));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Load photo details
const loadPhotoDetails = async () => {
  loading.value = true;
  error.value = null;

  try {
    const [photoData, relatedData] = await Promise.all([
      photosService.getPhotoById(photoId.value),
      photosService.getRelatedPhotos(photoId.value),
    ]);
    photo.value = photoData;
    relatedPhotos.value = relatedData.items;

    // Load persons after getting photo details
    loadPersons();
  } catch (err) {
    console.error("Error loading photo details:", err);
    error.value = "Failed to load photo details. Please try again later.";
  } finally {
    loading.value = false;
  }
};

// Load persons detected in the photo
const loadPersons = async () => {
  loadingPersons.value = true;

  try {
    const response = await photosService.getPersonsInPhoto(photoId.value);
    persons.value = response.items || [];
  } catch (err) {
    console.error("Error loading persons in photo:", err);
    // We don't set the main error state for this, just log it
  } finally {
    loadingPersons.value = false;
  }
};

// Share photo
const sharePhoto = async () => {
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Check out this photo!",
        text: `Photo uploaded by ${photo.value.uploadedBy}`,
        url: window.location.href,
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      console.log("Web Share API not supported");
      // Here you could implement a custom share dialog
    }
  } catch (error) {
    console.error("Error sharing:", error);
  }
};

// Download photo
const downloadPhoto = async () => {
  try {
    const imageUrl =
      photo.value.imageUrl ||
      `https://${photo.value.cloudFrontDomain}/${photo.value.s3Key}`;
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `photo-${photo.value.PK}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error downloading photo:", error);
  }
};

// View user photos
const viewUserPhotos = (email, name) => {
  router.push({ name: "UserFolder", params: { email, name } });
};

// View person photos
const viewPersonPhotos = (personId) => {
  router.push({ name: "PersonFolder", params: { id: personId } });
};

// View another photo
const viewPhoto = (id) => {
  router.push({ name: "photo-id", params: { id } });
};

// Load data on component mount
onMounted(() => {
  loadPhotoDetails();
});

// Watch for route changes to reload data
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadPhotoDetails();
    }
  }
);
</script>

<style scoped>
.photo-detail a {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.photo-detail a:hover {
  text-decoration: underline;
}
</style>
