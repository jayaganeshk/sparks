<template>
  <v-card class="mx-auto pa-4" max-width="400">
    <div class="text-center mb-4">
      <img src="@/assets/logo.png" alt="Logo" class="auth-logo" />
    </div>
    <v-form ref="form" @submit.prevent="handleSignIn">
      <v-text-field
        v-model="email"
        label="Email"
        type="email"
        :rules="emailRules"
        variant="outlined"
        required
        prepend-inner-icon="mdi-email-outline"
      ></v-text-field>

      <v-text-field
        v-model="password"
        label="Password"
        :type="showPassword ? 'text' : 'password'"
        :rules="passwordRules"
        variant="outlined"
        required
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        @click:append-inner="showPassword = !showPassword"
      ></v-text-field>

      <v-alert v-if="error" type="error" dense class="mb-4">{{
        error
      }}</v-alert>

      <v-btn :loading="loading" type="submit" color="primary" block large>
        Sign In
      </v-btn>
    </v-form>

    <v-divider class="my-4"></v-divider>

    <div class="text-center">
      <router-link to="/auth/forgot-password" class="text-body-2">
        Forgot Password?
      </router-link>
      <span class="mx-2">|</span>
      <router-link to="/auth/signup" class="text-body-2">
        Don't have an account? Sign Up
      </router-link>
    </div>
  </v-card>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "@/store/app";

const router = useRouter();
const appStore = useAppStore();
const email = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);
const error = ref("");
const form = ref(null);

const emailRules = [
  (v) => !!v || "E-mail is required",
  (v) => /.+@.+\..+/.test(v) || "E-mail must be valid",
];

const passwordRules = [(v) => !!v || "Password is required"];

const handleSignIn = async () => {
  const { valid } = await form.value.validate();
  if (!valid) return;

  loading.value = true;
  error.value = "";

  try {
    await appStore.login(email.value, password.value);
    const redirectPath = router.currentRoute.value.query.redirect || "/";
    router.push(redirectPath);
  } catch (err) {
    console.error("Error signing in:", err);
    if (err.name === "UserNotConfirmedException") {
      router.push({
        path: "/auth/confirm-signup",
        query: { email: email.value },
      });
    } else {
      error.value = err.message || "An unknown error occurred";
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-logo {
  max-height: 60px;
  margin-bottom: 1rem;
}
</style>
