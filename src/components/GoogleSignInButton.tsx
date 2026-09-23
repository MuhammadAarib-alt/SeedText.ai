import { useEffect, useRef, useState } from "react";

/**
 * Google "Sign in with Google" button, rendered by Google Identity Services.
 *
 * The button is drawn by Google's own script (so it always matches Google's
 * branding guidelines). When the user completes the flow, Google hands back a
 * short-lived ID token which we forward to `onCredential` — the Auth page
 * passes it into Convex Auth's "google" provider for server-side verification.
 */

interface GoogleSignInButtonProps {
  clientId: string;
  onCredential: (idToken: string) => void | Promise<void>;
  onError?: (message: string) => void;
}

// Google's GIS script calls this global callback with the credential.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_SRC}"]`,
    );
    if (existing) {
      if (window.google) {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("gsi failed")), {
          once: true,
        });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google's script"));
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton({
  clientId,
  onCredential,
  onError,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  // Keep latest callbacks in refs so the GIS script only initializes once.
  const credentialCbRef = useRef(onCredential);
  const errorCbRef = useRef(onError);
  useEffect(() => {
    credentialCbRef.current = onCredential;
    errorCbRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              void credentialCbRef.current(response.credential);
            } else {
              errorCbRef.current?.(
                "Google didn't return a sign-in result. Try again.",
              );
            }
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 280,
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          errorCbRef.current?.(
            "Couldn't load Google sign-in. Check your connection.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) return null;

  return (
    <div className="flex justify-center" style={{ minHeight: ready ? undefined : 44 }}>
      <div ref={containerRef} />
    </div>
  );
}
