<template>
  <v-bottom-navigation v-model="value" grow>
    <v-btn
      class="pa-1"
      v-for="navButton in navButtons"
      :key="navButton.text"
      :to="navButton.route"
    >
      <v-icon class="ma-0 pa-0">{{ navButton.icon }}</v-icon>
      {{ navButton.text }}
    </v-btn>
  </v-bottom-navigation>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAppStore } from "@/store/app";

const route = useRoute();
const appStore = useAppStore();
const value = ref(0);

const navButtons = computed(() => {
  let navItems = [
    { text: "Home", icon: "mdi-home-outline", route: "/" },
    {
      text: "Uploaded By",
      icon: "mdi-folder-account-outline",
      route: "/folder",
    },
    {
      text: "Albums",
      icon: "mdi-image-album",
      route: "/albums",
    },
    {
      text: "People",
      icon: "mdi-account-multiple-outline",
      route: "/persons",
    },
    {
      text: "Profile",
      icon: "mdi-account-outline",
      route: "/profile",
    },
  ];

  let liveStreamObj = {
    text: "Live Stream",
    icon: "mdi-youtube",
    route: "/liveStream",
  };

  const isLiveStreamEnabled = appStore.isLiveStreamEnabled;
  console.log("isLiveStreamEnabled", isLiveStreamEnabled);

  if (isLiveStreamEnabled) {
    console.log("Live Stream configured");
    navItems.splice(2, 0, liveStreamObj);
  }

  // Add organizer dashboard link if user is an organizer
  const user = appStore.user;
  const groups = user?.signInUserSession?.idToken?.payload?.['cognito:groups'] || [];
  if (groups.includes('Organizers')) {
    navItems.push({
      text: 'Manage',
      icon: 'mdi-cogs',
      route: '/organizer',
    });
  }

  return navItems;
});

watch(
  () => route.path,
  () => {
    console.log("route changed", route.path);

    if (route.path.includes("/folder")) {
      value.value = 1;
    } else if (route.path.includes("/albums")) {
      value.value = 2;
    } else if (route.path.includes("/persons")) {
      value.value = 3;
    } else if (route.path.includes("/profile")) {
      value.value = 4;
    } else if (route.path.includes("/organizer")) {
      value.value = navButtons.value.findIndex(b => b.route === '/organizer');
    } else {
      value.value = 0;
    }

    console.log("btn value", value.value);
  }
);

onMounted(async () => {
  await appStore.checkIfLiveStreamAvailable();
});
</script>
