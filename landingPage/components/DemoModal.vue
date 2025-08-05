<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"
            >
              <DialogTitle
                as="h3"
                class="text-lg font-medium leading-6 text-gray-900 mb-4"
              >
                Access Demo Application
              </DialogTitle>
              
              <div class="mt-2">
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <svg class="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-amber-800">
                        Demo Data Notice
                      </h3>
                      <div class="mt-2 text-sm text-amber-700">
                        <p>
                          This is a demo environment. All data including photos, user accounts, and settings are automatically cleaned every few hours to maintain optimal performance.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-blue-800">
                        Terms & Conditions
                      </h3>
                      <div class="mt-2 text-sm text-blue-700">
                        <ul class="list-disc list-inside space-y-1">
                          <li>This demo is for evaluation purposes only</li>
                          <li>Do not upload sensitive or personal photos</li>
                          <li>Data may be reset without notice</li>
                          <li>Usage is subject to our privacy policy</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex items-center mb-4">
                  <input
                    id="accept-terms"
                    v-model="acceptedTerms"
                    type="checkbox"
                    class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label for="accept-terms" class="ml-2 block text-sm text-gray-900">
                    I accept the terms and conditions and understand that demo data will be cleared regularly
                  </label>
                </div>
              </div>

              <div class="mt-6 flex gap-3">
                <button
                  type="button"
                  class="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  @click="closeModal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  :disabled="!acceptedTerms"
                  :class="[
                    'flex-1 inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors',
                    acceptedTerms 
                      ? 'bg-primary-600 hover:bg-primary-700' 
                      : 'bg-gray-300 cursor-not-allowed'
                  ]"
                  @click="openDemoApp"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                  Open Demo App
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const acceptedTerms = ref(false)

const closeModal = () => {
  acceptedTerms.value = false
  emit('close')
}

const openDemoApp = () => {
  if (acceptedTerms.value) {
    const config = useRuntimeConfig()
    const demoUrl = config.public.demoAppUrl
    
    if (demoUrl) {
      window.open(demoUrl, '_blank', 'noopener,noreferrer')
      closeModal()
    } else {
      console.error('Demo app URL not configured')
      alert('Demo app URL is not configured. Please contact support.')
    }
  }
}
</script>
