# Olive & Ember project context

Olive & Ember is a restaurant menu website built with Next.js App Router, React, TypeScript, Tailwind CSS, and Neon PostgreSQL. The local source is the basis for this document. The supplied repository is [saniyahaly/oliveember](https://github.com/saniyahaly/oliveember), and the supplied deployment is [oliveember.vercel.app](https://oliveember.vercel.app). The deployment address and parity with the local upgrade remain unverified.

## Architecture

| Area | Current behavior |
| --- | --- |
| Homepage | `src/app/page.tsx` displays responsive, read-only menu cards with dish images and a fallback for missing or failed images. It links to `/admin/login` in a new tab with `noopener noreferrer`. |
| Dashboard | `src/app/admin/page.tsx` verifies the session on the server. Its `MenuManagement.tsx` client component contains the add/edit forms, delete confirmation, feedback, and dish cards. Both forms have an optional Image URL field and a live preview. Both pages use `src/app/useMenu.ts` for menu reads and price formatting. |
| Menu API | `GET /api/menu` is public. `POST`, `PUT`, and `DELETE` reject cross-origin requests with 403 and return JSON 401 when the session is missing, expired, or revoked. Authorized requests must contain a JSON object. The API accepts numeric IDs and prices, prices with at most two decimal places, nonblank names up to 150 characters, and nonblank descriptions up to 5,000 characters. SQL is parameterized. Each mutation also checks and locks the active session row so a concurrent logout and write are ordered at the database. |
| Login | `/admin/login` has a Show/Hide password control. `POST /api/auth/login` verifies the existing hash in the single admin_credentials row and uses a shared Neon-backed throttle of 10 well-formed attempts per one-minute window. The single bucket applies to the single admin account across server instances. A burst of failed attempts can temporarily delay legitimate login. |
| Sessions and logout | `src/lib/auth.ts` signs random session IDs and verifies they have a corresponding unexpired database row. Cookies are HTTP-only, SameSite Strict, and Secure in production. Sessions last eight hours. Logout deletes the active session row before expiring the cookie. Expired rows are cleaned up on successful login. |

## Permanent account separation

Customer and administrator accounts are separate security domains. Customer accounts use customer_accounts, customer_sessions, the olive_customer_session cookie, /login, and /account. Admin accounts use admin_credentials, admin_sessions, the olive_admin_session cookie, /admin/login, and /admin. Login and account management are separate. The existing admin authentication and dashboard form the administrator domain.

Protected APIs authorize requests server-side against the appropriate session. Administrator routes accept only a verified administrator session. Customer registration, login, password changes, account recovery, and API requests must never grant administrator privileges, mint administrator sessions, or change administrator accounts. Client-supplied roles confer no privileges.

Table booking, ordering, password recovery, and future features must preserve these boundaries. Test that customer credentials and sessions cannot authorize admin-only operations.

## Local setup and database migration

Configure `DATABASE_URL` and `SESSION_SECRET` privately on the server. See the credential cutover notes below before removing the legacy environment entries. The secret requires at least 32 characters. Apply [sql/001_admin_auth.sql](sql/001_admin_auth.sql) to the Neon database used by the app before testing login. It creates two auth tables and an expiry index. It leaves `menu_items` and its records intact. Existing stateless cookies require a fresh login.

Use a separate test database or an isolated PostgreSQL instance for write tests. Confirm that guests can read the menu, every guest write returns 401, authorized CRUD persists across fresh reads, and logout revokes the old session. Verify browser interactions and the migration against the intended Neon database before considering deployment.

## Administrator password management

The sole row in admin_credentials is authoritative. The login route fails closed if it is absent or ambiguous. It never uses environment credentials or creates an admin row. On 2026-11-26 a read-only preflight confirmed that the configured Neon database contains one admin row and its username and password match the local environment credentials. No production password or session was modified.

The protected /admin/settings form checks the current password and password strength. Credential rotation and invalidation of all admin sessions run in one transaction. A login holding an older password hash cannot create an admin session after rotation. The active admin cookie is cleared, and customer sessions are unaffected. The admin change-password throttle uses a separate bucket from admin login.

The corrected customer login handler queries only customer_accounts and writes only customer_sessions and customer_login_limits. Apply [sql/003_customer_login_limits.sql](sql/003_customer_login_limits.sql) to the intended database before deploying the corrected customer login. This additive migration does not change existing rows. The configured Neon database already has admin_credentials and its updated_at column.

Keep DATABASE_URL and SESSION_SECRET in Vercel. No new Vercel variables are required. Leave ADMIN_USERNAME and ADMIN_PASSWORD in place until the target database has been independently verified and the replacement login is confirmed on Production. They are unused by the upgraded code and can be removed after verification. Retire any reachable legacy deployment that still authenticates against environment credentials before changing the admin password. Use a separate Neon database for Preview write tests.

Isolated PostgreSQL and headless Chrome tests on 2026-11-26 verified password replacement, rejection of the former environment password, concurrent rotation, admin session revocation, customer session continuity, guest rejection, admin logout, and menu image preservation. No deployed login or live password rotation was performed.

## Menu images

Apply [sql/002_menu_item_images.sql](sql/002_menu_item_images.sql) before running the image-enabled API against a target database. The migration only adds the nullable `image_url` column and leaves existing dishes intact. It is safe to rerun on the intended schema.

GET, POST, and PUT return the image URL with the menu item. POST accepts a missing or blank URL. PUT preserves an existing image when the field is omitted and clears it when given null or a blank string. Only authenticated admins can write. The API validates absolute HTTPS URLs with a DNS hostname and rejects embedded credentials, IP literals, and custom ports. The browser loads images directly with no referrer, and cards and previews handle unavailable images. Use a direct HTTPS image URL, such as one from `images.unsplash.com`. The admin forms and API reject known Unsplash photo, collection, and search page paths with guidance. Other URL formats are checked without fetching the resource, so the browser preview and fallback handle URLs that do not serve an image. There is no upload or storage service.

## Menu photo collection

On 2026-11-25, the configured Neon database contained eight dishes. A guarded transaction filled seven empty image fields. Readback confirmed all eight dish IDs, names, descriptions, and prices were preserved and the existing image for item 13 was retained.

| ID | Dish | Source and credit | License | Direct image |
| --- | --- | --- | --- | --- |
| 4 | Grilled Chicken Steak | [Shixart1985 (Nenad Stojković)](https://commons.wikimedia.org/wiki/File:Grilled_chicken_served_with_creamy_mashed_potatoes_and_fresh_vegetables_undefined.jpg) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [JPEG, 117 KB](https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/Grilled_chicken_served_with_creamy_mashed_potatoes_and_fresh_vegetables_undefined.jpg/960px-Grilled_chicken_served_with_creamy_mashed_potatoes_and_fresh_vegetables_undefined.jpg) |
| 7 | Lasagna | [Edible Encyclopaedia](https://commons.wikimedia.org/wiki/File:Lasagna-Raj%27sSpanishcafe%2CKolkata-WestBengal-02.jpg) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [JPEG, 43 KB](https://upload.wikimedia.org/wikipedia/commons/3/32/Lasagna-Raj%27sSpanishcafe%2CKolkata-WestBengal-02.jpg) |
| 8 | Classic Beef Burger | [Gezer Amorim](https://www.pexels.com/photo/close-up-of-a-cheeseburger-23910856/) | [Pexels License](https://www.pexels.com/license/) | [JPEG, 171 KB](https://images.pexels.com/photos/23910856/pexels-photo-23910856.jpeg?auto=compress&cs=tinysrgb&w=1000) |
| 9 | Chicken Alfredo Pasta | [Kemal Can](https://www.pexels.com/photo/creamy-chicken-alfredo-pasta-on-marble-table-37336685/) | [Pexels License](https://www.pexels.com/license/) | [JPEG, 99 KB](https://images.pexels.com/photos/37336685/pexels-photo-37336685.jpeg?auto=compress&cs=tinysrgb&w=1000) |
| 10 | Margherita Pizza | [Christopher Seufert](https://www.pexels.com/photo/close-up-of-a-baked-pizza-with-basil-and-mozzarella-7531438/) | [Pexels License](https://www.pexels.com/license/) | [JPEG, 125 KB](https://images.pexels.com/photos/7531438/pexels-photo-7531438.jpeg?auto=compress&cs=tinysrgb&w=1000) |
| 11 | Grilled Chicken Steak | [Arif Mark](https://www.pexels.com/photo/delicious-chicken-with-mashed-potatoes-and-salad-37269998/) | [Pexels License](https://www.pexels.com/license/) | [JPEG, 135 KB](https://images.pexels.com/photos/37269998/pexels-photo-37269998.jpeg?auto=compress&cs=tinysrgb&w=1000) |
| 12 | Chocolate Lava Cake | [Aida Shukuhi](https://www.pexels.com/photo/chocolate-lava-cake-sprinkled-with-powdered-sugar-20377567/) | [Pexels License](https://www.pexels.com/license/) | [JPEG, 108 KB](https://images.pexels.com/photos/20377567/pexels-photo-20377567.jpeg?auto=compress&cs=tinysrgb&w=1000) |
| 13 | Mushroom Beef meltdown | Unsplash CDN, existing image. Original source page and photographer unverified. | Unverified for this specific file | [Existing JPEG, 2.18 MB](https://images.unsplash.com/photo-1568901346375-23c9450c58cd) |

The seven new images returned HTTPS 200 and image/jpeg without login, passed the application URL validator, and were inspected visually. The Pexels License permits commercial web use and makes attribution optional. The two Wikimedia photos require attribution and a license link. The footer links to the public Image Credits page, which lists the author, source, license, and crop notice for each photograph. Menu cards display the dish details without inline credits. The lasagna photo is under ShareAlike terms. Any adapted copy must keep a compatible license. The Image Credits page also credits the pizza photographer in response to the source profile's credit request. Item 13's existing image depicts a beef cheeseburger, and the mushroom topping could not be confirmed.

The local production build returned all eight saved URLs through GET /api/menu. Chrome loaded all eight real images at 390, 800, and 1280 pixels with no card overflow, and a simulated image failure showed the fallback. Guest writes returned 401 and the guest dashboard redirected. TypeScript, ESLint, and the production build passed. The two previously recorded Vercel domains returned a menu payload without image_url when checked, so image rendering was verified on the local build only.

## Verification

On 2026-11-25, the production build, TypeScript check, and ESLint passed. An HTTP integration run used the built Next.js server and an isolated PGlite PostgreSQL database behind a local Neon HTTP adapter. It applied the migration twice and verified public reads, guest write rejection, malformed input, cross-origin rejection, incorrect and correct credentials, dashboard access, cookie flags, disposable CRUD with fresh reads, revoked and expired tokens, logout during a pending write, and the login throttle and reset.

The image milestone passed the production build, standalone TypeScript check, and ESLint. The isolated PostgreSQL suite applied the image migration twice, preserved a pre-migration dish, and verified URL validation, CRUD readback, and the difference between omitting and clearing an image URL. A headless Chrome run verified live Add and Edit previews, broken and missing image fallbacks, one/two/three-column layouts, and the login, add, edit, delete, and logout flows. Image requests used controlled fixtures. The later live-data check verified the image column and all eight image URLs on the configured Neon database.

## Deployment readiness

On 2026-11-25, the local production build, standalone TypeScript check, and ESLint passed. A production-build smoke test against the configured Neon database returned 200 for the public homepage and menu API, JSON 401 for guest POST, PUT, and DELETE, 403 for all three cross-origin writes, and a 307 redirect for guest dashboard access. The catalog confirmed both auth tables, the expiry index, and the existing menu table in the app's `public` schema. This check performed no authenticated writes or live login attempts.

The four legacy environment variable names were present locally at the time of that check. `.env.local` is ignored and untracked. A local scan of non-ignored files and reachable Git blobs found no matches for common credential patterns or the current local database URL, admin password, or signing secret.

The corrected origin is `saniyahaly/oliveember`. The latest release review confirmed GitHub defaulted to `master`, which was one merge commit ahead of local and remote `main` with no file changes between the tips. Vercel's Production Branch, production environment configuration, and Neon target still need confirmation. The configured Neon database has the image column. Its production counterpart still needs confirmation.

## Restaurant operations

| Customer routes | Behavior |
| --- | --- |
| /cart, /checkout | Guests can build a local cart. Checkout requires a customer session and shows a server quote before submission. The order number links to its details. |
| /reservations, /account/reservations | Customers choose an available table and time, request a reservation, and view or cancel their own upcoming bookings. |
| /account/orders | Customers can view their own orders, line items, totals, and payment status and cancel eligible orders. |
| /admin/restaurant | Admin-only overview, tables and rules, reservation management, and order and payment management. The existing /admin menu forms and /admin/settings remain separate. |

The customer APIs are GET/POST /api/reservations and GET/POST /api/orders. The admin API is GET/POST /api/admin/restaurant. Each verifies its own server-side session. Customer queries scope records by the authenticated customer ID. Mutations check request origin and JSON content type, validate input, and use parameterized SQL. Customer reservation and order creation have separate per-account database throttles. Admin and customer authentication remain separate, including credentials, sessions, cookies, and rate limits. Customer password changes revoke that customer’s sessions atomically.

[sql/004_restaurant_operations.sql](sql/004_restaurant_operations.sql) adds restaurant_tables, restaurant_booking_settings, restaurant_reservations, restaurant_orders, restaurant_order_items, and restaurant_action_limits. It also defines restaurant_available_slots. The existing customer and menu records are referenced by foreign keys. Menu deletion clears the order-line menu reference and preserves the name and price snapshots. Restaurant tables are deactivated through admin controls so booking and order history stays linked. The migration creates no sample tables, orders, or reservations.

- The initial time zone is Asia/Karachi. Booking uses the configured daily opening and closing times, time zone, notice, horizon, and reservation duration. The booking grid uses 30-minute intervals. Hours must fit within one local day. Pending and confirmed reservations hold the table until cancellation, completion, or the end of the reservation time. PostgreSQL prevents overlapping active reservations through an exclusion constraint. Reassignment respects capacity, table status, overlapping bookings, and existing order history.
- Dine-in requires a customer-owned, confirmed reservation that is currently in progress at an active table. Takeaway needs no reservation. Quote and order creation use current menu prices, and the database stores order totals and line-item snapshots. An idempotency key prevents retries from producing another order. If the price changes before submission, checkout requires a fresh review.
- Pay at Restaurant is the payment method. Admins record payment after collecting it. Completion requires payment and the appropriate ready or served status. Customers can cancel pending unpaid orders only within the configured window. Paid orders cannot be cancelled through this UI. The recorded-sales metric uses payments collected on the restaurant’s local date.
- Staff and customer history lists show up to 100 records per request. Staff can filter by date and status. Overnight or per-weekday opening hours, online payments, automated reminders, and account recovery are outside this implementation.

## Restaurant operations verification

On 2026-11-26, standalone TypeScript, ESLint, the Next.js production build, and the Git whitespace check passed. Disposable PostgreSQL fixtures applied migrations 001–004 twice and preserved the pre-existing fixture data. The exclusion constraint rejected overlap, and simultaneous HTTP booking requests produced one successful reservation and one conflict. The API suite also verified account isolation, session revocation after password changes, customer logout, table capacity and deactivation, reservation ownership and transitions, server-calculated totals and price confirmation, duplicate order retries, dine-in eligibility, order snapshots after menu deletion, payment recording, and real dashboard totals.

Headless Chrome verified admin password changes, customer login return to checkout, cart quantity and removal controls, order confirmation and history, reservation requests and cancellations, and staff navigation. Customer and admin layouts passed overflow checks at 390, 800, and 1280 pixels. The operations and credential changes were tested against isolated PostgreSQL, and the configured Neon database was inspected only with read-only catalog queries. Those initial implementation checks ran locally on feature/restaurant-operations.

The final release audit verified the existing foreign-key types by read-only catalog inspection and confirmed migrations 003 and 004 were absent on the configured Neon database. Disposable PostgreSQL applied 003 before 004, reran the migrations, and rejected mismatched customer/reservation/table combinations, overlapping bookings, and duplicate table names. The updated API and Chrome suites passed session isolation and revocation, stale-body logout, oversized request, booking, checkout, order history and snapshots, table reassignment, payment, and dashboard checks. TypeScript, ESLint, and the production build passed. No migration or production write was performed. Vercel setup and isolated Neon Preview binding remain unverified.

## Preview deployment gate

GitHub reports master as the default branch. Vercel Production branch tracking and environment assignment require authenticated project access. A GitHub default branch alone does not establish which branch Vercel deploys to Production. There is no verified isolated Neon Preview binding for this workspace.

1. In Neon, create a schema-only branch for the release audit or restore a schema-only export into a separate project. Use a separate endpoint and database role and only synthetic menu rows, customer accounts, and a disposable administrator hash. A normal branch copies data, including account records and hashes, so it is unsuitable for this Preview. Before opening a SQL Editor tab, verify the branch name and endpoint are the isolated ones.
2. Verify the existing base schema has customer_accounts with a UUID primary key, customer_sessions, admin_credentials with a single disposable hashed account, admin_sessions, admin_login_limits, and menu_items with an integer primary key, numeric price, and nullable image_url. Apply 001 and 002 in order only if their base additions are absent. If using a blank database, load the base schema first. Migrations 001–004 alone do not create credential or menu tables.
3. Run 003, then 004 in separate executions from the isolated SQL Editor. Run the verification SQL below. Use the application database role to verify that it can read the new tables and execute the availability function. Run the isolated signup, login, booking, order, and password-change smoke tests using disposable fixtures.
4. In Vercel Project Settings, confirm the connected repository and the branch listed under Environments → Production → Branch Tracking. Confirm feature/restaurant-operations is outside Production and any production domain branch assignments. In the Preview environment, set branch-scoped DATABASE_URL to the isolated Neon endpoint and SESSION_SECRET to a distinct random secret of at least 32 characters. Check shared, inherited, branch-specific, and integration-injected variables for a production database or signing key. Production-only secrets and legacy administrator environment variables must be absent from Preview.
5. After both the branch and environment gates are confirmed, push only the feature branch with git push -u origin feature/restaurant-operations. Verify the resulting deployment is labeled Preview, runs the reviewed commit, and uses synthetic data. Leave its status as Preview. Do not merge, promote, or deploy to the live domain without approval.

### Read-only migration verification

```sql
SELECT name, to_regclass('public.' || name) AS relation
FROM (VALUES ('customer_login_limits'), ('restaurant_tables'),
  ('restaurant_booking_settings'), ('restaurant_reservations'),
  ('restaurant_orders'), ('restaurant_order_items'),
  ('restaurant_action_limits')) AS required(name);

SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('public.restaurant_reservations'::regclass, 'public.restaurant_orders'::regclass)
  AND conname IN ('restaurant_reservation_no_overlap', 'restaurant_orders_reservation_owner');

SELECT to_regclass('public.restaurant_table_name_unique') AS table_name_index,
       to_regprocedure('public.restaurant_available_slots(date,integer)') AS availability_function,
       (SELECT count(*) FROM public.restaurant_booking_settings WHERE id) AS settings_rows;
```

Require seven present relations, both validated constraints, the table-name uniqueness index and availability function, and one settings row. Keep the original customer and menu schemas intact. Migration 004 fails atomically if previously staged restaurant orders violate the new ownership constraint. Investigate any such rows before applying it.

## Production release checklist

1. Obtain approval. Record the deployment currently serving the live domain, its Git commit and branch, and the Vercel Production Branch setting. Select the reviewed commit, verify the Preview checks, and verify that neither branch settings nor environment configuration changed since review.
2. Record a Neon backup or point-in-time restore reference within the plan’s recovery window. Confirm there is an approved recovery path. Prepare a known-good rollback build that keeps the secure authentication changes, and confirm its database compatibility.
3. Compare Vercel Production's DATABASE_URL endpoint privately with the intended Neon project, branch, and database. Keep SESSION_SECRET unchanged. Confirm the target has the required base schema and a single valid database administrator credential before cutting over.
4. In the Production Neon SQL Editor, after approval, run 003 then 004. Run the read-only verification SQL above. Confirm both migrations succeeded and existing account and menu data are accessible. Stop if verification fails.
5. Deploy the reviewed commit through the confirmed production branch and verify the live domain resolves to that deployment. Check menu access and images first, then customer login, cart and checkout, administrator login and management. Exercise reservations and orders with approved disposable records only. Check payment recording and user separation. Configure the actual restaurant hours and tables.
6. Verify anonymous and customer-only requests cannot access admin operations. Restrict or retire older reachable deployments that still accept legacy environment credentials. Remove those legacy variables only after verified cutover. Confirm the old deployments cannot be used as alternate authentication entry points before any administrator password rotation.

## Rollback strategy

For an application regression, use the pretested rollback build with database-backed admin login and separated customer authentication. Recheck the deployment’s environment because Vercel Instant Rollback restores that build with its original environment variables. Avoid rolling back to a version with the legacy password path or incorrect customer role handling.

Keep the additive database schema and any reservations, orders, and payment records written since release. For a migration error, inspect the transaction outcome and fix forward. If a database restore is needed, restore to a separate branch first and compare it with the active branch. Reconcile writes made after the restore point before any approved cutover. Dropping operation tables or replacing a live database with an older snapshot would discard records.

## Planned work

Account recovery is deferred.
