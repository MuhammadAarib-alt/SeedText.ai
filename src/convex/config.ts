import { query } from "./_generated/server";

/**
 * Public, non-secret configuration for the client.
 *
 * Only the OAuth *client ID* is exposed — it's a public identifier embedded
 * in every Google sign-in flow. The client secret, API keys, etc. never
 * leave the server environment.
 */
export const publicConfig = query({
  args: {},
  handler: () => ({
    googleClientId: process.env.AUTH_GOOGLE_CLIENT_ID ?? null,
  }),
});
