<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="pa-4">
          <div class="text-center mb-4">
            <v-img
              src="@/assets/logo.png"
              max-width="150"
              class="mx-auto"
            ></v-img>
            <h1 class="text-h4 mt-4">Confirm Sign Up</h1>
            <p class="text-subtitle-1">
              We've sent a verification code to {{ email }}
            </p>
          </div>

          <v-form @submit.prevent="handleConfirmSignUp" ref="form">
            <v-text-field
              v-model="code"
              label="Verification Code"
              :rules="[(v) => !!v || 'Verification code is required']"
              required
              variant="outlined"
              prepend-inner-icon="mdi-numeric"
            ></v-text-field>

            <v-btn
              type="submit"
              color="primary"
              block
              :loading="loading"
              :disabled="loading"
              class="mt-4"
            >
              Verify
            </v-btn>

            <div class="d-flex justify-space-between mt-4">
              <v-btn
                variant="text"
                color="primary"
                @click="resendCode"
                size="small"
                :disabled="resendLoading"
              >
                Resend Code
              </v-btn>

              <v-btn
                variant="text"
                color="primary"
                @click="goToSignIn"
                size="small"
              >
                Back to Sign In
              </v-btn>
            </div>
          </v-form>

          <v-alert
            v-if="error"
            type="error"
            title="Verification Error"
            :text="error"
            class="mt-4"
          ></v-alert>

          <v-alert
            v-if="success"
            type="success"
            title="Success"
            :text="success"
            class="mt-4"
          ></v-alert>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { authService } from "@/services";

const router = useRouter();
const route = useRoute();
const email = ref(route.params.email || "");
const code = ref("");
const loading = ref(false);
const resendLoading = ref(false);
const error = ref("");
const success = ref("");
const form = ref(null);

// Redirect to login if no email is provided
onMounted(() => {
  if (!email.value) {
    router.push("/auth/login");
  }
});

const handleConfirmSignUp = async () => {
  // Validate form
  const { valid } = await form.value.validate();
  if (!valid) return;

  loading.value = true;
  error.value = "";
  success.value = "";

  try {
    await authService.confirmSignUp(email.value, code.value);
    success.value = "Your account has been verified successfully!";

    // Redirect to login after a short delay
    setTimeout(() => {
      router.push("/auth/login");
    }, 2000);
  } catch (err) {
    console.error("Error confirming sign up:", err);
    error.value =
      err.message || "Failed to verify your account. Please try again.";
  } finally {
    loading.value = false;
  }
};

const resendCode = async () => {
  resendLoading.value = true;
  error.value = "";
  success.value = "";

  try {
    await authService.resendSignUp(email.value);
    success.value = "A new verification code has been sent to your email.";
  } catch (err) {
    console.error("Error resending code:", err);
    error.value =
      err.message || "Failed to resend verification code. Please try again.";
  } finally {
    resendLoading.value = false;
  }
};

const goToSignIn = () => {
  router.push("/auth/login");
};
</script>
