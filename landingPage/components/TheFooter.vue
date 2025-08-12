<template>
  <footer class="bg-gray-50 text-gray-900 border-t border-gray-200">
    <div class="container-custom">
      <!-- Main Footer Content -->
      <div class="py-16">
        <div class="grid lg:grid-cols-2 gap-8">
          <!-- Company Info -->
          <div>
            <div class="flex items-center mb-6">
              <img src="/logo.png" alt="Sparks Logo" class="h-12 w-auto">
            </div>
            <p class="text-gray-600 mb-6 max-w-md">
              AI-powered photo sharing that transforms chaotic event photography
              into organized, accessible memories. Never lose a moment again.
              <br><br>
              <strong>Open source</strong> and available on GitHub for developers and contributors.
            </p>
            <div
              class="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-700 text-sm"
            >
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
              First Release - Beta Version
            </div>
          </div>

          <!-- Contact & Demo -->
          <div class="lg:text-right">
            <h3 class="text-lg font-semibold mb-6 text-gray-900">Get Started</h3>
            <p class="text-gray-600 mb-6">
              Ready to transform your event photo sharing? Contact us for a
              personalized demo.
            </p>
            <div class="flex flex-col sm:flex-row lg:justify-end gap-4 mb-8">
              <NuxtLink to="/contact" class="btn-primary">
                <svg
                  class="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Contact Us for Demo
              </NuxtLink>
              <button @click="openDemoModal" class="btn-secondary">
                <svg
                  class="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8 12V8l4 2-4 2z" />
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clip-rule="evenodd"
                  />
                </svg>
                Try Live Demo
              </button>
            </div>

            <!-- Platform Info -->
            <div class="space-y-2 text-sm text-gray-500">
              <div class="flex items-center lg:justify-end">
                <svg
                  class="w-4 h-4 mr-2 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span>Web App Available Now</span>
              </div>
              <div class="flex items-center lg:justify-end">
                <svg
                  class="w-4 h-4 mr-2 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span>Mobile Apps Coming Soon</span>
              </div>
              <div class="flex items-center lg:justify-end">
                <svg
                  class="w-4 h-4 mr-2 text-gray-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                <a href="https://github.com/jayaganeshk/sparks" target="_blank" rel="noopener noreferrer" class="hover:text-gray-900 transition-colors">
                  Open Source on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Footer -->
      <div class="py-6 border-t border-gray-300">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <div class="text-gray-500 text-sm mb-4 md:mb-0">
            © 2025 Sparks. Open source software available on 
            <a href="https://github.com/jayaganeshk/sparks" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 transition-colors">
              GitHub
            </a>.
          </div>
          <div class="flex flex-wrap gap-6 text-sm text-gray-500">
            <a href="#" class="hover:text-gray-900 transition-colors"
              >Privacy Policy</a
            >
            <a href="#" class="hover:text-gray-900 transition-colors"
              >Terms of Service</a
            >
            <a href="#" class="hover:text-gray-900 transition-colors">Support</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Demo Modal -->
    <DemoModal :is-open="isDemoModalOpen" @close="closeDemoModal" />
  </footer>
</template>

<script setup>
import { ref } from 'vue'

const isDemoModalOpen = ref(false)

const openDemoModal = () => {
  isDemoModalOpen.value = true
}

const closeDemoModal = () => {
  isDemoModalOpen.value = false
}
</script>
