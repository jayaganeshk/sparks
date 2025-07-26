/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.js`
 */

// Plugins
import vuetify from './vuetify'
import pinia from '@/store'
import router from '@/router'

// AWS Amplify Configuration
import { configureAmplify } from '@/config/amplify'

export function registerPlugins(app) {
  // Initialize AWS Amplify
  configureAmplify()

  // Register Vue plugins
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
}
