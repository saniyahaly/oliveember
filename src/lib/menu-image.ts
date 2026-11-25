export const IMAGE_URL_MAX_LENGTH = 2048;
const INVALID_URL = "Enter a direct HTTPS image URL.";
const UNSPLASH_PAGE = "This is an Unsplash webpage. Use a direct image URL from images.unsplash.com.";

export function validateMenuImageUrl(value: unknown): { url: string | null; error: string | null } {
  if (value === null || value === undefined) return { url: null, error: null };
  if (typeof value !== "string") return { url: null, error: INVALID_URL };

  const input = value.trim();
  if (!input) return { url: null, error: null };
  if (
    !/^https:\/\//i.test(input) ||
    input.length > IMAGE_URL_MAX_LENGTH ||
    /[\s\\]/.test(input)
  ) {
    return { url: null, error: INVALID_URL };
  }

  try {
    const url = new URL(input);
    const host = url.hostname;

    // Require a public-style DNS name and disallow embedded credentials and custom ports.
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/i.test(host) ||
      /\.(?:local|localhost|internal|test|invalid|example|onion)$/i.test(host) ||
      url.href.length > IMAGE_URL_MAX_LENGTH
    ) {
      return { url: null, error: INVALID_URL };
    }

    if (
      (host === "unsplash.com" || host === "www.unsplash.com") &&
      /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:photos|collections|s\/photos)(?:\/|$)/i.test(decodeURIComponent(url.pathname))
    ) {
      return { url: null, error: UNSPLASH_PAGE };
    }

    return { url: url.href, error: null };
  } catch {
    return { url: null, error: INVALID_URL };
  }
}
