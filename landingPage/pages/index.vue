<template>
  <div>
    <TheHeader />
    <HeroSection />
    <ProblemSection />
    <SolutionSection />
    <FeaturesSection />
    <UseCasesSection />
    <TestimonialsSection />
    <CTASection />
    <TheFooter />
  </div>
</template>

<script setup>
// SEO Meta
useHead({
  title: "Sparks - Open Source AI Photo Sharing for Events | Web App Available",
  meta: [
    {
      name: "description",
      content:
        "Open source AI-powered photo sharing platform for events. Automatically organize photos by people using face recognition. Web app available now, mobile apps coming soon.",
    },
    {
      name: "keywords",
      content:
        "event photos, photo sharing, AI photo organization, face recognition, web app, Vue.js, AWS serverless, enterprise photo management, open source, GitHub",
    },
    {
      property: "og:title",
      content: "Sparks - AI Photo Sharing for Events",
    },
    {
      property: "og:description",
      content:
        "AI-powered photo sharing that automatically organizes event photos by people. Web app available now.",
    },
    {
      property: "og:image",
      content: "/og-image.jpg",
    },
    {
      property: "og:url",
      content: "https://sparks.deonte.in",
    },
    {
      name: "twitter:card",
      content: "summary_large_image",
    },
    {
      name: "twitter:title",
      content: "Sparks - AI Photo Sharing for Events",
    },
    {
      name: "twitter:description",
      content:
        "AI-powered photo sharing that automatically organizes event photos by people. Web app available now.",
    },
    {
      name: "twitter:image",
      content: "/og-image.jpg",
    },
  ],
  link: [
    {
      rel: "canonical",
      href: "https://sparks.deonte.in",
    },
  ],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Sparks",
        description:
          "AI-powered photo sharing platform that automatically organizes event photos by people using advanced face recognition technology.",
        url: "https://sparks.deonte.in",
        applicationCategory: "Photography",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Enterprise-grade platform - professional solution",
        },
        featureList: [
          "AI Face Recognition",
          "Photo Upload",
          // 'Smart Photo Grid', // UPCOMING FEATURE
          "People Organization",
          "Uploader Folders",
          // 'Live Stream Integration (Optional)', // UPCOMING FEATURE
          "Enterprise Support",
        ],
        softwareVersion: "1.0",
        releaseNotes: "Web application available. Mobile apps coming soon.",
      }),
    },
  ],
});
</script>
