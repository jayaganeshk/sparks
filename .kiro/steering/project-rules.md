---
inclusion: always
---

# Event Organizer Project Rules

## Architecture Overview

Multi-platform event organizer with strict component boundaries:
- **Flutter mobile app**: `event_organizer_app/` - Dart/Flutter for iOS/Android
- **Vue.js web UIs**: `webUI/` (primary) and `event_organizer_web_ui/` (secondary) - Vue 3 + Vite
- **Express.js API**: `src/express-api/` - Node.js REST API server
- **AWS Lambda functions**: `src/lambdas/` - Serverless business logic
- **Infrastructure**: `terraform/` - AWS resources via Terraform modules

## Critical Requirements

### ID Generation
- **ALWAYS use KSUID for all new IDs** - never UUID or other formats
- Import from existing KSUID utilities in the codebase

### Database Operations
- **DynamoDB single table design** - follow existing PK/SK patterns in `src/dynamodb.md`
- **Implement pagination** for all list endpoints using DynamoDB pagination tokens
- **Read `data_model.md` and `src/dynamodb.md`** before making any database changes
- Use consistent naming: `PK`, `SK`, `GSI1PK`, `GSI1SK`
- Update `src/dynamodb.md` when adding new queries or modifying schema

### Platform Boundaries
- **Flutter code**: Only in `event_organizer_app/` directory
- **Vue.js code**: Use `webUI/` as primary, `event_organizer_web_ui/` as secondary
- **Shared business logic**: Implement in Lambda functions or Express API routes
- **Infrastructure**: All AWS resources defined in `terraform/` modules

## API Development Standards

### REST Endpoints
- Follow RESTful conventions: GET /resource, POST /resource, PUT /resource/:id, DELETE /resource/:id
- Use appropriate HTTP status codes (200, 201, 400, 404, 500)
- Maintain backward compatibility - never break existing endpoints
- Document changes in component README files

### Response Format Standards
```javascript
// Success response with data
{ data: [...], pagination: { nextToken: "..." } }

// Error response format
{ error: { message: "...", code: "...", details: {...} } }
```

### Error Handling
- Standardize error response formats across all routes
- Include meaningful error messages and appropriate HTTP status codes
- Log errors consistently for debugging

## Code Style and Conventions

### File Organization
- Follow existing naming patterns within each component
- Group related functionality in the same directory
- Maintain established folder structures
- Use descriptive file names that indicate purpose

### Testing
- Write tests for new API endpoints in corresponding `.test.js` files
- Follow existing test patterns and structure
- Test both success and error scenarios

## Development Workflow

### Before Making Changes
1. **Always read** `data_model.md` for data structure context
2. **Check** `src/dynamodb.md` for existing database patterns
3. **Review** component README files for API contracts
4. **Examine** existing similar code for patterns to follow

### Configuration Management
- Use `.env` files for environment-specific variables
- Reference existing deployment scripts in `terraform/`
- Test changes locally before deployment
- Follow existing environment setup patterns

### Terraform Operations
- Use existing deployment scripts without modification
- Follow patterns documented in `terraform/README.md`
- Keep deployment processes simple and consistent
- No custom validation scripts

## Documentation Requirements

**Always update these files when making changes:**
- `data_model.md` - for any data structure modifications
- `src/dynamodb.md` - for database schema changes or new query patterns
- Component README files - for API route modifications or new endpoints
- Add inline code comments for complex business logic