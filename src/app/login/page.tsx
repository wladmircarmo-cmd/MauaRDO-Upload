"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useState, useEffect } from "react";

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
  </svg>
);

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const saved = localStorage.getItem("rdo-theme");
    if (saved) setIsDarkMode(saved === "dark");

    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "unauthorized") {
      setError("Seu acesso ainda não foi autorizado. Entre em contato com o administrador para liberar seu e-mail.");
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("rdo-theme", next ? "dark" : "light");
  };

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("Login error:", error.message);
      setLoading(false);
    }
  };

  return (
    <div className={`flex min-h-dvh flex-col items-center justify-center transition-colors duration-300 px-4 ${isDarkMode ? "bg-zinc-950 text-zinc-50" : "bg-zinc-50 text-zinc-900"}`}>
      <div className="absolute top-8 right-8">
        <button
          onClick={toggleTheme}
          className={`p-2.5 rounded-xl border transition-all active:scale-95 ${isDarkMode
            ? "bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800"
            : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-100 shadow-sm"
            }`}
        >
          {isDarkMode ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      <div className="w-full max-w-2xl space-y-16 text-center">
        <div className="space-y-8">
          <div className="mx-auto flex h-64 w-auto items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.png"
              alt="Logo Mauá"
              className={`h-64 w-auto object-contain rounded-[2rem] border transition-all shadow-2xl ${isDarkMode ? "border-zinc-800 shadow-blue-500/10" : "border-zinc-200 shadow-zinc-200/50"
                }`}
            />
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl font-black tracking-tighter uppercase">Mauá RDO</h1>
            <p className={`text-2xl font-semibold ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>
              Sistema de Upload de Fotos para RDO
            </p>
          </div>
        </div>

        {error && (
          <div className={`-mt-8 p-6 rounded-3xl border animate-in zoom-in-95 duration-300 ${isDarkMode
            ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
            : "bg-rose-50 border-rose-200 text-rose-600"
            }`}>
            <div className="flex items-center justify-center gap-3 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span className="font-black uppercase tracking-widest text-sm">Acesso Negado</span>
            </div>
            <p className="font-medium text-lg leading-snug">
              {error}
            </p>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className={`group relative flex w-full items-center justify-center gap-6 rounded-[2rem] border px-12 py-8 text-2xl font-black transition-all active:scale-[0.98] disabled:opacity-50 ${isDarkMode
            ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 shadow-2xl shadow-black/60"
            : "bg-white border-zinc-200 hover:bg-zinc-50 shadow-xl shadow-zinc-200/60"
            }`}
        >
          {loading ? (
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-400 border-t-transparent" />
          ) : (
            <>
              <div className="scale-[1.5]">
                <GoogleIcon />
              </div>
              <span>Entrar com Google</span>
            </>
          )}
        </button>

        <p className={`text-lg font-medium ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>
          Acesso restrito a colaboradores autorizados.
        </p>
      </div>

      <div className="absolute bottom-8 text-[10px] uppercase tracking-widest text-zinc-600">
        Mauá Departamento Técnico &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
