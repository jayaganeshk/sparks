<template>
  <section class="section-padding bg-gradient-to-r from-primary-600 via-accent-600 to-secondary-600 text-white relative overflow-hidden">
    <!-- Background Elements -->
    <div class="absolute inset-0">
      <div class="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
      <div class="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-white/5 rounded-full blur-2xl"></div>
    </div>

    <div class="container-custom relative z-10">
      <div class="text-center max-w-4xl mx-auto">
        <h2 class="heading-lg text-white mb-6 text-shadow-lg">
          Ready to Transform Your Event Photos?
        </h2>
        <p class="text-xl lg:text-2xl text-white/90 mb-8 leading-relaxed">
          Join thousands of event organizers who have revolutionized their photo sharing experience. 
          Start organizing your memories with AI-powered precision today.
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <NuxtLink to="/contact" class="btn-accent bg-white text-primary-600 hover:bg-gray-50 text-lg px-8 py-4 shadow-xl">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            Contact Us for Demo
          </NuxtLink>
          <button @click="openDemoModal" class="btn-secondary bg-white/10 text-white border-white/30 hover:bg-white/20 text-lg px-8 py-4 backdrop-blur-sm">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 12V8l4 2-4 2z"/>
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
            </svg>
            Watch Demo
          </button>
        </div>

        <!-- Features Highlight -->
        <div class="grid md:grid-cols-3 gap-8 mb-12">
          <div class="text-center animate-slide-up" style="animation-delay: 0.1s;">
            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Setup in 2 Minutes</h3>
            <p class="text-white/80 text-sm">Create your first event and start collecting photos instantly</p>
          </div>
          
          <div class="text-center animate-slide-up" style="animation-delay: 0.2s;">
            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">AI Does the Work</h3>
            <p class="text-white/80 text-sm">Advanced face recognition organizes photos automatically</p>
          </div>
          
          <div class="text-center animate-slide-up" style="animation-delay: 0.3s;">
            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Enterprise Security</h3>
            <p class="text-white/80 text-sm">Your memories are safe with AWS-grade security</p>
          </div>
        </div>

        <!-- Trust Indicators -->
        <div class="flex flex-wrap justify-center items-center gap-8 text-white/60 text-sm">
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Open source project</span>
          </div>
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Web app available now</span>
          </div>
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Mobile apps coming soon</span>
          </div>
        </div>
      </div>
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
