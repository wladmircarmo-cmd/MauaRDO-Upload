"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Handles the OAuth redirect from Supabase.
 * After the user authenticates with Google, Supabase redirects back to
 * `${origin}/auth/callback` with a `code` query parameter.
 * We exchange this code for a session using `supabase.auth.exchangeCodeForSession`.
 */
export default function CallbackPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (!code) {
        router.replace("/login?error=unauthorized");
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("Supabase callback error:", error);
        router.replace("/login?error=unauthorized");
        return;
      }
      // Successful login – redirect to home
      router.replace("/");
    };
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simple loading UI while processing.
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-zinc-50">
      <p className="text-lg font-medium">Finalizando login…</p>
    </div>
  );
}

