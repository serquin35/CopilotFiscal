"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

function UpdatePasswordContent() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Check if there is an active session (set by /auth/callback or Supabase auth)
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (mounted) {
          if (session) {
            setHasSession(true);
          }
          setCheckingSession(false);
        }
      } catch (err) {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    checkAuth();

    // Also listen for auth state change (e.g. PASSWORD_RECOVERY event or token parsed from hash)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Por favor, completa ambos campos.");
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

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(
          updateError.message ||
            "No se pudo actualizar la contraseña. El enlace puede haber caducado."
        );
        setLoading(false);
      } else {
        setSuccess(true);
        setLoading(false);
        // Optional redirect to login after short delay
        setTimeout(() => {
          router.push("/login?message=password_updated");
        }, 2500);
      }
    } catch (err) {
      setError("Ocurrió un error inesperado al actualizar la contraseña.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0a0a0f]">
      {/* Ambient gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-md mx-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/50 p-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 mb-7">
            <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ShieldCheck className="size-7 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">
                Nueva contraseña
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Copiloto Fiscal
              </p>
            </div>
          </div>

          {checkingSession ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">Verificando enlace de recuperación...</p>
            </div>
          ) : success ? (
            <div className="text-center space-y-4">
              <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-medium text-foreground">
                  ¡Contraseña actualizada!
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Tu contraseña se ha restablecido correctamente. Te estamos
                  redirigiendo al inicio de sesión...
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/login?message=password_updated"
                  className="inline-flex items-center justify-center w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 text-sm font-medium transition-all shadow-lg shadow-primary/20"
                >
                  Ir al inicio de sesión
                </Link>
              </div>
            </div>
          ) : !hasSession ? (
            <div className="text-center space-y-4">
              <div className="size-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
                <AlertCircle className="size-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-medium text-foreground">
                  Enlace inválido o caducado
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  El enlace para restablecer la contraseña no es válido o ha
                  expirado. Por favor, solicita uno nuevo.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center justify-center w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 text-sm font-medium transition-all shadow-lg shadow-primary/20"
                >
                  Solicitar nuevo enlace
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
                >
                  <ArrowLeft className="size-3" />
                  Volver al login
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive mb-4">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <p className="text-sm text-muted-foreground text-center mb-5">
                Introduce tu nueva contraseña para acceder a tu cuenta.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3 text-[11px] text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`size-1.5 rounded-full ${
                        password.length >= 8
                          ? "bg-emerald-400"
                          : "bg-muted-foreground/40"
                      }`}
                    />
                    <span>Al menos 8 caracteres</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`size-1.5 rounded-full ${
                        password && password === confirmPassword
                          ? "bg-emerald-400"
                          : "bg-muted-foreground/40"
                      }`}
                    />
                    <span>Las dos contraseñas coinciden</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-primary/20 mt-2"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Actualizar contraseña
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

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0f]">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      }
    >
      <UpdatePasswordContent />
    </Suspense>
  );
}
