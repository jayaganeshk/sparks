---
trigger: always_on
---

# Project-Specific Rules

This document outlines the specific rules and conventions for the 'sparks' project. As your AI assistant, I will follow these rules to help maintain code quality and consistency.

## 1. API Development

**Rule:** When you modify any file inside the `src/express-api/` directory, you must also update the API documentation in `src/express-api/README.md` to reflect the changes.

**Reasoning:** Keeping API documentation synchronized with its implementation is crucial for team collaboration and maintainability.

## 2. DynamoDB Table Management

**Rule:** When you modify any file inside the `terraform/modules/dynamodb/` directory, you must also update the table schemas and details in `src/dynamodb.md`.

**Reasoning:** Centralized and up-to-date documentation for database schemas prevents confusion and errors.

## 3. Terraform Module Creation

**Rule:** When you create a new subdirectory within `terraform/modules/`, you must also create a `README.md` file inside that new directory.

**Reasoning:** Every reusable infrastructure module should be self-documenting, explaining its purpose, inputs, and outputs to encourage adoption and proper use.
