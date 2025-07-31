# Sparks WebUI

The front-end application for the Sparks photo sharing platform, built with Vue.js 3, Vuetify, and Vite.

## Tech Stack

- **Framework**: Vue.js 3 with Composition API
- **UI Library**: Vuetify 3 (Material Design components)
- **Build Tool**: Vite
- **State Management**: Pinia
- **Authentication**: AWS Amplify Auth
- **Routing**: Vue Router with auto-generated routes
- **Styling**: SCSS with Vuetify theming

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- AWS account with configured Cognito User Pool

## Installation

1. Clone the repository and navigate to the webUI directory:
   ```bash
   cd webUI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (see Environment Configuration section below)

## Environment Configuration

The application supports multiple environments using Vite's native mode system. Environment variables are loaded from `.env` files based on the specified mode.

### Environment Files

- `.env.dev` - Development environment configuration
- `.env.prod` - Production environment configuration
- `.env` - Default/fallback environment configuration

### Required Environment Variables

```bash
# API Configuration
VITE_API_BASE_URL=https://your-api-gateway.execute-api.region.amazonaws.com

# AWS Cognito Configuration
VITE_AWS_REGION=your-aws-region
VITE_USER_POOL_ID=your-user-pool-id
VITE_USER_POOL_WEB_CLIENT_ID=your-client-id
VITE_IDENTITY_POOL_ID=your-identity-pool-id

# CloudFront Distribution
VITE_CLOUDFRONT_DOMAIN=https://your-cloudfront-domain.cloudfront.net

# API Gateway Configuration
VITE_API_ENDPOINT=https://your-api-gateway.execute-api.region.amazonaws.com/stage

# S3 Bucket for Uploads
VITE_S3_BUCKET=your-s3-bucket-name

# Application Configuration
VITE_BATCH_UPLOAD_LIMIT=10
```

## Development

### Start Development Server

```bash
# Default environment
npm run dev

# Development environment (.env.dev)
npm run dev:dev

# Production environment (.env.prod)
npm run dev:prod
```

The development server will start at `http://localhost:5173`

## Building for Production

### Build Commands

```bash
# Build with default environment
npm run build

# Build with development environment (.env.dev)
npm run build:dev

# Build with production environment (.env.prod)
npm run build:prod

# Build with custom mode and source maps
npm run build -- --mode prod --sourcemap

# Build with custom output directory
npm run build -- --outDir custom-dist
```

### Build Output

The build process generates optimized static files in the `dist/` directory:
- Minified and compressed JavaScript bundles
- Optimized CSS with vendor prefixes
- Compressed images and fonts
- Source maps (when `--sourcemap` flag is used)

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run dev:dev` | Start development server with `.env.dev` |
| `npm run dev:prod` | Start development server with `.env.prod` |
| `npm run build` | Build for production |
| `npm run build:dev` | Build with development environment |
| `npm run build:prod` | Build with production environment and source maps |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint and fix issues |

## Project Structure

```
webUI/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable Vue components
│   ├── layouts/          # Layout components
│   ├── pages/            # Page components (auto-routed)
│   ├── stores/           # Pinia stores
│   ├── styles/           # Global styles and themes
│   ├── utils/            # Utility functions
│   ├── App.vue           # Root component
│   └── main.js           # Application entry point
├── .env.dev              # Development environment variables
├── .env.prod             # Production environment variables
├── vite.config.mjs       # Vite configuration
└── package.json          # Dependencies and scripts
```

## Features

- **Responsive Design**: Mobile-first approach with Vuetify components
- **Authentication**: Secure user authentication via AWS Cognito
- **Photo Management**: Upload, view, and organize photos
- **Image Processing**: Automatic thumbnail generation and compression
- **Face Recognition**: AI-powered face tagging
- **Infinite Scroll**: Efficient photo grid with lazy loading
- **Real-time Updates**: Live photo streams and notifications

## Deployment

### AWS Amplify with Terraform (Recommended)

The project uses Terraform to manage AWS Amplify infrastructure and supports manual deployment of built files.

#### Prerequisites
- Terraform infrastructure deployed (`terraform apply` in the `/terraform` directory)
- AWS CLI configured with appropriate permissions

#### Deploy from Project Root
```bash
# Deploy development build
./deploy-ui.sh dev

# Deploy production build  
./deploy-ui.sh prod
```

#### Deploy from webUI Directory
```bash
# Get Amplify App ID from Terraform output
cd ../terraform
AMPLIFY_APP_ID=$(terraform output -raw amplify_app_id)

# Return to webUI directory and deploy
cd ../webUI
./deploy.sh prod $AMPLIFY_APP_ID
```

### Manual S3/CloudFront Deployment

1. Build the application:
   ```bash
   npm run build:prod
   ```

2. Upload the `dist/` directory contents to your S3 bucket or CDN

## Development Guidelines

- Use Composition API for new components
- Follow Vue.js style guide conventions
- Implement proper error handling and loading states
- Use TypeScript for better type safety
- Write unit tests for critical functionality
- Optimize images and assets for web delivery

## Troubleshooting

### Common Issues

1. **Build fails with environment variables**: Ensure all required `VITE_*` variables are set in your environment file

2. **Authentication errors**: Verify AWS Cognito configuration and ensure the User Pool and Identity Pool are properly configured

3. **API calls failing**: Check that `VITE_API_BASE_URL` and `VITE_API_ENDPOINT` are correctly set

4. **Images not loading**: Verify S3 bucket permissions and CloudFront distribution settings

### Debug Mode

Enable debug logging by setting:
```bash
VITE_DEBUG=true
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the coding standards
3. Test your changes thoroughly
4. Submit a pull request with a clear description

## License

This project is part of the Sparks photo sharing platform.
