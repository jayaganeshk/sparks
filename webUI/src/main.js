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

appStore.checkSession().then(() => {
  app.mount('#app');
});
