"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Introduce tu dirección de correo."); return; }
    setLoading(true);
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    setLoading(false);
    if (resetError) {
      setError("No se pudo enviar el correo. Verifica la dirección e inténtalo de nuevo.");
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0a0a0f]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px]" />
      </div>
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-md mx-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/50 p-8">
          <div className="flex flex-col items-center gap-3 mb-7">
            <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ShieldCheck className="size-7 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">
                {sent ? "Correo enviado" : "Recuperar contraseña"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Copiloto Fiscal</p>
            </div>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-6 text-emerald-400" />
              </div>
              <p className="text-sm text-muted-foreground">
                Hemos enviado un enlace de recuperación a{" "}
                <strong className="text-foreground">{email}</strong>. Revisa tu bandeja de entrada.
              </p>
              <p className="text-xs text-muted-foreground">
                El enlace expira en 1 hora.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
              >
                <ArrowLeft className="size-3" />
                Volver al login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive mb-4">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <p className="text-sm text-muted-foreground text-center mb-5">
                Introduce tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <form onSubmit={handleReset} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="tu@empresa.es"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all"
                    autoComplete="email"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-primary/20"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Enviar enlace de recuperación
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="size-3" />
                  Volver al login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
