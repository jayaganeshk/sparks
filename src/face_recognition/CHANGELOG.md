# Changelog

## [Unreleased]

### Removed
- **PINECONE_API_ENV environment variable**: Removed the `PINECONE_API_ENV` environment variable as it's no longer required with Pinecone client v3.0.0. The environment is now automatically determined by the Pinecone service.

### Changed
- **VectorStore constructor**: Updated `VectorStore` class constructor to only require `api_key` and `index_name` parameters, removing the `environment` parameter.
- **Lambda handler**: Simplified environment variable loading by removing `PINECONE_API_ENV`.
- **Deployment configuration**: Updated `lambda-deployment.json` to remove the `PINECONE_API_ENV` environment variable.
- **Documentation**: Updated README.md to reflect the removal of the environment variable requirement.
- **Tests**: Updated test cases to match the new VectorStore constructor signature.

### Technical Details
- The Pinecone client v3.0.0+ automatically determines the appropriate environment/region based on the API key and index configuration
- This simplifies the deployment process by reducing the number of required environment variables
- No functional changes to the face recognition capabilities

## Previous Changes
- Initial implementation of face recognition service
- Docker containerization setup
- AWS Lambda integration
- Pinecone vector store integration
- DynamoDB person management
- S3 image processing utilities
