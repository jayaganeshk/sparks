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

            <p class="text-subtitle-1">Create a new account</p>
          </div>

          <v-form @submit.prevent="handleSignUp" ref="form">
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

            <v-text-field
              v-model="displayName"
              label="Display Name"
              :rules="[(v) => !!v || 'Display name is required']"
              required
              variant="outlined"
              prepend-inner-icon="mdi-account"
            ></v-text-field>

            <v-text-field
              v-model="password"
              label="Password"
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
                (v) => v === password || 'Passwords do not match',
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
              Sign Up
            </v-btn>

            <div class="text-center mt-4">
              <p>
                Already have an account?
                <v-btn
                  variant="text"
                  color="primary"
                  @click="goToSignIn"
                  size="small"
                >
                  Sign In
                </v-btn>
              </p>
            </div>
          </v-form>

          <v-alert
            v-if="error"
            type="error"
            title="Registration Error"
            :text="error"
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
const displayName = ref("");
const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const loading = ref(false);
const error = ref("");
const form = ref(null);

const handleSignUp = async () => {
  // Validate form
  const { valid } = await form.value.validate();
  if (!valid) return;

  loading.value = true;
  error.value = "";

  try {
    await authService.signUp(email.value, password.value, {
      name: displayName.value,
    });

    // Redirect to confirmation page
    router.push({
      name: "ConfirmSignup",
      params: { email: email.value },
    });
  } catch (err) {
    console.error("Error signing up:", err);
    error.value = err.message || "Failed to sign up. Please try again.";
  } finally {
    loading.value = false;
  }
};

const goToSignIn = () => {
  router.push("/auth/login");
};
</script>
