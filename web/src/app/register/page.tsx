"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Building2,
  Hash,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function RegisterPage() {
  const supabase = createClient();

  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [cif, setCif] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!displayName || !businessName || !email || !password) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          business_name: businessName,
          cif: cif,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        setError("Este correo ya está registrado. ¿Quieres iniciar sesión?");
      } else {
        setError(signUpError.message);
      }
    } else {
      setSuccess(true);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError("Error al conectar con Google.");
      setGoogleLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        </div>
        <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl p-8 text-center">
          <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="size-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">¡Cuenta creada!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Hemos enviado un enlace de confirmación a <strong className="text-foreground">{email}</strong>.
            Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 text-sm font-medium transition-all"
          >
            Ir al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0a0a0f]">
      {/* Ambient gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px]" />
      </div>
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-md mx-4 my-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/50 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-7">
            <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
              <ShieldCheck className="size-7 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">Crea tu cuenta</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Copiloto Fiscal — gestión fiscal inteligente</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive mb-4">
              <AlertCircle className="size-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogleRegister}
            disabled={googleLoading || loading}
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
            Registrarse con Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-[11px] text-muted-foreground">o con tu correo</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-3">
            {/* Display name */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tu nombre completo"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all"
              />
            </div>

            {/* Business name */}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Nombre del negocio o empresa *"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all"
                required
              />
            </div>

            {/* CIF */}
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="CIF / NIF (opcional)"
                value={cif}
                onChange={(e) => setCif(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all font-mono"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Correo electrónico *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all"
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña (mín. 8 caracteres) *"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {/* Confirm password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirmar contraseña *"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-xl border bg-secondary/40 pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${
                  confirmPassword && confirmPassword !== password
                    ? "border-destructive/60 focus:border-destructive"
                    : "border-border/60 focus:border-primary/60"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-primary/20 mt-1"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Crear cuenta
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
