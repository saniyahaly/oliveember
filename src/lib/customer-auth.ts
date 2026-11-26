
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db";

export const CUSTOMER_COOKIE = "olive_customer_session";

export const CUSTOMER_SESSION_DURATION = 60 * 60 * 24 * 7;

type Customer = {
  id: string;
  username: string;
  email: string;
};

export function generateCustomerToken() {
  return randomBytes(32).toString("hex");
}

export function hashCustomerToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE)?.value;

  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return null;
  }

  const tokenHash = hashCustomerToken(token);
  const sql = getDatabase();

  const rows = await sql`
    SELECT
      c.id,
      c.username,
      c.email
    FROM public.customer_sessions AS s
    JOIN public.customer_accounts AS c
      ON c.id = s.customer_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  return {
    id: String(rows[0].id),
    username: String(rows[0].username),
    email: String(rows[0].email),
  };
}

export async function allowCustomerAuthAttempt(bucket: string, limit: number) {
  const sql = getDatabase();
  const [attempt] = await sql`
    INSERT INTO public.customer_login_limits (bucket, window_started_at, attempts)
    VALUES (${bucket}, NOW(), 1)
    ON CONFLICT (bucket) DO UPDATE
    SET attempts = CASE WHEN customer_login_limits.window_started_at <= NOW() - INTERVAL '1 minute'
                        THEN 1 ELSE customer_login_limits.attempts + 1 END,
        window_started_at = CASE WHEN customer_login_limits.window_started_at <= NOW() - INTERVAL '1 minute'
                                 THEN NOW() ELSE customer_login_limits.window_started_at END
    WHERE customer_login_limits.window_started_at <= NOW() - INTERVAL '1 minute'
       OR customer_login_limits.attempts < ${limit}
    RETURNING attempts
  `;
  return Boolean(attempt);
}
