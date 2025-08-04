<template>
  <div>
    <TheHeader />
    
    <!-- Contact Form Section -->
    <section class="section-padding bg-gradient-to-b from-gray-50 to-white min-h-screen flex items-center pt-20 lg:pt-24">
      <div class="container-custom">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-12">
            <h1 class="heading-lg text-gray-900 mb-6">
              Contact Us for Demo
            </h1>
            <p class="text-xl text-gray-600 max-w-2xl mx-auto">
              Ready to see Sparks in action? Fill out the form below and we'll get back to you with a personalized demo.
            </p>
          </div>

          <div class="grid lg:grid-cols-2 gap-12 items-start">
            <!-- Contact Form -->
            <div class="bg-white rounded-2xl p-8 shadow-xl">
              <form @submit.prevent="submitForm" class="space-y-6">
                <!-- Name -->
                <div>
                  <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    v-model="form.name"
                    required
                    :class="[
                      'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors',
                      formErrors.name ? 'border-red-500 bg-red-50' : 
                      form.name && isNameValid ? 'border-green-500 bg-green-50' : 
                      'border-gray-300'
                    ]"
                    placeholder="Enter your full name"
                    @input="clearError('name')"
                    @blur="validateName"
                  >
                  <p v-if="formErrors.name" class="mt-1 text-sm text-red-600">
                    {{ formErrors.name }}
                  </p>
                </div>

                <!-- Email -->
                <div>
                  <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    v-model="form.email"
                    required
                    :class="[
                      'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors',
                      formErrors.email ? 'border-red-500 bg-red-50' : 
                      form.email && isEmailValid ? 'border-green-500 bg-green-50' : 
                      'border-gray-300'
                    ]"
                    placeholder="Enter your email address"
                    @input="clearError('email')"
                    @blur="validateEmail"
                  >
                  <p v-if="formErrors.email" class="mt-1 text-sm text-red-600">
                    {{ formErrors.email }}
                  </p>
                </div>

                <!-- Company -->
                <div>
                  <label for="company" class="block text-sm font-medium text-gray-700 mb-2">
                    Company/Organization
                  </label>
                  <input
                    type="text"
                    id="company"
                    v-model="form.company"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    placeholder="Enter your company name (optional)"
                  >
                </div>

                <!-- Event Type -->
                <div>
                  <label for="eventType" class="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <select
                    id="eventType"
                    v-model="form.eventType"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select event type (optional)</option>
                    <option value="wedding">Wedding</option>
                    <option value="corporate">Corporate Event</option>
                    <option value="birthday">Birthday Party</option>
                    <option value="family">Family Reunion</option>
                    <option value="graduation">Graduation</option>
                    <option value="conference">Conference</option>
                    <option value="sports">Sports Event</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <!-- Expected Attendees -->
                <div>
                  <label for="attendees" class="block text-sm font-medium text-gray-700 mb-2">
                    Expected Number of Attendees
                  </label>
                  <select
                    id="attendees"
                    v-model="form.attendees"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select attendee count (optional)</option>
                    <option value="1-10">1-10 people</option>
                    <option value="11-25">11-25 people</option>
                    <option value="26-50">26-50 people</option>
                    <option value="51-100">51-100 people</option>
                    <option value="101-200">101-200 people</option>
                    <option value="200+">200+ people</option>
                  </select>
                </div>

                <!-- Message -->
                <div>
                  <label for="message" class="block text-sm font-medium text-gray-700 mb-2">
                    Tell us about your event *
                  </label>
                  <textarea
                    id="message"
                    v-model="form.message"
                    rows="4"
                    required
                    :class="[
                      'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors resize-none',
                      formErrors.message ? 'border-red-500 bg-red-50' : 
                      form.message && isMessageValid ? 'border-green-500 bg-green-50' : 
                      'border-gray-300'
                    ]"
                    placeholder="Describe your event and what you'd like to see in the demo..."
                    @input="clearError('message')"
                    @blur="validateMessage"
                  ></textarea>
                  <p v-if="formErrors.message" class="mt-1 text-sm text-red-600">
                    {{ formErrors.message }}
                  </p>
                  <p v-else class="mt-1 text-sm text-gray-500">
                    {{ form.message.length }}/500 characters
                  </p>
                </div>

                <!-- Cloudflare Turnstile -->
                <div class="flex justify-center">
                  <vue-turnstile 
                    :site-key="config.public.turnstileSiteKey" 
                    v-model="turnstileToken"
                    theme="light"
                    size="normal"
                    @input="clearError('captcha')"
                  />
                </div>
                <p v-if="formErrors.captcha" class="text-sm text-red-600 text-center -mt-2">
                  {{ formErrors.captcha }}
                </p>

                <!-- Submit Button -->
                <button
                  type="submit"
                  :disabled="isSubmitting || !isFormValid"
                  :class="[
                    'w-full text-lg py-4 rounded-lg font-semibold transition-all duration-200',
                    isFormValid && !isSubmitting
                      ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  ]"
                >
                  <div class="flex items-center justify-center">
                    <svg v-if="isSubmitting" class="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    <span v-if="isSubmitting">Sending Request...</span>
                    <span v-else-if="!isFormValid">Complete All Required Fields</span>
                    <span v-else>Request Demo</span>
                  </div>
                </button>

                <!-- Success Message -->
                <div v-if="showSuccess" class="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div class="flex items-center">
                    <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    <p class="text-green-700 font-medium">Thank you! We'll contact you soon to schedule your demo.</p>
                  </div>
                </div>

                <!-- Error Message -->
                <div v-if="showError" class="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div class="flex items-center">
                    <svg class="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L10 10.586l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                    <p class="text-red-700 font-medium">{{ errorMessage }}</p>
                  </div>
                </div>

                <!-- Cloudflare Turnstile Notice -->
                <div class="text-xs text-gray-500 text-center">
                  This site is protected by Cloudflare Turnstile and the Cloudflare
                  <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" class="text-primary-600 hover:underline">Privacy Policy</a> and
                  <a href="https://www.cloudflare.com/website-terms/" target="_blank" class="text-primary-600 hover:underline">Terms of Service</a> apply.
                </div>
              </form>
            </div>

            <!-- Contact Info -->
            <div class="space-y-8">
              <!-- Demo Info -->
              <div class="bg-gradient-to-br from-primary-50 to-accent-50 rounded-2xl p-8">
                <h3 class="text-xl font-bold text-gray-900 mb-4">What to Expect</h3>
                <ul class="space-y-4">
                  <li class="flex items-start">
                    <svg class="w-6 h-6 text-primary-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <div>
                      <h4 class="font-semibold text-gray-900">Personalized Demo</h4>
                      <p class="text-gray-600 text-sm">We'll show you how Sparks can help organize and share your photos</p>
                    </div>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-6 h-6 text-primary-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <div>
                      <h4 class="font-semibold text-gray-900">30-Minute Session</h4>
                      <p class="text-gray-600 text-sm">Quick walkthrough of all features and Q&A</p>
                    </div>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-6 h-6 text-primary-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <div>
                      <h4 class="font-semibold text-gray-900">Beta Access</h4>
                      <p class="text-gray-600 text-sm">Get early access to test Sparks with your events</p>
                    </div>
                  </li>
                </ul>
              </div>

              <!-- Beta Notice -->
              <div class="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <div class="flex items-start">
                  <svg class="w-6 h-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                  </svg>
                  <div>
                    <h4 class="font-semibold text-blue-900 mb-2">Beta Release</h4>
                    <p class="text-blue-800 text-sm">
                      Sparks is currently in beta. We're looking for event organizers to test the platform 
                      and provide feedback to help us improve.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Response Time -->
              <div class="text-center p-6 bg-gray-50 rounded-2xl">
                <h4 class="font-semibold text-gray-900 mb-2">Quick Response</h4>
                <p class="text-gray-600 text-sm">
                  We typically respond within 24 hours and can schedule demos within 2-3 business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <TheFooter />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// SEO Meta
