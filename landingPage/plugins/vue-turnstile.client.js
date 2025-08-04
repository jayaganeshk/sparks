import VueTurnstile from "vue-turnstile"

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('vue-turnstile', VueTurnstile)
})
