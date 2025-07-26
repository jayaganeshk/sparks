/**
 * AWS Amplify configuration
 */
import { Amplify } from 'aws-amplify';

export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {

        region: import.meta.env.VITE_AWS_REGION,

        // Amazon Cognito User Pool ID
        userPoolId: import.meta.env.VITE_USER_POOL_ID,

        // Amazon Cognito Web Client ID
        userPoolClientId: import.meta.env.VITE_USER_POOL_WEB_CLIENT_ID,

        // Amazon Cognito Identity Pool ID (optional)
        identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
      }
    },

    // API Gateway configuration
    API: {
      endpoints: [
        {
          name: 'api',
          endpoint: import.meta.env.VITE_API_ENDPOINT,
          region: import.meta.env.VITE_AWS_REGION
        }
      ]
    }
  });
}
