<template>
  <header
    class="fixed top-0 w-full z-50 transition-all duration-300"
    :class="scrolled || mobileMenuOpen ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'"
  >
    <nav class="container-custom">
      <div class="flex items-center justify-between h-16 lg:h-20">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center">
          <img
            src="/logo.png"
            alt="Sparks Logo"
            class="h-10 lg:h-12 w-auto"
          />
        </NuxtLink>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-8">
          <a
            href="/#features"
            class="text-gray-700 hover:text-primary-600 font-medium transition-colors"
            @click="scrollToSection('features')"
            >Features</a
          >
          <a
            href="/#how-it-works"
            class="text-gray-700 hover:text-primary-600 font-medium transition-colors"
            @click="scrollToSection('how-it-works')"
            >How it Works</a
          >
          <a
            href="/#use-cases"
            class="text-gray-700 hover:text-primary-600 font-medium transition-colors"
            @click="scrollToSection('use-cases')"
            >Use Cases</a
          >
        </div>

        <!-- CTA Buttons -->
        <div class="hidden md:flex items-center space-x-4">
          <button class="btn-secondary text-sm" @click="openDemoModal">
            Watch Demo
          </button>
          <NuxtLink to="/contact" class="btn-primary text-sm">
            Contact Us for Demo
          </NuxtLink>
        </div>

        <!-- Mobile Menu Button -->
        <button
          @click="mobileMenuOpen = !mobileMenuOpen"
          class="md:hidden p-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-gray-100 transition-colors"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="!mobileMenuOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Mobile Menu -->
      <div
        v-if="mobileMenuOpen"
        class="md:hidden py-4 border-t border-gray-200 bg-white/95 backdrop-blur-md"
      >
        <div class="flex flex-col space-y-4">
          <a
            href="/#features"
            @click="
              scrollToSection('features');
              mobileMenuOpen = false;
            "
            class="text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
            >Features</a
          >
          <a
            href="/#how-it-works"
            @click="
              scrollToSection('how-it-works');
              mobileMenuOpen = false;
            "
            class="text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
            >How it Works</a
          >
          <a
            href="/#use-cases"
            @click="
              scrollToSection('use-cases');
              mobileMenuOpen = false;
            "
            class="text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
            >Use Cases</a
          >
          <div class="flex flex-col space-y-3 pt-4">
            <button
              class="btn-secondary text-sm py-3"
              @click="
                openDemoModal();
                mobileMenuOpen = false;
              "
            >
              Watch Demo
            </button>
            <NuxtLink
              to="/contact"
              class="btn-primary text-sm py-3"
              @click="mobileMenuOpen = false"
              >Contact Us for Demo</NuxtLink
            >
          </div>
        </div>
      </div>
    </nav>

    <!-- Demo Modal -->
    <DemoModal :is-open="isDemoModalOpen" @close="closeDemoModal" />
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const scrolled = ref(false);
const mobileMenuOpen = ref(false);
const isDemoModalOpen = ref(false);

const handleScroll = () => {
  scrolled.value = window.scrollY > 50;
};

const scrollToSection = (sectionId) => {
  if (process.client) {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 80; // Account for fixed header
      const elementPosition = element.offsetTop - headerHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: "smooth",
      });
    }
  }
};

const openDemoModal = () => {
  isDemoModalOpen.value = true;
};

const closeDemoModal = () => {
  isDemoModalOpen.value = false;
};

onMounted(() => {
  if (process.client) {
    window.addEventListener("scroll", handleScroll);
  }
});

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener("scroll", handleScroll);
  }
});
</script>
