---
inclusion: always
---

# Event Organizer Project Rules

## Architecture Overview

Multi-platform event organizer with these components:

- **Flutter mobile app**: `event_organizer_app/` - Dart/Flutter for mobile platforms
- **Vue.js web UIs**: `webUI/` (primary) and `event_organizer_web_ui/` (secondary) - Vue 3 + Vite
- **Express.js API**: `src/express-api/` - Node.js REST API server
- **AWS Lambda functions**: `src/lambdas/` - Serverless business logic
- **Infrastructure**: `terraform/` - AWS resources managed via Terraform

## Required Reading Before Changes

Always consult these files before making modifications:
- `data_model.md` - Core data structures and relationships
- `src/dynamodb.md` - Database schema and access patterns
- Component-specific README files for API changes

## Database Rules

**DynamoDB Single Table Design**
- Follow existing patterns in `src/dynamodb.md`
- Use consistent PK/SK naming conventions
- Maintain existing access patterns for queries and GSI usage
- Update `src/dynamodb.md` when modifying table structure or queries

## Code Organization

**Platform Separation**
- Flutter code stays in `event_organizer_app/`
- Vue.js code in `webUI/` (primary) or `event_organizer_web_ui/`
- Shared business logic belongs in Lambda functions or Express API
- Infrastructure code in `terraform/` using modules

**File Structure**
- Follow existing naming conventions
- Keep related functionality grouped
- Use established folder patterns

## API Development

**REST Conventions**
- Follow RESTful patterns for all endpoints
- Use consistent error response formats across all routes
- Maintain backward compatibility when modifying existing endpoints
- Document all route changes in relevant README files

## Environment & Deployment

**Configuration**
- Use `.env` files for environment-specific settings
- Reference existing deployment scripts in `terraform/` directory
- Test changes locally before deployment

**Terraform Operations**
- Use existing deployment scripts directly - do not create validation scripts
- Consult `terraform/README.md` for commands (no lock file present)
- Keep deployment processes simple and follow established patterns

## Documentation Updates

When making changes, update:
- `data_model.md` for schema/data structure changes
- `src/dynamodb.md` for database modifications
- README files for API route changes