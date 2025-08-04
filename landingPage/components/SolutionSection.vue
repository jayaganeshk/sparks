<template>
  <section id="how-it-works" class="section-padding bg-white">
    <div class="container-custom">
      <div class="text-center mb-16">
        <h2 class="heading-lg text-gray-900 mb-6">
          How <span class="text-gradient">Sparks</span> Solves This
        </h2>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto">
          Our AI-powered platform transforms chaotic event photo sharing into an
          organized, effortless experience that preserves every memory.
        </p>
      </div>

      <!-- Process Steps -->
      <div class="relative mb-20">
        <!-- Connection Line -->
        <div
          class="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-200 via-accent-200 to-secondary-200 transform -translate-y-1/2"
        ></div>

        <div class="grid lg:grid-cols-3 gap-8 lg:gap-12">
          <!-- Step 1 -->
          <div
            class="relative text-center animate-slide-up"
            style="animation-delay: 0.1s"
          >
            <div
              class="relative z-10 w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <svg
                class="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div
              class="absolute top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold"
            >
              1
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-4">Instant Upload</h3>
            <p class="text-gray-600 mb-6">
              Everyone uploads photos in real-time during the event. No more
              waiting until after the party.
            </p>
            <div class="bg-primary-50 rounded-lg p-4">
              <div
                class="flex items-center justify-center space-x-2 text-primary-600 text-sm font-medium"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Drag & drop, mobile camera, bulk upload</span>
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div
            class="relative text-center animate-slide-up"
            style="animation-delay: 0.2s"
          >
            <div
              class="relative z-10 w-20 h-20 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <svg
                class="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div
              class="absolute top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-accent-500 text-white rounded-full flex items-center justify-center text-sm font-bold"
            >
              2
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-4">AI Recognition</h3>
            <p class="text-gray-600 mb-6">
              Advanced AI automatically detects and tags people in every photo
              using facial recognition technology.
            </p>
            <div class="bg-accent-50 rounded-lg p-4">
              <div
                class="flex items-center justify-center space-x-2 text-accent-600 text-sm font-medium"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>AI Recognition</span>
              </div>
            </div>
          </div>

          <!-- Step 3 -->
          <div
            class="relative text-center animate-slide-up"
            style="animation-delay: 0.3s"
          >
            <div
              class="relative z-10 w-20 h-20 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <svg
                class="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div
              class="absolute top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-secondary-500 text-white rounded-full flex items-center justify-center text-sm font-bold"
            >
              3
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-4">
              Instant Discovery
            </h3>
            <p class="text-gray-600 mb-6">
              Find photos of any person in seconds. Browse by people, time, or
              uploader with smart search.
            </p>
            <div class="bg-secondary-50 rounded-lg p-4">
              <div
                class="flex items-center justify-center space-x-2 text-secondary-600 text-sm font-medium"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Smart filters, real-time updates</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Before/After Comparison -->
      <div
        class="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 lg:p-12"
      >
        <h3
          class="text-2xl lg:text-3xl font-bold text-center text-gray-900 mb-12"
        >
          Before vs After Sparks
        </h3>

        <div class="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <!-- Before -->
          <div class="bg-white rounded-xl p-6 shadow-lg">
            <div class="flex items-center mb-4">
              <div
                class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3"
              >
                <svg
                  class="w-4 h-4 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h4 class="text-lg font-semibold text-gray-900">Before Sparks</h4>
            </div>
            <ul class="space-y-3 text-gray-600">
              <li class="flex items-start">
                <svg
                  class="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
                Photos scattered across different phones
              </li>
              <li class="flex items-start">
                <svg
                  class="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
                Hours spent manually organizing
              </li>
              <li class="flex items-start">
                <svg
                  class="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
                Chaotic group chat photo dumps
              </li>
              <li class="flex items-start">
                <svg
                  class="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
                Missing memories from unshared photos
              </li>
            </ul>
          </div>

          <!-- After -->
          <div
            class="bg-white rounded-xl p-6 shadow-lg border-2 border-green-200"
          >
            <div class="flex items-center mb-4">
              <div
                class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3"
              >
                <svg
                  class="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h4 class="text-lg font-semibold text-gray-900">With Sparks</h4>
            </div>
            <ul class="space-y-3 text-gray-600">
              <li class="flex items-start">
                <svg
                  class="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                All photos automatically organized in one place
              </li>
              <li class="flex items-start">
                <svg
                  class="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                Zero manual work - AI does everything
              </li>
              <li class="flex items-start">
                <svg
                  class="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                Clean, organized interface with smart search
              </li>
              <li class="flex items-start">
                <svg
                  class="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                Every memory preserved and easily accessible
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
