<template>
  <v-app-bar elevation="0">
    <!-- Left spacer to balance the layout -->
    <v-spacer></v-spacer>
    
    <!-- Centered logo -->
    <v-img class="ma-1" max-width="100" src="@/assets/logo.png" />
    
    <!-- Right spacer and feedback button -->
    <v-spacer></v-spacer>
    <feedback-dialog button-variant="icon" icon="mdi-comment-question-outline" />
  </v-app-bar>
</template>

<script>
import FeedbackDialog from './FeedbackDialog.vue';

export default {
  name: "AppBar",
  components: {
    FeedbackDialog
  }
};
</script>
