# Olive & Ember

Olive & Ember is a restaurant website built with Next.js App Router, React, TypeScript, Tailwind CSS, and Neon PostgreSQL. Visitors can browse the menu and build a cart without signing in. Customers can reserve tables, place dine-in or takeaway orders, and view their history. Pay at Restaurant is the only payment method. The navbar opens the admin login in a separate tab, and signed-in admins can add, edit, and delete dishes at `/admin`.

## Local setup

1. Run `npm ci` from the project root.
2. Configure these server-side variables in your private `.env.local`.

   | Variable | Purpose |
   | --- | --- |
   | `DATABASE_URL` | Neon PostgreSQL connection string |
   | `SESSION_SECRET` | Cookie signing secret, at least 32 characters |

3. For a new database, create the menu table if it is missing.

   ```sql
   CREATE TABLE IF NOT EXISTS menu_items (
       id SERIAL PRIMARY KEY,
       name VARCHAR(150) NOT NULL,
       price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
       description TEXT NOT NULL
   );
   ```

4. Apply [the auth migration](sql/001_admin_auth.sql) on the same database and schema the app uses. It creates two auth tables and an expiry index while preserving `menu_items` and its records.
5. For an existing project database, apply migrations 002 (menu images), 003 (customer auth limits), and 004 (restaurant operations) in order as needed. Confirm that the existing customer and admin credential tables are present. See the detailed rollout sequence in PROJECT_CONTEXT.md.
6. Run `npm run dev` and open `http://localhost:3000`.

## Menu and authentication

| Route | Behavior |
| --- | --- |
| `/` | Public, read-only restaurant menu |
| `/admin/login` | Admin sign-in with a Show/Hide password control |
| `/admin` | Protected dashboard with menu forms and logout |
| `GET /api/menu` | Public menu read |
| `POST /api/menu`, `PUT /api/menu`, `DELETE /api/menu` | Session-protected menu writes. Missing, expired, or revoked sessions receive JSON `401`; cross-origin requests receive `403`. |
| `POST /api/auth/login` | Checks the stored administrator password hash and applies the shared Neon-backed login limit |
| `POST /api/auth/logout` | Revokes the active database session and clears its browser cookie |

Sessions use signed HTTP-only cookies, expire after eight hours, and are verified against Neon by the dashboard and menu write handlers. Cookies are SameSite Strict and Secure in production. The login limit allows 10 well-formed attempts per minute across app instances.

## Reservations and orders

- Customers use /reservations, /checkout, and their account history to manage their own bookings and orders.
- Admins use /admin/restaurant to manage tables, hours, reservations, order status, and recorded payments. The menu editor remains at /admin.
- Pending bookings hold tables. Dine-in orders require a customer-owned confirmed reservation that is in progress. Order totals come from current database prices.

## Checks and deployment prerequisites

```bash
npx tsc --noEmit
npm run lint
npm run build
```

A fresh checkout may need Next.js to generate route types before the standalone TypeScript check. The production build also checks types.

- Confirm the Vercel project is linked to the intended GitHub repository and its Production Branch points to the intended branch. Local `main` tracks `origin/main`. Vercel's branch selection must be checked separately.
- Configure DATABASE_URL and SESSION_SECRET in Vercel Production. Use the Neon connection for the intended database and branch, and verify that the auth migration is present there.
- Verify that the intended deployment commit includes the auth routes, dashboard, helpers, and migration. Keep environment files and credential values out of Git.
- After an authorized deployment, verify public reads, guest rejection, admin sign-in, disposable CRUD and refresh, and logout. Use a test database for write checks where available.

Use an isolated Neon branch for Preview and apply [003](sql/003_customer_login_limits.sql) before [004](sql/004_restaurant_operations.sql). Keep Preview and Production database endpoints and session secrets separate.

See [the Preview deployment gate](PROJECT_CONTEXT.md#preview-deployment-gate), [the Production release checklist](PROJECT_CONTEXT.md#production-release-checklist), and [the rollback strategy](PROJECT_CONTEXT.md#rollback-strategy) before publishing the feature branch.

## Screenshots

The repository includes classroom screenshots of the earlier menu-management UI.

- [Menu items](screenshots/menu%20items.png)
- [Edit form](screenshots/edit%20menu.png)
- [Edited dish](screenshots/edited%20menu%20item.png)
- [Delete confirmation](screenshots/delete%20menu.png)
