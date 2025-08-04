// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
    '@vueuse/nuxt'
  ],
  googleFonts: {
    families: {
      Inter: [300, 400, 500, 600, 700, 800, 900],
      'Plus Jakarta Sans': [300, 400, 500, 600, 700, 800]
    }
  },
  app: {
    head: {
      title: 'Sparks - AI-Powered Event Photo Sharing',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { 
          hid: 'description', 
          name: 'description', 
          content: 'Never lose event memories again. Sparks uses AI to instantly organize your event photos by people, making it easy to find and share memories from any gathering.' 
        },
        { name: 'keywords', content: 'event photos, photo sharing, AI photo organization, face recognition, wedding photos, party photos' },
        { property: 'og:title', content: 'Sparks - AI-Powered Event Photo Sharing' },
        { property: 'og:description', content: 'Never lose event memories again. AI-powered photo sharing that instantly organizes your event photos by people.' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  css: ['~/assets/css/main.css'],
  tailwindcss: {
    cssPath: '~/assets/css/main.css'
  },
  runtimeConfig: {
    public: {
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY,
      contactApiUrl: process.env.NUXT_PUBLIC_CONTACT_API_URL
    }
  }
})
