# Sparks Marketing Website

A modern, responsive marketing website for Sparks - an AI-powered event photo sharing platform.

## Features

- **Modern Design**: Clean, professional design with smooth animations
- **Responsive**: Fully responsive design that works on all devices
- **SEO Optimized**: Proper meta tags, structured data, and semantic HTML
- **Performance**: Optimized for fast loading and smooth user experience
- **Accessibility**: Built with accessibility best practices

## Tech Stack

- **Framework**: Nuxt.js 3
- **Styling**: Tailwind CSS
- **Fonts**: Inter & Plus Jakarta Sans (Google Fonts)
- **Icons**: Heroicons
- **Animations**: CSS animations with Tailwind utilities

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd sparks-marketing-website
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run generate` - Generate static site
- `npm run preview` - Preview production build

## Project Structure

```
marketing-website/
├── components/           # Vue components
│   ├── TheHeader.vue    # Navigation header
│   ├── HeroSection.vue  # Hero section
│   ├── ProblemSection.vue
│   ├── SolutionSection.vue
│   ├── FeaturesSection.vue
│   ├── UseCasesSection.vue
│   ├── TestimonialsSection.vue
│   ├── PricingSection.vue
│   ├── CTASection.vue
│   └── TheFooter.vue    # Footer
├── pages/               # Page components
│   └── index.vue        # Homepage
├── assets/              # Static assets
│   └── css/
│       └── main.css     # Global styles
├── public/              # Public assets
└── nuxt.config.ts       # Nuxt configuration
```

## Sections Overview

### 1. Hero Section
- Compelling headline and value proposition
- Interactive phone mockup showing the app
- Primary and secondary CTAs
- Key statistics

### 2. Problem Section
- Identifies pain points in current event photo sharing
- Visual representation of problems
- Statistics highlighting the issues

### 3. Solution Section
- 3-step process explanation
- Before/after comparison
- Visual process flow

### 4. Features Section
- 6 key features with detailed descriptions
- Technology stack showcase
- Enterprise-grade infrastructure highlights

### 5. Use Cases Section
- Major use cases (weddings, corporate events, etc.)
- Visual examples and testimonials
- Additional use case grid

### 6. Testimonials Section
- Customer testimonials with ratings
- Usage statistics
- Video testimonial section

### 7. Pricing Section
- 3-tier pricing structure
- Feature comparison
- FAQ section
- Money-back guarantee

### 8. CTA Section
- Final call-to-action
- Trust indicators
- Feature highlights

### 9. Footer
- Company information
- Navigation links
- Newsletter signup
- Social media links

## Customization

### Colors
The color scheme can be customized in `tailwind.config.js`:
- Primary: Blue tones
- Secondary: Orange tones  
- Accent: Purple tones

### Fonts
Fonts are configured in `nuxt.config.ts` using Google Fonts:
- Primary: Inter
- Display: Plus Jakarta Sans

### Content
All content can be easily modified in the respective Vue components. The content is structured to be easily maintainable and SEO-friendly.

## SEO Features

- Proper meta tags and Open Graph data
- Structured data (JSON-LD)
- Semantic HTML structure
- Optimized images and loading
- Canonical URLs

## Performance Optimizations

- Lazy loading for images
- Optimized animations
- Minimal JavaScript bundle
- CSS optimization
- Font optimization

## Deployment

### Static Generation
```bash
npm run generate
```

### Server-Side Rendering
```bash
npm run build
npm run preview
```

The site can be deployed to any static hosting service (Netlify, Vercel, AWS S3, etc.) or server that supports Node.js.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Support

For technical support or questions about this application, please contact the development team.

## Copyright

© 2025 Sparks. All rights reserved. This is proprietary software.