useHead({
  title: 'Contact Us for Demo - Sparks AI Photo Sharing',
  meta: [
    {
      name: 'description',
      content: 'Request a personalized demo of Sparks AI-powered photo sharing platform. See how we can help organize your event photos automatically.'
    }
  ]
})

// Runtime config
const config = useRuntimeConfig()

// Form data
const form = ref({
  name: '',
  email: '',
  company: '',
  eventType: '',
  attendees: '',
  message: ''
})

// Form validation state
const formErrors = ref({
  name: '',
  email: '',
  message: '',
  captcha: ''
})

const isSubmitting = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref('')

// Turnstile token using v-model
const turnstileToken = ref('')

// Form validation functions
const validateName = () => {
  if (!form.value.name.trim()) {
    formErrors.value.name = 'Name is required'
    return false
  }
  if (form.value.name.trim().length < 2) {
    formErrors.value.name = 'Name must be at least 2 characters'
    return false
  }
  formErrors.value.name = ''
  return true
}

const validateEmail = () => {
  if (!form.value.email.trim()) {
    formErrors.value.email = 'Email is required'
    return false
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.value.email.trim())) {
    formErrors.value.email = 'Please enter a valid email address'
    return false
  }
  
  formErrors.value.email = ''
  return true
}

const validateMessage = () => {
  if (!form.value.message.trim()) {
    formErrors.value.message = 'Message is required'
    return false
  }
  formErrors.value.message = ''
  return true
}

