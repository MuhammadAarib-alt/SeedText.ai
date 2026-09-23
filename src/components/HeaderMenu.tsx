import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/use-auth";
import { ChevronDown, LogIn, LogOut, UserRound } from "lucide-react";
import { useNavigate } from "react-router";

/**
 * Workspace header menu.
 *
 * - Guests (anonymous accounts) are authenticated in Convex's eyes, but they
 *   are NOT signed in — they get a "Sign in" item, never "Sign out".
 * - Real signed-in users get "Sign out" with their identity.
 * - No "Landing" link anywhere; the logo itself returns to the landing page.
 */
export function HeaderMenu() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  // Guests are anonymous sessions; only non-anonymous users count as
  // signed in for UI purposes.
  const isGuest = isAuthenticated === true && user?.isAnonymous === true;
  const isSignedIn = isAuthenticated === true && !isGuest;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2 rounded-xl px-2 sm:px-3"
          disabled={isLoading}
        >
          <img src={logo} alt="" width={30} height={30} />
          {isSignedIn ? (
            <span className="hidden text-left sm:block">
              <span className="block text-[13px] font-semibold leading-tight text-foreground">
                {user?.name || user?.email || "Signed in"}
              </span>
              <span className="block text-[11px] leading-tight text-muted-foreground">
                {user?.email ?? ""}
              </span>
            </span>
          ) : (
            <span className="hidden text-left sm:block">
              <span className="block text-[13px] font-semibold leading-tight text-foreground">
                {isGuest ? "Guest" : "Account"}
              </span>
              <span className="block text-[11px] leading-tight text-muted-foreground">
                {isGuest ? "temporary session" : "not signed in"}
              </span>
            </span>
          )}
          <ChevronDown className="size-4 text-muted-foreground" />
          <span className="sr-only">Account menu</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-60">          {isGuest && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserRound className="size-3.5" />
                Browsing as guest
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigate("/auth")}
                className="cursor-pointer"
              >
                <LogIn className="mr-2 size-4" />
                Sign in
              </DropdownMenuItem>
            </>
          )}

          {!isAuthenticated && (
            <DropdownMenuItem
              onClick={() => navigate("/auth")}
              className="cursor-pointer"
            >
              <LogIn className="mr-2 size-4" />
              Sign in
            </DropdownMenuItem>
          )}

        {isSignedIn && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <UserRound className="size-3.5" />
              {user?.email ?? "Signed in"}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
