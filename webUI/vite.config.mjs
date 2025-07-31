// Plugins
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Fonts from 'unplugin-fonts/vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// Utilities
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Determine if this is a development build
  const isDev = mode === 'development' || mode === 'dev'
  
  return {
    plugins: [
      VueRouter(),
      Layouts(),
      Vue({
        template: { transformAssetUrls },
      }),
      // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
      Vuetify({
        autoImport: true,
        styles: {
          configFile: 'src/styles/settings.scss',
        },
      }),
      Components(),
      Fonts({
        google: {
          families: [{
            name: 'Roboto',
            styles: 'wght@100;300;400;500;700;900',
          }],
        },
      }),
      AutoImport({
        imports: [
          'vue',
          VueRouterAutoImports,
          {
            pinia: ['defineStore', 'storeToRefs'],
          },
        ],
        eslintrc: {
          enabled: true,
        },
        vueTemplate: true,
      }),
    ],
    optimizeDeps: {
      exclude: [
        'vuetify',
        'vue-router',
        'unplugin-vue-router/runtime',
        'unplugin-vue-router/data-loaders',
        'unplugin-vue-router/data-loaders/basic',
      ],
    },
    define: { 
      'process.env': {},
      // Make environment variables available at build time
      __VITE_ENVIRONMENT__: JSON.stringify(env.VITE_ENVIRONMENT || mode),
      __VITE_DEBUG_MODE__: JSON.stringify(env.VITE_DEBUG_MODE || isDev.toString()),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('src', import.meta.url)),
      },
      extensions: [
        '.js',
        '.json',
        '.jsx',
        '.mjs',
        '.ts',
        '.tsx',
        '.vue',
      ],
    },
    server: {
      port: 3000,
      host: true, // Allow external connections
    },
    preview: {
      port: 3000,
      host: true,
    },
    build: {
      // Environment-specific build options
      sourcemap: isDev,
      minify: isDev ? false : 'esbuild',
      target: isDev ? 'esnext' : 'es2015',
      rollupOptions: {
        output: {
          // Environment-specific chunk naming
          chunkFileNames: isDev 
            ? 'assets/[name]-[hash].js'
            : 'assets/[name]-[hash].js',
          entryFileNames: isDev
            ? 'assets/[name]-[hash].js' 
            : 'assets/[name]-[hash].js',
          assetFileNames: isDev
            ? 'assets/[name]-[hash].[ext]'
            : 'assets/[name]-[hash].[ext]',
        },
      },
      // Increase chunk size warning limit for production
      chunkSizeWarningLimit: isDev ? 500 : 1000,
    },
    css: {
      preprocessorOptions: {
        sass: {
          api: 'modern-compiler',
        },
        scss: {
          api: 'modern-compiler',
        },
      },
      // Add environment-specific CSS handling
      devSourcemap: isDev,
    },
    // Environment-specific configuration
    envDir: './', // Look for .env files in the project root
    envPrefix: 'VITE_', // Only expose variables with VITE_ prefix
  }
})
