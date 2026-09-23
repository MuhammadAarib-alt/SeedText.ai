import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { emailOtp } from "./auth/emailOtp";
import { internal } from "./_generated/api";

/**
 * Google sign-in via Google Identity Services.
 *
 * The client renders Google's "Sign in with Google" button, which returns a
 * short-lived ID token (a signed JWT). That token is posted to the
 * `google` auth provider here and verified server-side against Google's
 * public keys — no shared secret involved.
 *
 * Verification (all enforced in `verifyGoogleIdToken`):
 *   1. RS256 signature against Google's published JWKS keys
 *   2. `iss` is accounts.google.com
 *   3. `aud` matches our OAuth client ID (someone else's Google token is rejected)
 *   4. `exp` is in the future (Google issues ~1-hour tokens)
 *   5. `email_verified` is true — we only accept verified Google emails
 */
export const googleProvider = ConvexCredentials({
  id: "google",
  authorize: async (credentials, ctx) => {
    // The client calls signIn("google", { idToken }) — those params arrive
    // here directly (see handleCredentials in @convex-dev/auth).
    const idToken = (credentials as { idToken?: string } | undefined)?.idToken;
    if (typeof idToken !== "string" || idToken.length < 20) return null;

    const profile = await verifyGoogleIdToken(idToken, ctx);

    const userId: any = await ctx.runMutation(
      internal.googleAuth.getOrCreateUser,
      {
        email: profile.email,
        name: profile.name,
        image: profile.picture,
      },
    );

    return { userId, sessionId: undefined } as any;
  },
});

// ── Google ID token verification ────────────────────────────────────────────

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/** Cache Google's public keys briefly — avoids a fetch on every sign-in. */
let jwksCache: { keys: JsonWebKey[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

function base64UrlToBytes(segment: string): Uint8Array<ArrayBuffer> {
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJwtHeader(token: string): { kid?: string; alg?: string } {
  const header = new TextDecoder().decode(base64UrlToBytes(token.split(".")[0]));
  return JSON.parse(header);
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = new TextDecoder().decode(
    base64UrlToBytes(token.split(".")[1]),
  );
  return JSON.parse(payload);
}

async function getGoogleJwks(): Promise<JsonWebKey[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const response = await fetch(GOOGLE_JWKS_URL, {
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Google's signing keys (${response.status})`);
  }
  const jwks = (await response.json()) as { keys: JsonWebKey[] };
  jwksCache = { keys: jwks.keys, fetchedAt: Date.now() };
  return jwks.keys;
}

type GoogleProfile = {
  email: string;
  name?: string;
  picture?: string;
};

/**
 * Verify a Google ID token's signature and claims. Throws on any failure —
 * `authorize` treats every error as a rejected sign-in by returning null.
 */
async function verifyGoogleIdToken(
  token: string,
  ctx: any,
): Promise<GoogleProfile> {
  const clientId = process.env.AUTH_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "Google sign-in is not configured: missing AUTH_GOOGLE_CLIENT_ID env var.",
    );
  }

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed Google ID token.");

  const header = decodeJwtHeader(token);
  if (header.alg !== "RS256") {
    throw new Error(`Unexpected Google token algorithm: ${header.alg}`);
  }

  const jwks = await getGoogleJwks();
  const jwk = jwks.find((key) => (key as { kid?: string }).kid === header.kid);
  if (!jwk) throw new Error("Google signing key not recognized.");

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw new Error("Google ID token signature is invalid.");

  const payload = decodeJwtPayload(token);

  const issuer = String(payload.iss ?? "");
  if (!GOOGLE_ISSUERS.includes(issuer)) {
    throw new Error(`Unexpected Google token issuer: ${issuer}`);
  }

  if (payload.aud !== clientId) {
    throw new Error("Google ID token audience does not match this app.");
  }

  const expiry = Number(payload.exp ?? 0) * 1000;
  if (!expiry || Date.now() >= expiry) {
    throw new Error("Google ID token has expired.");
  }

  const email = payload.email;
  if (typeof email !== "string" || !email.includes("@")) {
    throw new Error("Google ID token has no usable email claim.");
  }
  if (payload.email_verified !== true) {
    throw new Error("Google account email is not verified.");
  }

  return {
    email,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

// ── Auth entrypoint (unchanged providers + the new Google one) ──────────────

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailOtp, Anonymous, googleProvider],
});
