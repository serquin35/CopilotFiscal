"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  Building2,
  Settings2,
  ShieldCheck,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  FileText,
  MapPin,
  Phone,

  Hash,
  CreditCard,
  Bell,
  Palette,
  LogOut,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { validateNif } from "@/lib/nif-validator";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "profile" | "empresa" | "preferencias" | "seguridad";

interface Toast {
  type: "success" | "error";
  msg: string;
}

// ─── Helper: Toast ─────────────────────────────────────────────────────────────
function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-sm animate-fade-in ${
        toast.type === "success"
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="size-4 shrink-0" />
      ) : (
        <AlertCircle className="size-4 shrink-0" />
      )}
      {toast.msg}
    </div>
  );
}

// ─── Helper: SectionCard ───────────────────────────────────────────────────────
function SectionCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-3 mb-6">
        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Icon className="size-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Helper: FieldInput ────────────────────────────────────────────────────────
function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-secondary/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Helper: FieldSelect ───────────────────────────────────────────────────────
function FieldSelect({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-all appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card">
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Tab: Perfil Personal ─────────────────────────────────────────────────────
function TabProfile({ onToast }: { onToast: (t: Toast) => void }) {
  const { user, profile, supabase } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      // @ts-expect-error phone may exist
      setPhone(profile.phone ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, phone, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      onToast({ type: "error", msg: "Error al guardar el perfil." });
    } else {
      onToast({ type: "success", msg: "Perfil actualizado correctamente." });
    }
  };

  const initials = (displayName || user?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      onToast({ type: "error", msg: "El avatar debe ser una imagen." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onToast({ type: "error", msg: "Máximo 2 MB para el avatar." });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: upError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upError) throw upError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (dbError) throw dbError;
      setAvatarUrl(url);
      onToast({ type: "success", msg: "Avatar actualizado." });
    } catch {
      onToast({ type: "error", msg: "No se pudo subir el avatar. Revisa el bucket `avatars`." });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Avatar block */}
      <SectionCard title="Identidad" subtitle="Tu nombre y avatar visibles en la plataforma" icon={User}>
        <div className="flex items-center gap-4 mb-6">
          <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold shrink-0 overflow-hidden">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{displayName || "Sin nombre"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <label className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-primary hover:underline cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
              {uploadingAvatar ? "Subiendo…" : avatarUrl ? "Cambiar avatar" : "Subir avatar (máx 2 MB)"}
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldInput
            label="Nombre completo"
            value={displayName}
            onChange={setDisplayName}
            placeholder="María García López"
            required
          />
          <FieldInput
            label="Correo electrónico"
            value={user?.email ?? ""}
            onChange={() => {}}
            disabled
            hint="El email se gestiona desde la sección Seguridad"
          />
          <FieldInput
            label="Teléfono"
            value={phone}
            onChange={setPhone}
            placeholder="+34 600 000 000"
            type="tel"
          />
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60 shadow-sm shadow-primary/20"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Mi Empresa ──────────────────────────────────────────────────────────
function TabEmpresa({ onToast }: { onToast: (t: Toast) => void }) {
  const { business, supabase } = useAuth();
  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [legalForm, setLegalForm] = useState("autonomo");
  const [activityType, setActivityType] = useState("servicios");
  const [cnae, setCnae] = useState("");
  const [vatRegime, setVatRegime] = useState("general");
  const [region, setRegion] = useState("madrid");
  const [fiscalAddress, setFiscalAddress] = useState("");
  const [fiscalCity, setFiscalCity] = useState("");
  const [fiscalZip, setFiscalZip] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (business) {
      setName(business.name ?? "");
      setActivityType(business.activity_type ?? "servicios");
      setNif(business.nif ?? "");
      setLegalForm(business.legal_form ?? "autonomo");
      setCnae(business.cnae_code ?? "");
      setVatRegime(business.vat_regime ?? "general");
      setRegion(business.region ?? "madrid");
      setFiscalAddress(business.fiscal_address ?? "");
      setFiscalCity(business.fiscal_city ?? "");
      setFiscalZip(business.fiscal_zip ?? "");
      setPhone(business.phone ?? "");
      setWebsite(business.website ?? "");
    }
  }, [business]);

  const save = async () => {
    if (!business) return;
    const trimmedNif = nif.trim();
    if (trimmedNif !== "") {
      const check = validateNif(trimmedNif, { allowDemo: business.is_demo ?? false });
      if (!check.valid) {
        onToast({ type: "error", msg: `NIF inválido: ${check.message}` });
        return;
      }
    }
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({
        name,
        nif,
        legal_form: legalForm,
        activity_type: activityType,
        cnae_code: cnae,
        vat_regime: vatRegime,
        region,
        fiscal_address: fiscalAddress,
        fiscal_city: fiscalCity,
        fiscal_zip: fiscalZip,
        phone,
        website,
        updated_at: new Date().toISOString(),
      })
      .eq("id", business.id);
    setSaving(false);
    if (error) {
      onToast({ type: "error", msg: "Error al guardar los datos de empresa." });
    } else {
      onToast({ type: "success", msg: "Datos de empresa actualizados." });
    }
  };

  const LEGAL_FORMS = [
    { value: "autonomo", label: "Autónomo / Profesional liberal" },
    { value: "sl", label: "Sociedad Limitada (S.L.)" },
    { value: "sa", label: "Sociedad Anónima (S.A.)" },
    { value: "slp", label: "Sociedad Limitada Profesional (S.L.P.)" },
    { value: "comunidad_bienes", label: "Comunidad de Bienes" },
    { value: "otro", label: "Otra forma jurídica" },
  ];

  const VAT_REGIMES = [
    { value: "general", label: "Régimen General de IVA" },
    { value: "simplificado", label: "Régimen Simplificado (módulos)" },
    { value: "recargo", label: "Recargo de Equivalencia" },
    { value: "especial_agencias", label: "Régimen especial agencias de viajes" },
    { value: "exento", label: "Exento de IVA (art. 20 LIVA)" },
  ];

  const ACTIVITY_TYPES = [
    { value: "servicios", label: "Prestación de servicios" },
    { value: "comercio", label: "Comercio / Compraventa" },
    { value: "hosteleria", label: "Hostelería / Restauración" },
    { value: "construccion", label: "Construcción / Reforma" },
    { value: "profesional", label: "Actividad profesional" },
    { value: "mixta", label: "Actividad mixta" },
  ];

  const REGIONS = [
    { value: "andalucia", label: "Andalucía" },
    { value: "aragon", label: "Aragón" },
    { value: "asturias", label: "Asturias" },
    { value: "baleares", label: "Islas Baleares" },
    { value: "canarias", label: "Islas Canarias" },
    { value: "cantabria", label: "Cantabria" },
    { value: "castilla_la_mancha", label: "Castilla-La Mancha" },
    { value: "castilla_leon", label: "Castilla y León" },
    { value: "cataluna", label: "Cataluña" },
    { value: "extremadura", label: "Extremadura" },
    { value: "galicia", label: "Galicia" },
    { value: "madrid", label: "Comunidad de Madrid" },
    { value: "murcia", label: "Región de Murcia" },
    { value: "navarra", label: "Navarra" },
    { value: "pais_vasco", label: "País Vasco" },
    { value: "rioja", label: "La Rioja" },
    { value: "valencia", label: "Comunitat Valenciana" },
    { value: "ceuta", label: "Ceuta" },
    { value: "melilla", label: "Melilla" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Identidad fiscal */}
      <SectionCard title="Identidad fiscal" subtitle="Datos que aparecerán en tus facturas y modelos AEAT" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FieldInput
              label="Razón social / Nombre comercial"
              value={name}
              onChange={setName}
              placeholder="Ferretería García, S.L."
              required
            />
          </div>
          <div>
            <FieldInput
              label="NIF / CIF"
              value={nif}
              onChange={setNif}
              placeholder="B12345678 o 12345678A"
              hint="Identificación fiscal. Indispensable para el Modelo 303."
            />
            {nif.trim() !== "" &&
              (() => {
                const check = validateNif(nif, { allowDemo: business?.is_demo ?? false });
                return (
                  <p className={`text-[11px] mt-1 font-medium ${check.valid ? "text-primary" : "text-destructive"}`}>
                    {check.valid ? `✅ ${check.message}` : `❌ ${check.message}`}
                  </p>
                );
              })()}
          </div>
          <FieldSelect
            label="Forma jurídica"
            value={legalForm}
            onChange={setLegalForm}
            options={LEGAL_FORMS}
          />
          <FieldSelect
            label="Tipo de actividad"
            value={activityType}
            onChange={setActivityType}
            options={ACTIVITY_TYPES}
          />
          <FieldInput
            label="Código CNAE / Epígrafe IAE"
            value={cnae}
            onChange={setCnae}
            placeholder="6201 — Programación informática"
            hint="Opcional pero recomendado para análisis de deducciones."
          />
        </div>
      </SectionCard>

      {/* Régimen fiscal */}
      <SectionCard title="Régimen fiscal" subtitle="Configura tu régimen de IVA y comunidad autónoma" icon={CreditCard}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldSelect
            label="Régimen de IVA"
            value={vatRegime}
            onChange={setVatRegime}
            options={VAT_REGIMES}
            hint="Afecta al cálculo del Modelo 303 y deducciones aplicables."
          />
          <FieldSelect
            label="Comunidad autónoma"
            value={region}
            onChange={setRegion}
            options={REGIONS}
            hint="Determina normativa autonómica aplicable y plazos regionales."
          />
        </div>
        {vatRegime === "canarias" && (
          <div className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
            ⚠️ Las Islas Canarias aplican IGIC en lugar de IVA. El Modelo 303 no aplica; deberás presentar el Modelo 420.
          </div>
        )}
      </SectionCard>

      {/* Domicilio fiscal */}
      <SectionCard title="Domicilio fiscal" subtitle="Dirección registrada ante la AEAT" icon={MapPin}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FieldInput
              label="Dirección fiscal"
              value={fiscalAddress}
              onChange={setFiscalAddress}
              placeholder="Calle Mayor, 1, 2º A"
            />
          </div>
          <FieldInput
            label="Ciudad"
            value={fiscalCity}
            onChange={setFiscalCity}
            placeholder="Madrid"
          />
          <FieldInput
            label="Código postal"
            value={fiscalZip}
            onChange={setFiscalZip}
            placeholder="28001"
          />
        </div>
      </SectionCard>

      {/* Contacto */}
      <SectionCard title="Contacto de empresa" subtitle="Teléfono y web del negocio" icon={Phone}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldInput
            label="Teléfono de empresa"
            value={phone}
            onChange={setPhone}
            placeholder="+34 91 000 00 00"
            type="tel"
          />
          <FieldInput
            label="Sitio web"
            value={website}
            onChange={setWebsite}
            placeholder="https://miempresa.es"
            type="url"
          />
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60 shadow-sm shadow-primary/20"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Guardando…" : "Guardar empresa"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Preferencias ────────────────────────────────────────────────────────
function TabPreferencias({ onToast }: { onToast: (t: Toast) => void }) {
  const [activeQuarter, setActiveQuarter] = useState("4T");
  const [activeYear, setActiveYear] = useState("2026");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [anomalyAlerts, setAnomalyAlerts] = useState(true);
  const [deadlineReminders, setDeadlineReminders] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("copiloto_prefs");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setActiveQuarter(p.quarter ?? "4T");
        setActiveYear(p.year ?? "2026");
        setEmailNotifs(p.emailNotifs ?? true);
        setAnomalyAlerts(p.anomalyAlerts ?? true);
        setDeadlineReminders(p.deadlineReminders ?? true);
      } catch {}
    }
  }, []);

  const save = () => {
    localStorage.setItem(
      "copiloto_prefs",
      JSON.stringify({ quarter: activeQuarter, year: activeYear, emailNotifs, anomalyAlerts, deadlineReminders })
    );
    onToast({ type: "success", msg: "Preferencias guardadas." });
  };

  const Toggle = ({
    label,
    hint,
    value,
    onChange,
  }: {
    label: string;
    hint: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`shrink-0 relative h-5 w-9 rounded-full border transition-all duration-200 ${
          value ? "bg-primary border-primary/50" : "bg-secondary border-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
            value ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Periodo fiscal activo" subtitle="Trimestre y año que se muestra por defecto en el dashboard" icon={Palette}>
        <div className="grid grid-cols-2 gap-4">
          <FieldSelect
            label="Trimestre activo"
            value={activeQuarter}
            onChange={setActiveQuarter}
            options={[
              { value: "1T", label: "1T — Enero a Marzo" },
              { value: "2T", label: "2T — Abril a Junio" },
              { value: "3T", label: "3T — Julio a Septiembre" },
              { value: "4T", label: "4T — Octubre a Diciembre" },
            ]}
          />
          <FieldSelect
            label="Año fiscal"
            value={activeYear}
            onChange={setActiveYear}
            options={[
              { value: "2024", label: "2024" },
              { value: "2025", label: "2025" },
              { value: "2026", label: "2026" },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard title="Notificaciones" subtitle="Controla qué alertas quieres recibir de la plataforma" icon={Bell}>
        <div className="flex flex-col gap-5">
          <Toggle
            label="Notificaciones por email"
            hint="Resumen semanal con el estado de tu Modelo 303"
            value={emailNotifs}
            onChange={setEmailNotifs}
          />
          <div className="h-px bg-border/50" />
          <Toggle
            label="Alertas de anomalías AEAT"
            hint="Avisos cuando el motor detecte patrones de riesgo fiscal"
            value={anomalyAlerts}
            onChange={setAnomalyAlerts}
          />
          <div className="h-px bg-border/50" />
          <Toggle
            label="Recordatorios de plazos"
            hint="Alertas 7 días antes de cada fecha límite de presentación"
            value={deadlineReminders}
            onChange={setDeadlineReminders}
          />
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button
          onClick={save}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
        >
          <Save className="size-4" />
          Guardar preferencias
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Seguridad ───────────────────────────────────────────────────────────
function TabSeguridad({ onToast }: { onToast: (t: Toast) => void }) {
  const { user, supabase, signOut } = useAuth();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const isOAuthUser = !user?.email?.includes("@") || user?.app_metadata?.provider === "google";

  const changePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      onToast({ type: "error", msg: "Las contraseñas no coinciden." });
      return;
    }
    if (newPassword.length < 8) {
      onToast({ type: "error", msg: "La contraseña debe tener al menos 8 caracteres." });
      return;
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);
    if (error) {
      onToast({ type: "error", msg: "Error al cambiar la contraseña." });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      onToast({ type: "success", msg: "Contraseña actualizada correctamente." });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== "ELIMINAR" || !user || deletingAccount) return;
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar la cuenta");
      }

      onToast({ type: "success", msg: "Tu cuenta y datos han sido eliminados permanentemente." });

      try {
        localStorage.clear();
      } catch (_) {}

      await signOut();
      router.push("/login");
    } catch (err: any) {
      onToast({ type: "error", msg: err.message || "Error al eliminar la cuenta" });
      setDeletingAccount(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cuenta conectada */}
      <SectionCard title="Cuenta conectada" subtitle="Método de autenticación activo" icon={ShieldCheck}>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-secondary/30">
          {user?.app_metadata?.provider === "google" ? (
            <>
              <svg className="size-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-foreground">Google OAuth</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 font-semibold">
                Activo
              </span>
            </>
          ) : (
            <>
              <Hash className="size-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Email / Contraseña</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 font-semibold">
                Activo
              </span>
            </>
          )}
        </div>
      </SectionCard>

      {/* Cambiar contraseña */}
      {!isOAuthUser && (
        <SectionCard title="Cambiar contraseña" subtitle="Elige una contraseña segura de al menos 8 caracteres" icon={ShieldCheck}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-xl border border-border/60 bg-secondary/40 px-3 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <FieldInput
              label="Confirmar nueva contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repite la contraseña"
              type="password"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={changePassword}
              disabled={savingPwd || !newPassword}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60 shadow-sm shadow-primary/20"
            >
              {savingPwd ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {savingPwd ? "Cambiando…" : "Actualizar contraseña"}
            </button>
          </div>
        </SectionCard>
      )}

      {/* Sesión */}
      <SectionCard title="Sesión activa" subtitle="Gestiona tu sesión actual en la plataforma" icon={LogOut}>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-xl border border-border/60 bg-transparent hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground px-4 py-2.5 text-sm font-medium transition-all duration-200"
        >
          <LogOut className="size-4" />
          Cerrar sesión en este dispositivo
        </button>
      </SectionCard>

      {/* Danger zone */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="size-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
            <Trash2 className="size-4 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-destructive">Zona de peligro</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Las acciones aquí son irreversibles. Procede con extrema cautela.
            </p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-transparent hover:bg-destructive/10 text-destructive px-4 py-2.5 text-sm font-medium transition-all"
          >
            <Trash2 className="size-4" />
            Eliminar mi cuenta
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Escribe <span className="font-mono text-destructive font-semibold">ELIMINAR</span> para confirmar que quieres borrar tu cuenta y todos los datos asociados de forma permanente.
            </p>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Escribe ELIMINAR"
              disabled={deletingAccount}
              className="w-full rounded-xl border border-destructive/40 bg-secondary/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-destructive/60 transition-all max-w-xs disabled:opacity-50"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }}
                disabled={deletingAccount}
                className="rounded-xl border border-border/60 bg-transparent text-muted-foreground px-4 py-2 text-xs font-medium hover:bg-muted/50 transition-all disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteText !== "ELIMINAR" || deletingAccount}
                className="flex items-center gap-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white px-4 py-2 text-xs font-semibold transition-all disabled:opacity-40 shadow-sm"
              >
                {deletingAccount ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                {deletingAccount ? "Eliminando..." : "Confirmar eliminación"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Perfil personal", icon: User },
  { id: "empresa", label: "Mi empresa", icon: Building2 },
  { id: "preferencias", label: "Preferencias", icon: Settings2 },
  { id: "seguridad", label: "Seguridad", icon: ShieldCheck },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [toast, setToast] = useState<Toast | null>(null);
  useAuth();

  const showToast = useCallback((t: Toast) => setToast(t), []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona tu perfil, los datos de tu empresa y las preferencias de la plataforma.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 rounded-2xl border border-border bg-card p-1.5 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-secondary text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Icon className={`size-3.5 ${isActive ? "text-primary" : ""}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div key={activeTab}>
        {activeTab === "profile" && <TabProfile onToast={showToast} />}
        {activeTab === "empresa" && <TabEmpresa onToast={showToast} />}
        {activeTab === "preferencias" && <TabPreferencias onToast={showToast} />}
        {activeTab === "seguridad" && <TabSeguridad onToast={showToast} />}
      </div>

      {/* Toast */}
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
