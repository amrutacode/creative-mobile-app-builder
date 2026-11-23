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

// CloudHike's social sign-in is a page navigation, not a fetch call (it can't
// carry the x-api-key header), so it redirects back with the token in the URL
// fragment instead of a response body.
export function signInWithSocial(provider: SocialProvider) {
  if (typeof window === "undefined") return;
  const to = `${window.location.origin}/`;
  window.location.href = `${process.env.NEXT_PUBLIC_AUTH_URL}/social/${provider}?to=${encodeURIComponent(to)}`;
}

export function consumeSocialRedirect(): { token: string | null; error: string | null } | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("token");
  const error = params.get("error");
  if (!token && !error) return null;

  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  if (token) setStoredToken(token);
  return { token, error };
}
