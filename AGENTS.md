<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## Olive & Ember project instructions

- Read `PROJECT_CONTEXT.md` at the start of a session. Check its claims against the current source before relying on them. Update it when implementation, architecture, or verification status changes.
- Keep public menu reads available without login. Require a verified admin session in every menu write handler. Keep dish management in the protected dashboard as the authorization work is completed.
- Preserve existing behavior and Neon records when making changes. Use compatible migrations and disposable data in a dedicated test environment for write checks.
- Keep environment values, passwords, database connection strings, and session secrets out of responses, logs, and committed files. Document variable names only.
- Keep work local unless the user explicitly asks to push or deploy. Report what was verified and name any outstanding runtime checks.

## Permanent account separation

- Keep customer and administrator account data in separate database tables or stores. Keep their login routes, authentication, session stores and cookies, dashboards, and account management flows separate.
- Require server-side authorization at each protected API endpoint. Admin endpoints must verify a valid admin session. Customer sessions and client-supplied roles or claims must never grant admin access.
- Customer registration, login, password changes, account recovery, and API requests must never create or modify administrator accounts, issue administrator sessions, or elevate privileges.
- Apply this separation to all future features, including table booking, ordering, and password recovery. Verify that customer credentials and sessions are rejected by admin-only routes and operations.
