# CloudFormation to Terraform Migration Checklist

This document tracks the migration of all AWS resources from the original `cloudFormation.yaml` to the new modular Terraform configuration.

## Parameters, Conditions, and Outputs

### Parameters

| CFN Parameter                  | Terraform Variable              | Status      | Notes                                                                 |
| ------------------------------ | ------------------------------- | ----------- | --------------------------------------------------------------------- |
| `Prefix`                       | `prefix`                        | ✅ Complete | Used throughout the configuration.                                    |
| `UserPoolDomain`               | `user_pool_domain`              | ✅ Complete | Used in the `cognito` module.                                         |
| `ImageUriForFaceRecognition`   | `image_uri_for_face_recognition`| ✅ Complete | Used in the `lambda` module.                                          |
| `useCustomDomainForUi`         | `use_custom_domain_for_ui`      | ✅ Complete | Used in the `cloudfront` module for conditional logic.                |
| `UiCustomDomain`               | `ui_custom_domain`              | ✅ Complete | Used in the `cloudfront` module.                                      |

### Conditions

| CFN Condition                     | Terraform Implementation        | Status      | Notes                                                                 |
| --------------------------------- | ------------------------------- | ----------- | --------------------------------------------------------------------- |
| `useCustomDomainForUiCondition`   | `var.use_custom_domain_for_ui`  | ✅ Complete | Implemented using a ternary operator in the `cloudfront` module.      |

### Outputs

*The CloudFormation template does not have an `Outputs` section.*

## Resource Migration Status

| CloudFormation Resource              | Terraform Module | Status      | Notes                                                                 |
| -------------------------------------- | ---------------- | ----------- | --------------------------------------------------------------------- |
| **DynamoDB**                           | `dynamodb`       |             |                                                                       |
| `masterTable`                          | `dynamodb`       | ✅ Complete | Translated to `aws_dynamodb_table`.                                   |
| **SNS & SQS**                          | `sns_sqs`        |             |                                                                       |
| `imageThumbnailCreationTopic`          | `sns_sqs`        | ✅ Complete | Translated to `aws_sns_topic`.                                        |
| `BucketToSNSPermission`                | `sns_sqs`        | ✅ Complete | Handled via `aws_sns_topic_policy`.                                   |
| `faceRecogntionQueue`                  | `sns_sqs`        | ✅ Complete | Translated to `aws_sqs_queue` (FIFO).                                 |
| `imageThumbnailGenerationQueue`        | `sns_sqs`        | ✅ Complete | Translated to `aws_sqs_queue` (Standard).                             |
| `imageThumbnailGenerationQueue...`     | `sns_sqs`        | ✅ Complete | Handled via `aws_sqs_queue_policy` and `aws_sns_topic_subscription`.    |
| **S3**                                 | `s3`             |             |                                                                       |
| `S3Bucket`                             | `s3`             | ✅ Complete | Translated to `aws_s3_bucket`.                                        |
| `S3BucketPolicy`                       | `cloudfront`     | ✅ Complete | Handled via `aws_s3_bucket_policy` in the CloudFront module.          |
| `S3BucketForLogs`                      | `s3`             | ✅ Complete | Translated to `aws_s3_bucket`.                                        |
| `S3BucketPolicyForLogBucket`           | `cloudfront`     | ⬜️ N/A    | Not needed; CloudFront logging handles this automatically.            |
| **IAM**                                | `iam`            |             |                                                                       |
| `lambdaRole`                           | `iam`            | ✅ Complete | Translated to `aws_iam_role` and `aws_iam_role_policy`.               |
| `CognitoAuthRole`                      | `iam`            | ✅ Complete | Translated to `aws_iam_role` and `aws_iam_role_policy`.               |
| **Cognito**                            | `cognito`        |             |                                                                       |
| `CognitoUserPool`                      | `cognito`        | ✅ Complete | Translated to `aws_cognito_user_pool`.                                |
| `CognitoUserPoolDomain`                | `cognito`        | ✅ Complete | Translated to `aws_cognito_user_pool_domain`.                         |
| `CognitoUserPoolClient` (local & prod) | `cognito`        | ✅ Complete | Translated to `aws_cognito_user_pool_client`.                         |
| `CognitoIdentityPool`                  | `cognito`        | ✅ Complete | Translated to `aws_cognito_identity_pool`.                            |
| `CognitoIdentityPoolRoleAttachment`    | `cognito`        | ✅ Complete | Translated to `aws_cognito_identity_pool_roles_attachment`.           |
| **Lambda**                             | `lambda`         |             |                                                                       |
| `cognitoSignUpTrigger`                 | `lambda`         | ✅ Complete | Translated to `aws_lambda_function`.                                  |
| `sharpLayer`                           | `lambda`         | ✅ Complete | Translated to `aws_lambda_layer_version`.                             |
| `imageCompressionLambda`               | `lambda`         | ✅ Complete | Translated to `aws_lambda_function`.                                  |
| `faceRecognitionS3Trigger`             | `lambda`         | ✅ Complete | Translated to `aws_lambda_function`.                                  |
| `imageThumbnailLayer`                  | `lambda`         | ✅ Complete | Translated to `aws_lambda_layer_version`.                             |
| `imageThumbnailGeneration`             | `lambda`         | ✅ Complete | Translated to `aws_lambda_function`.                                  |
| `webEventLogs`                         | `lambda`         | ✅ Complete | Translated to `aws_lambda_function` and `aws_lambda_function_url`.      |
| `faceRecognitionTagging`               | `lambda`         | ✅ Complete | Translated to `aws_lambda_function` (container image).                |
| **Amplify**                            | `amplify`        |             |                                                                       |
| `AmplifyApp`                           | `amplify`        | ✅ Complete | Translated to `aws_amplify_app`.                                      |
| **CloudFront**                         | `cloudfront`     |             |                                                                       |
| `UiDistribution`                       | `cloudfront`     | ✅ Complete | Translated to `aws_cloudfront_distribution`.                          |
| `imageDistribution`                    | `cloudfront`     | ✅ Complete | Translated to `aws_cloudfront_distribution`.                          |
| `cloudfrontoriginaccessControl`        | `cloudfront`     | ✅ Complete | Translated to `aws_cloudfront_origin_access_control`.                 |
| **CloudWatch**                         | `cloudwatch`     |             |                                                                       |
| `myQueryDefinition`                    | `cloudwatch`     | ✅ Complete | Translated to `aws_cloudwatch_query_definition`.                      |
| `CwDashboard`                          | `cloudwatch`     | ✅ Complete | Translated to `aws_cloudwatch_dashboard`.                             |
