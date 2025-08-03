<template>
  <v-card class="mx-auto my-2" :elevation="2">
    <v-img
      :src="imageUrl"
      :aspect-ratio="1"
      cover
      @click="openPhotoDetail"
      class="image-hover"
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
</template>

<script setup>
import { useRouter } from "vue-router";
import { ref, computed, onMounted } from "vue";

const props = defineProps({
  photo: {
    type: Object,
    required: true,
  },
});

const router = useRouter();

const imageUrl = computed(() => {
  // Use the signed URL directly from the API response
  // The API now returns s3Key as a signed URL
  return props.photo.s3Key;
});

// Format date from timestamp
const formatDate = (timestamp) => {
  if (!timestamp) return "Unknown date";

  const date = new Date(Number(timestamp));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Navigate to photo detail view
const openPhotoDetail = () => {
  router.push({
    name: "PhotoDetail",
    params: { id: props.photo.PK },
  });
};

// Share photo functionality
const sharePhoto = async () => {
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Check out this photo!",
        text: `Photo uploaded by ${props.photo.uploadedBy}`,
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

// Download photo functionality
const downloadPhoto = async () => {
  try {
    const imageUrl =
      props.photo.imageUrl ||
      `https://${props.photo.cloudFrontDomain}/${props.photo.s3Key}`;
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `photo-${props.photo.PK}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error downloading photo:", error);
  }
};
</script>
