<template>
  <section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-16 lg:pt-20">
    <!-- Background Elements -->
    <div class="absolute inset-0">
      <div class="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow"></div>
      <div class="absolute top-40 right-10 w-72 h-72 bg-accent-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" style="animation-delay: 1s;"></div>
      <div class="absolute -bottom-8 left-20 w-72 h-72 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" style="animation-delay: 2s;"></div>
    </div>

    <div class="container-custom relative z-10">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <!-- Content -->
        <div class="text-center lg:text-left animate-slide-in-left">
          <h1 class="heading-xl text-gray-900 mb-6">
            Never lose 
            <span class="text-gradient">event memories</span> 
            again
          </h1>
          
          <p class="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed">
            AI-powered photo sharing that instantly organizes your event photos by people. 
            No more scattered memories, no more missing photos.
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
            <button @click="openDemoModal" class="btn-accent text-lg px-8 py-4 animate-pulse-glow">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 12V8l4 2-4 2z"/>
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
              </svg>
              Try Live Demo
            </button>
            <NuxtLink to="/contact" class="btn-primary text-lg px-8 py-4">
              Contact Us for Demo
              <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </NuxtLink>
          </div>

          <!-- Beta Info -->
          <div class="flex flex-wrap justify-center lg:justify-start gap-8 text-sm text-gray-600">
            <div class="flex items-center">
              <div class="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span>Beta release available</span>
            </div>
            <div class="flex items-center">
              <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Web app ready to use</span>
            </div>
            <div class="flex items-center">
              <div class="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              <span>Mobile apps coming soon</span>
            </div>
          </div>
        </div>

        <!-- Hero Image/Demo -->
        <div class="relative animate-slide-in-right">
          <div class="relative">
            <!-- Phone Mockup -->
            <div class="relative mx-auto w-80 h-[600px] bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
              <div class="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                <!-- Status Bar -->
                <div class="h-6 bg-gray-50 flex items-center justify-between px-6 text-xs font-medium text-gray-900">
                  <span>9:41</span>
                  <div class="flex items-center space-x-1">
                    <div class="w-4 h-2 bg-green-500 rounded-sm"></div>
                  </div>
                </div>
                
                <!-- App Bar with Logo -->
                <div class="bg-white border-b border-gray-100 px-4 py-3 flex justify-center">
                  <img src="/logo.png" alt="Sparks" class="h-8 w-auto">
                </div>
                
                <!-- App Content -->
                <div class="flex-1 bg-gray-50">
                  <!-- Photos Header -->
                  <div class="px-4 py-3 bg-white">
                    <h2 class="text-lg font-semibold text-gray-900">Photos</h2>
                  </div>

                  <!-- Photo Grid -->
                  <div class="p-4 grid grid-cols-2 gap-2">
                    <div class="aspect-square bg-gradient-to-br from-pink-200 to-pink-300 rounded-lg flex items-center justify-center relative">
                      <svg class="w-8 h-8 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                      </svg>
                      <!-- Person indicator -->
                      <div class="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <svg class="w-2 h-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                    <div class="aspect-square bg-gradient-to-br from-blue-200 to-blue-300 rounded-lg flex items-center justify-center relative">
                      <svg class="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                      </svg>
                      <div class="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <span class="text-xs font-bold text-gray-600">2</span>
                      </div>
                    </div>
                    <div class="aspect-square bg-gradient-to-br from-green-200 to-green-300 rounded-lg flex items-center justify-center relative">
                      <svg class="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                      </svg>
                      <div class="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <svg class="w-2 h-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                    <div class="aspect-square bg-gradient-to-br from-purple-200 to-purple-300 rounded-lg flex items-center justify-center relative">
                      <svg class="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                      </svg>
                      <div class="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <span class="text-xs font-bold text-gray-600">3</span>
                      </div>
                    </div>
                  </div>

                  <!-- Bottom Navigation -->
                  <div class="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2">
                    <div class="flex justify-around">
                      <div class="flex flex-col items-center py-1 px-2">
                        <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                        </svg>
                        <span class="text-xs text-blue-600 font-medium">Home</span>
                      </div>
                      <div class="flex flex-col items-center py-1 px-2">
                        <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                        </svg>
                        <span class="text-xs text-gray-400">Uploaded By</span>
                      </div>
                      <div class="flex flex-col items-center py-1 px-2">
                        <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                        </svg>
                        <span class="text-xs text-gray-400">People</span>
                      </div>
                      <div class="flex flex-col items-center py-1 px-2">
                        <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                        </svg>
                        <span class="text-xs text-gray-400">Profile</span>
                      </div>
                    </div>
                  </div>

                  <!-- Floating Action Button -->
                  <div class="absolute bottom-20 right-4">
                    <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Floating Elements -->
            <div class="absolute -top-4 -left-4 w-16 h-16 bg-secondary-400 rounded-full flex items-center justify-center text-white animate-bounce-slow">
              <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            
            <div class="absolute -bottom-4 -right-4 w-12 h-12 bg-accent-400 rounded-full flex items-center justify-center text-white animate-pulse">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll Indicator -->
    <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
      <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
      </svg>
    </div>

    <!-- Demo Modal -->
    <DemoModal :is-open="isDemoModalOpen" @close="closeDemoModal" />
  </section>
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
