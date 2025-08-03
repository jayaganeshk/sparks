# Sparks Marketing Website Infrastructure

This directory contains the AWS infrastructure setup for the Sparks marketing website, including a contact form API with Cloudflare Turnstile protection.

## Architecture Overview

The infrastructure consists of:

- **AWS Lambda Function**: Handles contact form submissions with Turnstile verification
- **Lambda Function URL**: Provides HTTP endpoint for the contact form API
- **AWS Amplify**: Hosts the Nuxt.js marketing website with manual deployment control
- **Amazon CloudFront**: CDN distribution with custom behaviors for API routing
- **Amazon SNS**: Sends email notifications for contact form submissions
- **IAM Roles & Policies**: Secure access management for all resources

## Features

- ✅ **Serverless Contact Form API** with Lambda Function URL
- ✅ **Vue-Turnstile Integration** for seamless Cloudflare Turnstile in Vue.js
- ✅ **AWS SDK v3** for modern, efficient SNS email notifications
- ✅ **CloudFront Distribution** with custom API routing (`/api/contact`)
- ✅ **Manual Amplify Deployment** with controlled build triggers
- ✅ **CORS Configuration** for secure cross-origin requests
- ✅ **Environment Variable Management** for secure configuration
- ✅ **Error Handling & Logging** with comprehensive error responses

## Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** installed and configured with appropriate permissions
2. **Cloudflare Turnstile Keys** (site key and secret key)
3. **Email address** for receiving contact form notifications

### Required AWS Permissions

Your AWS user/role needs permissions for:
- CloudFormation (full access)
- Lambda (create, update, configure)
- Amplify (create, update apps)
- CloudFront (create, update distributions)
- SNS (create topics, subscriptions)
- IAM (create roles, policies)

## Quick Start

### 1. Get Cloudflare Turnstile Keys

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to "Turnstile" in the sidebar
3. Create a new site
4. Copy the **Site Key** and **Secret Key**

### 2. Deploy Infrastructure

Run the deployment script:

```bash
cd infrastructure
./deploy.sh
```

The script will prompt you for:
- Email for notifications
- Cloudflare Turnstile secret key

### 3. Update Environment Variables

After deployment, update your `.env` files with the output values:

```bash
# In marketing-website/.env
NUXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
NUXT_PUBLIC_CONTACT_API_URL=https://your-cloudfront-domain.cloudfront.net/api/contact
```

### 4. Deploy Website Manually

Since auto-build is disabled, you'll need to manually deploy the website to Amplify:

```bash
# Install Amplify CLI if not already installed
npm install -g @aws-amplify/cli

# Deploy to Amplify (from marketing-website directory)
amplify publish
```

Alternatively, you can trigger a manual build through the AWS Console:
1. Go to AWS Amplify Console
2. Select your app
3. Go to the branch (main)
4. Click "Run build"

### 5. Configure SNS Email Subscription

Check your email and confirm the SNS subscription to receive contact form notifications.

## Manual Deployment

If you prefer manual deployment:

```bash
# Validate template
aws cloudformation validate-template \
  --template-body file://cloudformation-template.yaml \
  --region us-east-1

# Deploy stack
aws cloudformation create-stack \
  --stack-name sparks-marketing-website \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=NotificationEmail,ParameterValue="your-email@example.com" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Wait for completion
aws cloudformation wait stack-create-complete \
  --stack-name sparks-marketing-website \
  --region us-east-1

# Update Lambda environment variables
aws lambda update-function-configuration \
  --function-name sparks-contact-form-handler \
  --environment Variables='{"TURNSTILE_SECRET_KEY":"your-secret-key"}' \
  --region us-east-1
```

## CloudFront Behavior Configuration

The CloudFront distribution includes a custom behavior for the contact API:

- **Path Pattern**: `/api/contact`
- **Origin**: Lambda Function URL
- **Methods**: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
- **Caching**: Disabled for API requests
- **CORS**: Enabled with proper headers

This allows the frontend to call `/api/contact` through CloudFront, which routes to the Lambda function.

## Contact Form API

### Endpoint
```
POST https://your-cloudfront-domain.cloudfront.net/api/contact
```

### Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Example Corp",
  "eventType": "wedding",
  "attendees": "51-100",
  "message": "Looking for a demo...",
  "captchaToken": "turnstile-response-token"
}
```

### Response
```json
{
  "message": "Contact form submitted successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Responses
- `400`: Missing required fields or captcha verification failed
- `500`: Internal server error

## Environment Variables

### Frontend (Nuxt.js)
- `NUXT_PUBLIC_TURNSTILE_SITE_KEY`: Cloudflare Turnstile site key
- `NUXT_PUBLIC_CONTACT_API_URL`: Contact form API endpoint

### Backend (Lambda)
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key
- `SNS_TOPIC_ARN`: SNS topic for email notifications
- `CORS_ORIGIN`: Allowed origin for CORS requests

## Monitoring & Troubleshooting

### CloudWatch Logs
Monitor Lambda function logs:
```bash
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/sparks-contact-form"
```

### Common Issues

1. **CORS Errors**: Ensure CloudFront origin is properly configured
2. **Turnstile Verification Failed**: Check secret key configuration
3. **Email Not Received**: Confirm SNS subscription in email
4. **Amplify Build Failed**: Check GitHub token permissions

### Testing the API

Test the contact form API directly:

```bash
curl -X POST https://your-cloudfront-domain.cloudfront.net/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Test message",
    "captchaToken": "test-token"
  }'
```

Or use the provided test script:

```bash
./test-api.sh https://your-cloudfront-domain.cloudfront.net/api/contact
```

## Security Features

- **Cloudflare Turnstile**: Prevents spam and bot submissions
- **CORS Protection**: Restricts API access to authorized origins
- **Input Validation**: Server-side validation of all form fields
- **Rate Limiting**: Inherent through Turnstile verification
- **Secure Headers**: Proper CORS and security headers

## Cost Optimization

The infrastructure is designed for cost efficiency:

- **Lambda**: Pay-per-request pricing
- **Amplify**: Free tier for small sites
- **CloudFront**: Free tier includes 1TB data transfer
- **SNS**: Pay-per-message (very low cost)

Estimated monthly cost for moderate usage: $5-15

## Cleanup

To remove all resources:

```bash
aws cloudformation delete-stack \
  --stack-name sparks-marketing-website \
  --region us-east-1
```

## Support

For issues or questions:
1. Check CloudWatch logs for Lambda function errors
2. Verify environment variables are correctly set
3. Test API endpoints directly
4. Review CloudFront distribution settings

## Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Manual Deploy   │───▶│   AWS Amplify    │───▶│   CloudFront    │
│   (Local)       │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Contact Form    │───▶│ Lambda Function  │───▶│   Amazon SNS    │
│ (Turnstile)     │    │      URL         │    │ (Email Notify)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

This infrastructure provides a complete, scalable, and secure solution for the Sparks marketing website with integrated contact form functionality.
