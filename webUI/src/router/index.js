/**
 * router/index.ts
 *
 * Copyright (c) 2022-present, Vuetify, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Composables
import { createRouter, createWebHistory } from 'vue-router';
import { useAppStore } from '@/store/app';
import { organizerGuard } from './guards';

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/pages/index.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'organizer',
        name: 'OrganizerDashboard',
        component: () => import('@/pages/organizer/Dashboard.vue'),
        meta: { requiresAuth: true, requiresOrganizer: true },
      },
      {
        path: 'organizer/upload',
        name: 'OrganizerUpload',
        component: () => import('@/pages/organizer/Upload.vue'),
        meta: { requiresAuth: true, requiresOrganizer: true },
      },
      {
        path: 'organizer/album/:id',
        name: 'AlbumDetails',
        component: () => import('@/pages/organizer/AlbumDetails.vue'),
        meta: { requiresAuth: true, requiresOrganizer: true },
      },
      {
        path: 'forbidden',
        name: 'Forbidden',
        component: () => import('@/pages/Forbidden.vue'),
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/pages/profile.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'photo/:id',
        name: 'PhotoDetail',
        component: () => import('@/pages/photo/[id].vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'persons',
        name: 'Persons',
        component: () => import('@/pages/persons.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'persons/:id',
        name: 'PersonFolder',
        component: () => import('@/pages/persons/[id].vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'folder',
        name: 'Folder',
        component: () => import('@/pages/folder.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'folder/:email',
        name: 'UserFolder',
        component: () => import('@/pages/folder/[email].vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'livestream',
        name: 'LiveStream',
        component: () => import('@/pages/liveStream.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/pages/auth/login.vue'),
        meta: { guest: true },
      },
      {
        path: 'signup',
        name: 'Signup',
        component: () => import('@/pages/auth/signup.vue'),
        meta: { guest: true },
      },
      {
        path: 'forgot-password',
        name: 'ForgotPassword',
        component: () => import('@/pages/auth/forgot-password.vue'),
        meta: { guest: true },
      },
      {
        path: 'confirm-signup/:email',
        name: 'ConfirmSignup',
        props: true,
        component: () => import('@/pages/auth/confirm-signup.vue'),
        meta: { guest: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const appStore = useAppStore();

  // Check session on initial load
  if (from.name === undefined && !appStore.isAuthenticated) {
    await appStore.checkSession();
  }

  const isAuthenticated = appStore.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  }
  
  // Check for organizer-only routes
  if (to.meta.requiresOrganizer) {
    const user = appStore.user;
    const groups = user?.signInUserSession?.idToken?.payload?.['cognito:groups'] || [];
    if (!groups.includes('Organizers')) {
      return next({ name: 'Forbidden' });
    }
  }
  
  if (to.meta.guest && isAuthenticated) {
    return next({ name: 'Home' });
  } else {
    return next();
  }
});

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (!to?.fullPath) {
      window.location.reload();
    }
    console.error(err)
  }
})

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})

export default router
