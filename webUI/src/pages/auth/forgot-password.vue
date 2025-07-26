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
            <h1 class="text-h4 mt-4">Reset Password</h1>
            <p class="text-subtitle-1" v-if="!codeSent">
              Enter your email to receive a password reset code
            </p>
            <p class="text-subtitle-1" v-else>
              Enter the verification code sent to {{ email }}
            </p>
          </div>

          <!-- Request Password Reset Form -->
          <v-form
            v-if="!codeSent"
            @submit.prevent="handleForgotPassword"
            ref="requestForm"
          >
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              :rules="[
                (v) => !!v || 'Email is required',
                (v) => /.+@.+\..+/.test(v) || 'Email must be valid',
              ]"
              required
              variant="outlined"
              prepend-inner-icon="mdi-email"
            ></v-text-field>

            <v-btn
              type="submit"
              color="primary"
              block
              :loading="loading"
              :disabled="loading"
              class="mt-4"
            >
              Send Reset Code
            </v-btn>
          </v-form>

          <!-- Reset Password Form -->
          <v-form v-else @submit.prevent="handleResetPassword" ref="resetForm">
            <v-text-field
              v-model="code"
              label="Verification Code"
              :rules="[(v) => !!v || 'Verification code is required']"
              required
              variant="outlined"
              prepend-inner-icon="mdi-numeric"
            ></v-text-field>

            <v-text-field
              v-model="newPassword"
              label="New Password"
              :type="showPassword ? 'text' : 'password'"
              :rules="[
                (v) => !!v || 'Password is required',
                (v) =>
                  v.length >= 8 || 'Password must be at least 8 characters',
                (v) =>
                  /[A-Z]/.test(v) ||
                  'Password must contain at least one uppercase letter',
                (v) =>
                  /[0-9]/.test(v) ||
                  'Password must contain at least one number',
                (v) =>
                  /[^A-Za-z0-9]/.test(v) ||
                  'Password must contain at least one special character',
              ]"
              required
              variant="outlined"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
            ></v-text-field>

            <v-text-field
              v-model="confirmPassword"
              label="Confirm Password"
              :type="showConfirmPassword ? 'text' : 'password'"
              :rules="[
                (v) => !!v || 'Please confirm your password',
                (v) => v === newPassword || 'Passwords do not match',
              ]"
              required
              variant="outlined"
              prepend-inner-icon="mdi-lock-check"
              :append-inner-icon="
                showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'
              "
              @click:append-inner="showConfirmPassword = !showConfirmPassword"
            ></v-text-field>

            <v-btn
              type="submit"
              color="primary"
              block
              :loading="loading"
              :disabled="loading"
              class="mt-4"
            >
              Reset Password
            </v-btn>
          </v-form>

          <div class="text-center mt-4">
            <v-btn
              variant="text"
              color="primary"
              @click="goToSignIn"
              size="small"
            >
              Back to Sign In
            </v-btn>
          </div>

          <v-alert
            v-if="error"
            type="error"
            title="Error"
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
import { ref } from "vue";
import { useRouter } from "vue-router";
import { authService } from "@/services";

const router = useRouter();
const email = ref("");
const code = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const loading = ref(false);
const error = ref("");
const success = ref("");
const codeSent = ref(false);
const requestForm = ref(null);
const resetForm = ref(null);

const handleForgotPassword = async () => {
  // Validate form
  const { valid } = await requestForm.value.validate();
  if (!valid) return;

  loading.value = true;
  error.value = "";
  success.value = "";

  try {
    await authService.forgotPassword(email.value);
    success.value = "A password reset code has been sent to your email.";
    codeSent.value = true;
  } catch (err) {
    console.error("Error requesting password reset:", err);
    error.value =
      err.message || "Failed to request password reset. Please try again.";
  } finally {
    loading.value = false;
  }
};

const handleResetPassword = async () => {
  // Validate form
  const { valid } = await resetForm.value.validate();
  if (!valid) return;

  loading.value = true;
  error.value = "";
  success.value = "";

  try {
    await authService.forgotPasswordSubmit(
      email.value,
      code.value,
      newPassword.value
    );
    success.value = "Your password has been reset successfully!";

    // Redirect to login after a short delay
    setTimeout(() => {
      router.push("/auth/login");
    }, 2000);
  } catch (err) {
    console.error("Error resetting password:", err);
    error.value = err.message || "Failed to reset password. Please try again.";
  } finally {
    loading.value = false;
  }
};

const goToSignIn = () => {
  router.push("/auth/login");
};
</script>
