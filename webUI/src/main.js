/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue';


// Styles
import 'unfonts.css'

const app = createApp(App)

registerPlugins(app)

// Check user session before mounting the app
import { useAppStore } from '@/store/app';
const appStore = useAppStore();

// Register service worker for image caching
if ('serviceWorker' in navigator) {
  console.log('Service Worker is supported by this browser');
  navigator.serviceWorker.register('./service-worker.js')
    .then(registration => {
      console.log('Service Worker registered successfully:', registration.scope);
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
} else {
  console.warn('Service Worker is not supported by this browser');
}

appStore.checkSession().then(() => {
  app.mount('#app');
});
