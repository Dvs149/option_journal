# Project Documentation Sync Rule

Whenever any code changes, bug fixes, schema modifications, API updates, or feature additions are performed in this repository, the agent MUST update and synchronize the following documentation files before completing the task:

1. **CHANGELOG.md**:
   - Log all notable features, architectural updates, enhancements, and bug fixes under the latest version or `[Unreleased]`.
   - Follow the Keep a Changelog standard with clear bullet points.

2. **KNOWN_ISSUES.md**:
   - Record any newly resolved bugs under `Section 2: Resolved Issues` with Issue ID, description, resolution date, and resolution details.
   - Document any new technical debt, edge cases, or platform constraints discovered.

3. **FEATURES.md**:
   - Update Section 1 (Feature Status Matrix) and Section 2 (In-Depth Feature Breakdown) whenever features, user workflows, UI modes, or components are added or modified.

4. **API_DOCUMENTATION.md**:
   - Keep all REST endpoints, query parameters, request bodies, and response shapes up to date whenever controllers, routes, or services are added or changed.

5. **DATABASE_SCHEMA.md**:
   - Update table definitions, column types, nullability, defaults, indexes, and entity-relationship diagrams whenever migrations or Eloquent model attributes change.

6. **TODO.md**:
   - Mark completed tasks as `[x]` and add new actionable items to the appropriate priority tier.

7. **PROJECT_CONTEXT.md & README.md**:
   - Maintain the architectural summary, functional subsystems list, and tech stack information.

8. **graphify knowledge graph**:
   - Run `graphify update .` after any code modifications to keep `graphify-out/` AST synchronized.
