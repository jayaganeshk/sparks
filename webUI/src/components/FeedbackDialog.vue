<template>
  <v-dialog v-model="isOpen" max-width="600px">
    <template v-slot:activator="{ props }">
      <!-- Icon button variant -->
      <v-btn
        v-if="buttonVariant === 'icon'"
        v-bind="props"
        :icon="icon || 'mdi-comment-quote-outline'"
        color="primary"
        size="small"
      ></v-btn>

      <!-- Regular button variant -->
      <v-btn
        v-else
        v-bind="props"
        variant="outlined"
        color="primary"
        :prepend-icon="icon || 'mdi-comment-quote-outline'"
        size="small"
        :class="['feedback-button', position]"
      >
        Feedback
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="text-h5 pa-4 d-flex">
        <span v-if="!submitted">Share Your Feedback</span>
        <span v-else>Thank You!</span>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="closeDialog"
          size="small"
        ></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pt-4">
        <div v-if="!submitted">
          <p class="mb-4">
            We'd love to hear your thoughts on how we can improve the Sparks
            app. Please share your feedback below.
          </p>

          <v-form ref="form" v-model="valid" @submit.prevent="submitFeedback">
            <v-select
              v-model="feedbackType"
              :items="feedbackTypes"
              label="Feedback Type"
              required
              :rules="[(v) => !!v || 'Type is required']"
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-select>

            <v-textarea
              v-model="message"
              label="Your Feedback"
              required
              :rules="[(v) => !!v || 'Feedback message is required']"
              variant="outlined"
              density="comfortable"
              rows="4"
              class="mb-3"
              counter="500"
              maxlength="500"
              auto-grow
            ></v-textarea>

            <v-text-field
              v-model="email"
              label="Email (optional)"
              hint="We'll only use this to follow up on your feedback"
              :rules="emailRules"
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-text-field>

            <p class="text-body-1 mb-2">How would you rate your experience?</p>
            <v-rating
              v-model="rating"
              color="amber"
              active-color="amber-darken-3"
              half-increments
              hover
              size="large"
              class="mb-4"
            ></v-rating>

            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              class="mb-4"
              closable
              @click:close="errorMessage = ''"
            >
              {{ errorMessage }}
            </v-alert>
          </v-form>
        </div>
        <div v-else class="text-center py-4">
          <v-icon
            icon="mdi-check-circle"
            color="success"
            size="64"
            class="mb-4"
          ></v-icon>
          <h3 class="text-h5 mb-2">Feedback Submitted!</h3>
          <p class="mb-4">
            Thank you for taking the time to share your feedback. We appreciate
            your input!
          </p>
        </div>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-spacer></v-spacer>
        <v-btn
          v-if="!submitted"
          color="primary"
          :loading="loading"
          :disabled="loading || !valid"
          @click="submitFeedback"
          variant="elevated"
        >
          Submit Feedback
        </v-btn>
        <v-btn v-else color="primary" @click="closeDialog" variant="elevated">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import feedbackService from "../services/feedback";

const props = defineProps({
  position: {
    type: String,
    default: "bottom-end",
    validator: (val) =>
      ["top-start", "top-end", "bottom-start", "bottom-end"].includes(val),
  },
  buttonVariant: {
    type: String,
    default: "regular",
    validator: (val) => ["regular", "icon"].includes(val),
  },
  icon: {
    type: String,
    default: null,
  },
});

// Form state
const isOpen = ref(false);
const valid = ref(false);
const feedbackType = ref("GENERAL");
const message = ref("");
const email = ref("");
const rating = ref(0);
const loading = ref(false);
const submitted = ref(false);
const errorMessage = ref("");
const form = ref(null);

// Form options
const feedbackTypes = [
  { title: "General Feedback", value: "GENERAL" },
  { title: "Feature Request", value: "FEATURE" },
  { title: "Bug Report", value: "BUG" },
];

// Validation rules
const emailRules = [
  (v) =>
    !v ||
    /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v) ||
    "Email address must be valid",
];

// Get device and browser info for metadata
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  let browserName = "Unknown";
  let browserVersion = "";
  let osName = "Unknown";

  // Detect browser
  if (userAgent.indexOf("Firefox") > -1) {
    browserName = "Mozilla Firefox";
  } else if (userAgent.indexOf("SamsungBrowser") > -1) {
    browserName = "Samsung Browser";
  } else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) {
    browserName = "Opera";
  } else if (userAgent.indexOf("Trident") > -1) {
    browserName = "Internet Explorer";
  } else if (userAgent.indexOf("Edge") > -1) {
    browserName = "Microsoft Edge";
  } else if (userAgent.indexOf("Chrome") > -1) {
    browserName = "Google Chrome";
  } else if (userAgent.indexOf("Safari") > -1) {
    browserName = "Safari";
  }

  // Detect OS
  if (userAgent.indexOf("Win") > -1) {
    osName = "Windows";
  } else if (userAgent.indexOf("Mac") > -1) {
    osName = "MacOS";
  } else if (userAgent.indexOf("Linux") > -1) {
    osName = "Linux";
  } else if (userAgent.indexOf("Android") > -1) {
    osName = "Android";
  } else if (
    userAgent.indexOf("iOS") > -1 ||
    userAgent.indexOf("iPhone") > -1 ||
    userAgent.indexOf("iPad") > -1
  ) {
    osName = "iOS";
  }

  return {
    browser: browserName,
    os: osName,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    userAgent,
  };
};

// Submit the feedback
const submitFeedback = async () => {
  try {
    // Validate form
    const isValid = await form.value.validate();
    if (!isValid.valid) {
      return;
    }

    loading.value = true;
    errorMessage.value = "";

    // Prepare feedback data
    const feedbackData = {
      type: feedbackType.value,
      message: message.value,
      metadata: getBrowserInfo(),
    };

    // Add optional fields if provided
    if (email.value) {
      feedbackData.email = email.value;
    }

    if (rating.value > 0) {
      feedbackData.rating = rating.value;
    }

    // Submit to API
    await feedbackService.submitFeedback(feedbackData);
    submitted.value = true;

    // Reset form
    resetForm();
  } catch (error) {
    console.error("Error submitting feedback:", error);
    errorMessage.value =
      error.message || "Failed to submit feedback. Please try again.";
  } finally {
    loading.value = false;
  }
};

// Reset the form
const resetForm = () => {
  feedbackType.value = "GENERAL";
  message.value = "";
  email.value = "";
  rating.value = 0;
  valid.value = false;
  if (form.value) {
    form.value.reset();
  }
};

// Close the dialog
const closeDialog = () => {
  if (submitted.value) {
    // Reset form when closing after submission
    resetForm();
    submitted.value = false;
  }
  isOpen.value = false;
};
</script>

<style scoped>
.feedback-button {
  position: fixed;
  z-index: 100;
  border-radius: 8px;
}

/* Position classes based on props */
.feedback-button.bottom-end {
  bottom: 24px;
  right: 24px;
}

.feedback-button.bottom-start {
  bottom: 24px;
  left: 24px;
}

.feedback-button.top-end {
  top: 24px;
  right: 24px;
}

.feedback-button.top-start {
  top: 24px;
  left: 24px;
}
</style>