const validateCaptcha = () => {
  if (!turnstileToken.value) {
    formErrors.value.captcha = 'Please complete the security verification'
    return false
  }
  formErrors.value.captcha = ''
  return true
}

// Real-time validation
const isNameValid = computed(() => {
  return form.value.name.trim().length >= 2
})

const isEmailValid = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(form.value.email.trim())
})

const isMessageValid = computed(() => {
  return form.value.message.trim().length > 0
})

const isFormValid = computed(() => {
  return isNameValid.value && 
         isEmailValid.value && 
         isMessageValid.value && 
         turnstileToken.value
})

// Clear error when user starts typing
const clearError = (field) => {
  formErrors.value[field] = ''
  showError.value = false
}

// Form submission
const submitForm = async () => {
  // Clear previous errors
  showError.value = false
  errorMessage.value = ''
  
  // Validate all fields
  const isNameOk = validateName()
  const isEmailOk = validateEmail()
  const isMessageOk = validateMessage()
  const isCaptchaOk = validateCaptcha()
  
  if (!isNameOk || !isEmailOk || !isMessageOk || !isCaptchaOk) {
    errorMessage.value = 'Please fix the errors above and try again.'
    showError.value = true
    return
  }

  isSubmitting.value = true
  
  try {
    // Prepare form data
    const formData = {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      company: form.value.company.trim(),
      eventType: form.value.eventType,
      attendees: form.value.attendees,
      message: form.value.message.trim(),
      captchaToken: turnstileToken.value
    }

    // Submit to API
    const response = await $fetch(config.public.contactApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(formData)
    })

    if (response.success || response.message) {
      // Show success message
      showSuccess.value = true
      
      // Reset form
      form.value = {
        name: '',
        email: '',
        company: '',
        eventType: '',
        attendees: '',
        message: ''
      }
      
      // Reset validation errors
      formErrors.value = {
        name: '',
        email: '',
        message: '',
        captcha: ''
      }
      
      // Reset Turnstile token
      turnstileToken.value = ''
      
      // Hide success message after 10 seconds
      setTimeout(() => {
        showSuccess.value = false
      }, 10000)
    } else {
      throw new Error(response.error || 'Submission failed')
    }
    
  } catch (error) {
    console.error('Form submission error:', error)
    
    // Handle specific validation errors from server
    if (error.data?.details) {
      const details = error.data.details
      if (details.name) formErrors.value.name = details.name
      if (details.email) formErrors.value.email = details.email
      if (details.message) formErrors.value.message = details.message
      if (details.captcha) formErrors.value.captcha = details.captcha
      
      errorMessage.value = error.data.error || 'Please fix the errors and try again.'
    } else {
      errorMessage.value = error.data?.error || error.message || 'Failed to submit form. Please try again.'
    }
    
    showError.value = true
    
    // Reset Turnstile token on error
    turnstileToken.value = ''
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
/* Custom focus styles for better accessibility */
input:focus,
select:focus,
textarea:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Smooth transitions */
input,
select,
textarea {
  transition: all 0.2s ease-in-out;
}

input:hover,
select:hover,
textarea:hover {
  border-color: #9CA3AF;
}
</style>
