import { createAuthClient } from "better-auth/react";

const TOKEN_STORAGE_KEY = "cloudhike.sessionToken";

export function getStoredToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? undefined;
}

function setStoredToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

function clearStoredToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
  fetchOptions: {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_AUTH_PUBLISHABLE_KEY ?? "",
    },
    // CloudHike's Auth API lives on a different origin, so the session can't
    // ride on a same-site cookie — every request carries this bearer token instead.
    // `credentials: "omit"` is required too: CloudHike's CORS response uses a
    // wildcard origin, which browsers reject for credentialed ("include") requests.
    credentials: "omit",
    auth: {
      type: "Bearer",
      token: getStoredToken,
    },
    onSuccess: (context) => {
      const token = (context.data as { token?: string } | null)?.token;
      if (token) setStoredToken(token);
    },
  },
});

export async function signOut() {
  await authClient.signOut();
  clearStoredToken();
}

export type SocialProvider = "google" | "github";

const AUTH_ATTEMPT_PARAM = "authAttempt";
const AUTH_ATTEMPT_STORAGE_KEY = "cloudhike.authAttempt";

// CloudHike's social sign-in is a page navigation, not a fetch call (it can't
// carry the x-api-key header), so it redirects back with the token in the URL
// fragment instead of a response body.
export function signInWithSocial(provider: SocialProvider) {
  if (typeof window === "undefined") return;
  // An unguessable, single-use value tying the eventual callback to this
  // browser's own sign-in attempt — otherwise anyone who can get a victim's
  // browser to land on `#token=...` could have their token silently stored.
  const attempt = window.crypto.randomUUID();
  try {
    window.sessionStorage.setItem(AUTH_ATTEMPT_STORAGE_KEY, attempt);
  } catch {
    // sessionStorage unavailable (e.g. Safari private browsing) - the
    // callback below has nothing to match against, so it will reject.
  }
  const to = `${window.location.origin}/?${AUTH_ATTEMPT_PARAM}=${encodeURIComponent(attempt)}`;
  window.location.href = `${process.env.NEXT_PUBLIC_AUTH_URL}/social/${provider}?to=${encodeURIComponent(to)}`;
}

export function consumeSocialRedirect(): { token: string | null; error: string | null } | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const token = hashParams.get("token");
  const error = hashParams.get("error");
  if (!token && !error) return null;

  const returnedAttempt = new URLSearchParams(window.location.search).get(AUTH_ATTEMPT_PARAM);
  let expectedAttempt: string | null = null;
  try {
    expectedAttempt = window.sessionStorage.getItem(AUTH_ATTEMPT_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_ATTEMPT_STORAGE_KEY);
  } catch {
    // sessionStorage unavailable - no attempt to validate against, so reject below.
  }

  const cleanSearch = new URLSearchParams(window.location.search);
  cleanSearch.delete(AUTH_ATTEMPT_PARAM);
  const cleanSearchString = cleanSearch.toString();
  window.history.replaceState(
    null,
    "",
    window.location.pathname + (cleanSearchString ? `?${cleanSearchString}` : "")
  );

  if (!returnedAttempt || !expectedAttempt || returnedAttempt !== expectedAttempt) {
    return { token: null, error: "Sign-in could not be verified. Please try again." };
  }

  if (token) setStoredToken(token);
  return { token, error };
}
