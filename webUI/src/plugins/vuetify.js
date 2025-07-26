/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import '@/styles/settings.scss'
import '@/styles/main.scss'

// Composables
import { createVuetify } from 'vuetify'
// import { VInfiniteScroll } from 'vuetify/labs/VInfiniteScroll'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  components: {
    // VInfiniteScroll,
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#000000',
          secondary: '#FF3600',
        },
      },
    },
  },
})
