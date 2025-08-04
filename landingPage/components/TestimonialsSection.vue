<template>
  <section class="section-padding bg-gradient-to-r from-primary-50 to-accent-50">
    <div class="container-custom">
      <div class="text-center mb-16">
        <h2 class="heading-lg text-gray-900 mb-6">
          Ready for Your First Event
        </h2>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto">
          Join the beta and help us improve photo sharing for events everywhere
        </p>
      </div>

      <!-- Stats -->
      <div class="grid md:grid-cols-3 gap-8 mb-16">
        <div class="text-center animate-slide-up" style="animation-delay: 0.1s;">
          <div class="text-4xl lg:text-5xl font-bold text-primary-600 mb-2">Beta</div>
          <p class="text-gray-600">First Release</p>
        </div>
        <div class="text-center animate-slide-up" style="animation-delay: 0.2s;">
          <div class="text-4xl lg:text-5xl font-bold text-accent-600 mb-2">Web</div>
          <p class="text-gray-600">App Available</p>
        </div>
        <div class="text-center animate-slide-up" style="animation-delay: 0.3s;">
          <div class="text-4xl lg:text-5xl font-bold text-secondary-600 mb-2">Mobile</div>
          <p class="text-gray-600">Apps Coming Soon</p>
        </div>
      </div>

      <!-- Project Info -->
      <div class="bg-white rounded-2xl p-8 lg:p-12 shadow-xl">
        <div class="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">
              Be Part of the Beta
            </h3>
            <p class="text-gray-600 mb-6">
              Sparks is in beta release. Help us test and improve the platform while organizing your event photos effortlessly.
            </p>
            <div class="space-y-4">
              <div class="flex items-start">
                <svg class="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                <div>
                  <h4 class="font-semibold text-gray-900">Web Application Ready</h4>
                  <p class="text-gray-600 text-sm">Full-featured web app available now for testing</p>
                </div>
              </div>
              <div class="flex items-start">
                <svg class="w-6 h-6 text-blue-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <div>
                  <h4 class="font-semibold text-gray-900">Mobile Apps Coming Soon</h4>
                  <p class="text-gray-600 text-sm">Native iOS and Android apps in development</p>
                </div>
              </div>
              <div class="flex items-start">
                <svg class="w-6 h-6 text-purple-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                <div>
                  <h4 class="font-semibold text-gray-900">Beta Testing</h4>
                  <p class="text-gray-600 text-sm">Help us improve by testing with your events</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="relative">
            <div class="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center relative overflow-hidden">
              <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Team collaboration" class="w-full h-full object-cover">
              <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-6">
                <div class="text-white">
                  <h4 class="font-semibold mb-1">Community Driven</h4>
                  <p class="text-sm opacity-90">Built by developers, for event organizers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
