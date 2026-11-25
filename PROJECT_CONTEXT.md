# Olive & Ember project context

Olive & Ember is a restaurant menu website built with Next.js App Router, React, TypeScript, Tailwind CSS, and Neon PostgreSQL. The local source is the basis for this document. The supplied repository is [saniyahaly/oliveember](https://github.com/saniyahaly/oliveember), and the supplied deployment is [oliveember.vercel.app](https://oliveember.vercel.app). The deployment address and parity with the local upgrade remain unverified.

## Architecture

| Area | Current behavior |
| --- | --- |
| Homepage | `src/app/page.tsx` displays responsive, read-only menu cards with dish images and a fallback for missing or failed images. It links to `/admin/login` in a new tab with `noopener noreferrer`. |
| Dashboard | `src/app/admin/page.tsx` verifies the session on the server. Its `MenuManagement.tsx` client component contains the add/edit forms, delete confirmation, feedback, and dish cards. Both forms have an optional Image URL field and a live preview. Both pages use `src/app/useMenu.ts` for menu reads and price formatting. |
| Menu API | `GET /api/menu` is public. `POST`, `PUT`, and `DELETE` reject cross-origin requests with 403 and return JSON 401 when the session is missing, expired, or revoked. Authorized requests must contain a JSON object. The API accepts numeric IDs and prices, prices with at most two decimal places, nonblank names up to 150 characters, and nonblank descriptions up to 5,000 characters. SQL is parameterized. Each mutation also checks and locks the active session row so a concurrent logout and write are ordered at the database. |
| Login | `/admin/login` has a Show/Hide password control. `POST /api/auth/login` compares server-side environment credentials and uses a shared Neon-backed throttle of 10 well-formed attempts per one-minute window. The single bucket applies to the single admin account across server instances. A burst of failed attempts can temporarily delay legitimate login. |
| Sessions and logout | `src/lib/auth.ts` signs random session IDs and verifies they have a corresponding unexpired database row. Cookies are HTTP-only, SameSite Strict, and Secure in production. Sessions last eight hours. Logout deletes the active session row before expiring the cookie. Expired rows are cleaned up on successful login. |

## Permanent account separation

Customer and administrator accounts are separate security domains. Future customer accounts must use their own database tables or store, login routes, authentication, session store and cookies, dashboard, and account management flows. The existing admin authentication and dashboard form the administrator domain.

Protected APIs authorize requests server-side against the appropriate session. Administrator routes accept only a verified administrator session. Customer registration, login, password changes, account recovery, and API requests must never grant administrator privileges, mint administrator sessions, or change administrator accounts. Client-supplied roles confer no privileges.

Table booking, ordering, password recovery, and future features must preserve these boundaries. Test that customer credentials and sessions cannot authorize admin-only operations.

## Local setup and database migration

Configure `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `SESSION_SECRET` privately on the server. The secret requires at least 32 characters. Apply [sql/001_admin_auth.sql](sql/001_admin_auth.sql) to the Neon database used by the app before testing login. It creates two auth tables and an expiry index. It leaves `menu_items` and its records intact. Existing stateless cookies require a fresh login.

Use a separate test database or an isolated PostgreSQL instance for write tests. Confirm that guests can read the menu, every guest write returns 401, authorized CRUD persists across fresh reads, and logout revokes the old session. Verify browser interactions and the migration against the intended Neon database before considering deployment.

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

All four required environment variable names were present locally. `.env.local` is ignored and untracked. A local scan of non-ignored files and reachable Git blobs found no matches for common credential patterns or the current local database URL, admin password, or signing secret.

The corrected origin is `saniyahaly/oliveember`. The latest release review confirmed GitHub defaulted to `master`, which was one merge commit ahead of local and remote `main` with no file changes between the tips. Vercel's Production Branch, production environment configuration, and Neon target still need confirmation. The configured Neon database has the image column. Its production counterpart still needs confirmation.

## Planned work

Dashboard password changes, ordering, and reservations are deferred. The password-change design must account for environment-backed credentials.
