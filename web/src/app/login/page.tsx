"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type Tab = "password" | "magic";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const err = searchParams.get("error");
    const msg = searchParams.get("message");
    if (err === "auth_callback_failed") setError("Error en la autenticación. Inténtalo de nuevo.");
    if (msg === "check_email") setSuccessMsg("Revisa tu correo — te hemos enviado un enlace de acceso.");
  }, [searchParams]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Introduce tu correo y contraseña."); return; }
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Introduce tu dirección de correo electrónico."); return; }
    setLoading(true);
    setError("");
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (otpError) {
      setError("No se pudo enviar el enlace. Verifica tu correo.");
    } else {
      setSuccessMsg("Enlace enviado. Revisa tu bandeja de entrada.");
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError("Error al conectar con Google. Inténtalo de nuevo.");
      setGoogleLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError("");
    const { error: demoError } = await supabase.auth.signInWithPassword({
      email: "demo@copilotfiscal.es",
      password: "Demo2026!",
    });
    if (demoError) {
      setError("No se pudo acceder al modo demo. Contacta con soporte.");
      setDemoLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0a0a0f]">
      {/* Ambient gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[160px]" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-md mx-4 animate-fade-in">
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/50 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
              <ShieldCheck className="size-7 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">Copiloto Fiscal</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Gestión fiscal inteligente para tu negocio</p>
            </div>
          </div>

          {/* Error / Success alerts */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive mb-4">
              <AlertCircle className="size-3.5 shrink-0" />
              {error}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-xs text-emerald-400 mb-4">
              <CheckCircle2 className="size-3.5 shrink-0" />
              {successMsg}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading || demoLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 px-4 py-2.5 text-sm font-medium text-foreground mb-4 disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <svg className="size-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continuar con Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-[11px] text-muted-foreground">o accede con tu correo</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-secondary/50 p-1 mb-5 border border-border/40">
            <button
              onClick={() => { setTab("password"); setError(""); setSuccessMsg(""); }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all duration-200 ${
                tab === "password"
                  ? "bg-card text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Contraseña
            </button>
            <button
              onClick={() => { setTab("magic"); setError(""); setSuccessMsg(""); }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
                tab === "magic"
                  ? "bg-card text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-3" />
              Acceso Rápido
            </button>
          </div>

          {/* Password Form */}
          {tab === "password" && (
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="tu@empresa.es"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-secondary/60 transition-all"
                  autoComplete="email"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-secondary/60 transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-[11px] text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-primary/20"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Iniciar sesión
              </button>
            </form>
          )}

          {/* Magic Link Form */}
          {tab === "magic" && (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <p className="text-xs text-muted-foreground text-center mb-2">
                Te enviamos un enlace seguro directamente a tu correo. Sin contraseñas.
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="tu@empresa.es"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-secondary/60 transition-all"
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-primary/20"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Enviar enlace de acceso
              </button>
            </form>
          )}

          {/* Footer links */}
          <div className="mt-5 text-center text-xs text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Regístrate gratis
            </Link>
          </div>

          {/* Demo button */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <button
              onClick={handleDemoLogin}
              disabled={demoLoading || loading || googleLoading}
              className="w-full rounded-xl border border-border/40 bg-transparent hover:bg-white/5 text-muted-foreground hover:text-foreground py-2 text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {demoLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Entrar como Demo (La Corrala Escondida)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0f]">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

