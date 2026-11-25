
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export function validatePassword(password: string) {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");

  const derivedKey = (await scrypt(
    password,
    salt,
    64
  )) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
) {
  const parts = storedHash.split(":");

  if (parts.length !== 2) {
    return false;
  }

  const [salt, hash] = parts;

  if (!/^[0-9a-f]{32}$/.test(salt) ||
      !/^[0-9a-f]{128}$/.test(hash)) {
    return false;
  }

  const derivedKey = (await scrypt(
    password,
    salt,
    64
  )) as Buffer;

  const storedKey = Buffer.from(hash, "hex");

  return timingSafeEqual(derivedKey, storedKey);
}
