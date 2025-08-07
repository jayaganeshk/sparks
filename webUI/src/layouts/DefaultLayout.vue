<template>
  <v-app>
    <AppBar v-if="!showFullView" />
    <v-main>
      <!-- Main content -->
      <router-view />
    </v-main>
    <ImageUpload />
    <BottomNavigation v-if="!showFullView" />
    <FeedbackDialog position="bottom-end" v-if="!showFullView" />
  </v-app>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '@/store/app';
import AppBar from '@/components/AppBar.vue';
import BottomNavigation from '@/components/BottomNavigation.vue';
import ImageUpload from '@/components/ImageUpload.vue';
import FeedbackDialog from '@/components/FeedbackDialog.vue';

const appStore = useAppStore();
const showFullView = computed(() => appStore.showFullView);

// No longer needed as debug panel removed
</script>
