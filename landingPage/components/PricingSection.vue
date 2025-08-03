<template>
  <section id="pricing" class="section-padding bg-gradient-to-b from-gray-50 to-white">
    <div class="container-custom">
      <div class="text-center mb-16">
        <h2 class="heading-lg text-gray-900 mb-6">
          Simple, Transparent Pricing
        </h2>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto">
          Choose the perfect plan for your events. Start free and upgrade as you grow.
        </p>
      </div>

      <div class="grid lg:grid-cols-3 gap-8 mb-16">
        <!-- Free Plan -->
        <div class="bg-white rounded-2xl p-8 shadow-lg border-2 border-gray-100 card-hover animate-slide-up" style="animation-delay: 0.1s;">
          <div class="text-center mb-8">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Free</h3>
            <div class="text-4xl font-bold text-gray-900 mb-2">$0</div>
            <p class="text-gray-600">Perfect for small gatherings</p>
          </div>
          
          <ul class="space-y-4 mb-8">
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">Up to 100 photos per event</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">AI face recognition</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">Real-time sharing</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">Up to 10 participants</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">7 days storage</span>
            </li>
          </ul>
          
          <button class="btn-secondary w-full">
            Get Started Free
          </button>
        </div>

        <!-- Pro Plan -->
        <div class="bg-white rounded-2xl p-8 shadow-xl border-2 border-primary-200 card-hover animate-slide-up relative" style="animation-delay: 0.2s;">
          <!-- Popular Badge -->
          <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div class="bg-gradient-to-r from-primary-500 to-accent-500 text-white px-6 py-2 rounded-full text-sm font-medium">
              Most Popular
            </div>
          </div>
          
          <div class="text-center mb-8">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
            <div class="text-4xl font-bold text-gray-900 mb-2">
              $19
              <span class="text-lg text-gray-600 font-normal">/month</span>
            </div>
            <p class="text-gray-600">Perfect for regular events</p>
          </div>
          
          <ul class="space-y-4 mb-8">
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">Up to 1,000 photos per event</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">Advanced AI recognition</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">Up to 100 participants</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">Unlimited storage</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">Priority support</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">Custom branding</span>
            </li>
          </ul>
          
          <button class="btn-primary w-full">
            Start Pro Trial
          </button>
        </div>

        <!-- Enterprise Plan -->
        <div class="bg-white rounded-2xl p-8 shadow-lg border-2 border-gray-100 card-hover animate-slide-up" style="animation-delay: 0.3s;">
          <div class="text-center mb-8">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
            <div class="text-4xl font-bold text-gray-900 mb-2">Custom</div>
            <p class="text-gray-600">For large organizations</p>
          </div>
          
          <ul class="space-y-4 mb-8">
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">Unlimited everything</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">Dedicated infrastructure</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">SSO integration</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">Advanced analytics</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-600">24/7 dedicated support</span>
            </li>
          </ul>
          
          <button class="btn-secondary w-full">
            Contact Sales
          </button>
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="bg-white rounded-2xl p-8 lg:p-12 shadow-lg">
        <h3 class="text-2xl font-bold text-center text-gray-900 mb-8">
          Frequently Asked Questions
        </h3>
        
        <div class="grid md:grid-cols-2 gap-8">
          <div>
            <h4 class="text-lg font-semibold text-gray-900 mb-2">
              How accurate is the face recognition?
            </h4>
            <p class="text-gray-600 mb-6">
              Our AI achieves 99.5% accuracy using advanced facial recognition technology powered by Pinecone vector database.
            </p>
            
            <h4 class="text-lg font-semibold text-gray-900 mb-2">
              Is my data secure?
            </h4>
            <p class="text-gray-600 mb-6">
              Yes! We use enterprise-grade AWS infrastructure with encryption at rest and in transit. Your photos are private and secure.
            </p>
            
            <h4 class="text-lg font-semibold text-gray-900 mb-2">
              Can I cancel anytime?
            </h4>
            <p class="text-gray-600">
              Absolutely. No long-term contracts. Cancel your subscription anytime with one click.
            </p>
          </div>
          
          <div>
            <h4 class="text-lg font-semibold text-gray-900 mb-2">
              What file formats are supported?
            </h4>
            <p class="text-gray-600 mb-6">
              We support all major image formats including JPEG, PNG, HEIC, and RAW files from professional cameras.
            </p>
            
            <h4 class="text-lg font-semibold text-gray-900 mb-2">
              How fast is the processing?
            </h4>
            <p class="text-gray-600 mb-6">
              Photos are processed and organized within seconds of upload thanks to our serverless AWS architecture.
            </p>
            
            <h4 class="text-lg font-semibold text-gray-900 mb-2">
              Do you offer refunds?
            </h4>
            <p class="text-gray-600">
              Yes, we offer a 30-day money-back guarantee if you're not completely satisfied.
            </p>
          </div>
        </div>
      </div>

      <!-- Money Back Guarantee -->
      <div class="text-center mt-12">
        <div class="inline-flex items-center bg-green-50 rounded-full px-6 py-3 text-green-700 font-medium">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          30-day money-back guarantee
        </div>
      </div>
    </div>
  </section>
</template>
