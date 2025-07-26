<template>
  <v-card class="mx-auto my-2" :elevation="2">
    <v-img
      :src="photo.imageUrl || `https://${photo.cloudFrontDomain}/${photo.s3Key}`"
      :aspect-ratio="1"
      cover
      @click="openPhotoDetail"
    >
      <template v-slot:placeholder>
        <v-row class="fill-height ma-0" align="center" justify="center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </v-row>
      </template>
    </v-img>

    <v-card-title class="text-subtitle-1 pb-0">
      {{ formatDate(photo.upload_datetime) }}
    </v-card-title>

    <v-card-subtitle class="pt-1">
      Uploaded by {{ photo.uploadedBy }}
    </v-card-subtitle>

    <v-card-actions>
      <v-spacer></v-spacer>
      
      <v-tooltip text="View Details">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-information-outline"
            variant="text"
            size="small"
            @click="openPhotoDetail"
          ></v-btn>
        </template>
      </v-tooltip>
      
      <v-tooltip text="Share">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-share-variant-outline"
            variant="text"
            size="small"
            @click="sharePhoto"
          ></v-btn>
        </template>
      </v-tooltip>
      
      <v-tooltip text="Download">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-download-outline"
            variant="text"
            size="small"
            @click="downloadPhoto"
          ></v-btn>
        </template>
      </v-tooltip>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
  photo: {
    type: Object,
    required: true
  }
});

const router = useRouter();

// Format date from timestamp
const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown date';
  
  const date = new Date(Number(timestamp));
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Navigate to photo detail view
const openPhotoDetail = () => {
  router.push({ 
    name: 'PhotoDetail',
    params: { id: props.photo.PK }
  });
};

// Share photo functionality
const sharePhoto = async () => {
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Check out this photo!',
        text: `Photo uploaded by ${props.photo.uploadedBy}`,
        url: window.location.href
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      console.log('Web Share API not supported');
      // Here you could implement a custom share dialog
    }
  } catch (error) {
    console.error('Error sharing:', error);
  }
};

// Download photo functionality
const downloadPhoto = async () => {
  try {
    const imageUrl = props.photo.imageUrl || `https://${props.photo.cloudFrontDomain}/${props.photo.s3Key}`;
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `photo-${props.photo.PK}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading photo:', error);
  }
};
</script>
