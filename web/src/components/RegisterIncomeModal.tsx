"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Store,
  FileText,
  Calendar,
  CreditCard,
  Coins,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { optimizeImage } from "@/lib/image-optimizer";
import { sha256Hex } from "@/lib/file-hash";
import { buildStoragePath } from "@/lib/storage-path";
import { IncomeRecord } from "@/types";

interface RegisterIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultYear?: number;
}

export function RegisterIncomeModal({
  isOpen,
  onClose,
  onSuccess,
  defaultYear = 2026,
}: RegisterIncomeModalProps) {
  const { business, supabase } = useAuth();
  const currentBizId = business?.id;

  const [activeTab, setActiveTab] = useState<"register" | "history">("register");

  // Form State
  const [sourceType, setSourceType] = useState<"tpv" | "factura" | "manual">("tpv");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [isManualDescription, setIsManualDescription] = useState(false);
  const [totalAmountInput, setTotalAmountInput] = useState("");
  const [baseAmountInput, setBaseAmountInput] = useState("");
  const [inputMode, setInputMode] = useState<"total" | "base">("total");
  const [vatRate, setVatRate] = useState<number>(10); // 10% por defecto hostelería
  const [paymentMethod, setPaymentMethod] = useState<"mixto" | "tarjeta" | "efectivo" | "transferencia">("mixto");
  const [cardAmount, setCardAmount] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Foto opcional del cierre Z
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<IncomeRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sugerencia dinámica de descripción según fecha y tipo
  useEffect(() => {
    if (!isManualDescription && date) {
      const d = new Date(date + "T12:00:00");
      const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const dayName = dayNames[d.getDay()] || "";
      const formatted = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

      if (sourceType === "tpv") {
        setDescription(`Cierre Z TPV - ${dayName} ${formatted}`);
      } else if (sourceType === "factura") {
        setDescription(`Factura emitida cliente - ${formatted}`);
      } else {
        setDescription(`Ventas registradas - ${dayName} ${formatted}`);
      }
    }
  }, [date, sourceType, isManualDescription]);

  // Cálculos deterministas según el inputMode
  const parsedTotal = parseFloat(totalAmountInput.replace(",", ".")) || 0;
  const parsedBase = parseFloat(baseAmountInput.replace(",", ".")) || 0;

  let calculatedBase = 0;
  let calculatedVat = 0;
  let calculatedTotal = 0;

  if (inputMode === "total") {
    calculatedTotal = Math.max(0, parsedTotal);
    if (vatRate > 0) {
      calculatedBase = Math.round((calculatedTotal / (1 + vatRate / 100)) * 100) / 100;
      calculatedVat = Math.round((calculatedTotal - calculatedBase) * 100) / 100;
    } else {
      calculatedBase = calculatedTotal;
      calculatedVat = 0;
    }
  } else {
    calculatedBase = Math.max(0, parsedBase);
    calculatedVat = Math.round((calculatedBase * (vatRate / 100)) * 100) / 100;
    calculatedTotal = Math.round((calculatedBase + calculatedVat) * 100) / 100;
  }

  // Trimestre deducido
  const dateObj = new Date(date + "T12:00:00");
  const year = dateObj.getFullYear() || defaultYear;
  const month = dateObj.getMonth() + 1;
  const quarterNum = Math.ceil(month / 3);
  const quarterLabel = `${quarterNum}T ${year}`;

  // Cargar historial de ingresos del negocio
  const loadHistory = useCallback(async () => {
    if (!currentBizId) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("income")
        .select("*")
        .eq("business_id", currentBizId)
        .is("deleted_at", null)
        .order("date", { ascending: false });

      if (!error && data) {
        setHistoryList(data as IncomeRecord[]);
      }
    } catch (err) {
      console.warn("Error cargando historial de ingresos:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentBizId, supabase]);

  useEffect(() => {
    if (isOpen) {
      setSuccessMessage(null);
      setErrorMessage(null);
      if (activeTab === "history") {
        loadHistory();
      }
    }
  }, [isOpen, activeTab, loadHistory]);

  // Manejo de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      if (file.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(file);
        setFilePreview(previewUrl);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Guardar ingreso
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentBizId) {
      setErrorMessage("No se ha detectado el identificador del negocio.");
      return;
    }

    if (calculatedTotal <= 0) {
      setErrorMessage("El importe total de las ventas debe ser mayor a 0 €.");
      return;
    }

    if (!date) {
      setErrorMessage("Por favor selecciona una fecha válida.");
      return;
    }

    setIsSubmitting(true);

    try {
      let documentId: string | null = null;

      // 1. Si adjuntó foto/comprobante del Cierre Z, subir a Storage e insertar en documents
      if (attachedFile) {
        try {
          const docUUID = crypto.randomUUID();
          let fileToUpload: File | Blob = attachedFile;
          let fileHash = "";

          if (attachedFile.type.startsWith("image/")) {
            const optResult = await optimizeImage(attachedFile);
            fileToUpload = optResult.file;
          }
          fileHash = await sha256Hex(fileToUpload);

          const storagePath = buildStoragePath(
            currentBizId,
            docUUID,
            fileToUpload.type || "image/jpeg"
          );

          // Subir a Storage
          const { error: storageErr } = await supabase.storage
            .from("documents")
            .upload(storagePath, fileToUpload, { cacheControl: "3600", upsert: true });

          if (!storageErr) {
            // Insertar en documents con direction: 'income'
            const { data: docData, error: docErr } = await supabase
              .from("documents")
              .insert([
                {
                  id: docUUID,
                  business_id: currentBizId,
                  type: "ticket",
                  direction: "income",
                  storage_path: storagePath,
                  original_filename: attachedFile.name,
                  file_size_bytes: fileToUpload.size,
                  mime_type: fileToUpload.type || "image/jpeg",
                  hash_sha256: fileHash,
                  status: "CONFIRMED",
                  notes: `Comprobante de cierre Z ventas: ${description}`,
                },
              ])
              .select("id")
              .single();

            if (!docErr && docData?.id) {
              documentId = docData.id;
            }
          }
        } catch (uploadErr) {
          console.warn("Aviso: no se pudo adjuntar el comprobante físico:", uploadErr);
          // No bloqueamos el guardado de la venta si el archivo falla
        }
      }

      // 2. Insertar apunte en public.income
      const newIncomeId = crypto.randomUUID();
      const incomePayload = {
        id: newIncomeId,
        business_id: currentBizId,
        document_id: documentId,
        date: date,
        description: description || `Ventas ${date}`,
        base_amount: calculatedBase,
        vat_rate: vatRate,
        vat_amount: calculatedVat,
        total_amount: calculatedTotal,
        currency: "EUR",
        source: sourceType,
        category: "ventas_hosteleria",
        fiscal_period_year: year,
        fiscal_period_quarter: quarterNum,
        payment_method: paymentMethod,
        notes: notes || (paymentMethod === "mixto" && (cardAmount || cashAmount)
          ? `Tarjeta: ${cardAmount || "0"} € | Efectivo: ${cashAmount || "0"} €`
          : null),
      };

      const { error: incomeErr } = await supabase
        .from("income")
        .insert([incomePayload]);

      if (incomeErr) throw incomeErr;

      // 3. Registrar evento de auditoría
      try {
        await supabase.from("audit_events").insert([
          {
            business_id: currentBizId,
            entity_type: "income",
            entity_id: newIncomeId,
            action: "INCOME_CREATED",
            actor_type: "user",
            metadata: {
              date,
              total_amount: calculatedTotal,
              base_amount: calculatedBase,
              vat_amount: calculatedVat,
              source: sourceType,
              payment_method: paymentMethod,
              fiscal_quarter: quarterLabel,
              has_attachment: !!documentId,
            },
          },
        ]);
      } catch (auditErr) {
        console.warn("Aviso al registrar auditoría de ingreso:", auditErr);
      }

      setSuccessMessage(
        `¡Cierre Z guardado con éxito! Se han registrado ${formatCurrency(calculatedTotal)} (${formatCurrency(calculatedVat)} de IVA Repercutido para el ${quarterLabel}).`
      );

      // Limpiar formulario para el siguiente
      setTotalAmountInput("");
      setBaseAmountInput("");
      setCardAmount("");
      setCashAmount("");
      setNotes("");
      handleRemoveFile();

      // Emitir eventos globales para que el Dashboard y Sidebar refresquen sus cifras en vivo
      window.dispatchEvent(new Event("fiscal_income_updated"));
      window.dispatchEvent(new Event("fiscal_docs_updated"));

      if (onSuccess) onSuccess();

      // Cambiar de tab a historial o cerrar tras breve feedback
      setTimeout(() => {
        loadHistory();
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado al guardar el ingreso.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar ingreso
  const handleDeleteIncome = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este apunte de ventas? La liquidación del Modelo 303 se recalculará automáticamente.")) {
      return;
    }
    setDeletingId(id);
    try {
      const { error } = await supabase.from("income").delete().eq("id", id);
      if (!error) {
        setHistoryList((prev) => prev.filter((item) => item.id !== id));
        window.dispatchEvent(new Event("fiscal_income_updated"));
        window.dispatchEvent(new Event("fiscal_docs_updated"));
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.warn("Error eliminando apunte de ventas:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between pb-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 sm:size-11 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0">
              <Store className="size-5 sm:size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  Registrar Ventas / Cierre Z
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 font-semibold">
                  {quarterLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Anota las ventas diarias de caja o TPV para liquidar el IVA Repercutido oficial.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Pestañas de navegación interna */}
        <div className="flex items-center gap-2 pt-3 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "register"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Store className="size-3.5" />
            <span>Nuevo Cierre</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              loadHistory();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Receipt className="size-3.5" />
            <span>Historial del Periodo {historyList.length > 0 && `(${historyList.length})`}</span>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto pr-1 py-2 flex-1 space-y-4">
          {errorMessage && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2.5 text-xs text-destructive animate-fade-in">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 flex items-start gap-2.5 text-xs text-primary animate-fade-in">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === "register" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Selector de Tipo de Ingreso */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Tipo de Registro
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType("tpv")}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      sourceType === "tpv"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 bg-card/60 text-muted-foreground hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Store className="size-3.5 text-primary" />
                      <span>Cierre Z TPV</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Bar / Sala / Terraza</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType("factura")}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      sourceType === "factura"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 bg-card/60 text-muted-foreground hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <FileText className="size-3.5 text-primary" />
                      <span>Factura Emitida</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Clientes con NIF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType("manual")}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      sourceType === "manual"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 bg-card/60 text-muted-foreground hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Calendar className="size-3.5 text-primary" />
                      <span>Resumen Semanal</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Acumulado período</span>
                  </button>
                </div>
              </div>

              {/* 2. Fecha y Concepto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                    Fecha del Cierre / Venta *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setIsManualDescription(false);
                      }}
                      required
                      className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                    Concepto / Descripción
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setIsManualDescription(true);
                    }}
                    placeholder="Ej. Cierre de caja viernes noche"
                    className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* 3. Importes e IVA con cálculo fluido */}
              <div className="rounded-xl border border-border/80 bg-secondary/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-primary" />
                    <span>Importes y Tipo de IVA</span>
                  </span>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-muted-foreground">Introducir por:</span>
                    <button
                      type="button"
                      onClick={() => setInputMode("total")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        inputMode === "total"
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Total (con IVA)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("base")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        inputMode === "base"
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Base imponible
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inputMode === "total" ? (
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        Total Recaudado en Caja (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ej: 450.00"
                        value={totalAmountInput}
                        onChange={(e) => setTotalAmountInput(e.target.value)}
                        required
                        className="w-full rounded-xl border border-primary/40 bg-secondary px-3 py-2 text-base font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        Importe final del tique Z con IVA incluido.
                      </span>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        Base Imponible (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ej: 409.09"
                        value={baseAmountInput}
                        onChange={(e) => setBaseAmountInput(e.target.value)}
                        required
                        className="w-full rounded-xl border border-primary/40 bg-secondary px-3 py-2 text-base font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        Base antes de aplicar el impuesto.
                      </span>
                    </div>
                  )}

                  {/* Selector Tipo de IVA */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Tipo de IVA Aplicable
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { rate: 10, label: "10% Hostelería", desc: "Comidas y bebidas" },
                        { rate: 21, label: "21% General", desc: "Servicios / Varios" },
                        { rate: 4, label: "4% Superreducido", desc: "Básicos" },
                      ].map((item) => (
                        <button
                          key={item.rate}
                          type="button"
                          onClick={() => setVatRate(item.rate)}
                          className={`p-1.5 rounded-lg border text-center transition-all ${
                            vatRate === item.rate
                              ? "border-primary bg-primary/15 text-primary font-bold shadow-xs"
                              : "border-border/60 bg-card/60 text-muted-foreground hover:border-border text-xs"
                          }`}
                        >
                          <div className="text-xs font-mono font-semibold">{item.rate}%</div>
                          <div className="text-[9px] opacity-80 leading-tight">{item.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Resumen del desglose fiscal en tiempo real */}
                <div className="rounded-lg bg-card/80 border border-border/60 p-2.5 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Base Imponible:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(calculatedBase)}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-muted-foreground text-[10px] block">IVA Repercutido ({vatRate}%):</span>
                    <span className="font-semibold text-primary">+{formatCurrency(calculatedVat)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground text-[10px] block">Total Declarado:</span>
                    <span className="font-bold text-foreground text-sm">{formatCurrency(calculatedTotal)}</span>
                  </div>
                </div>
              </div>

              {/* 4. Forma de Cobro */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Método de Cobro en Caja
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "mixto", label: "Mixto", icon: Store },
                    { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
                    { id: "efectivo", label: "Efectivo", icon: Coins },
                    { id: "transferencia", label: "Banco", icon: FileText },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as "mixto" | "tarjeta" | "efectivo" | "transferencia")}
                        className={`py-2 px-2 rounded-xl border text-xs flex items-center justify-center gap-1.5 transition-all ${
                          paymentMethod === m.id
                            ? "border-primary bg-primary/10 text-foreground font-semibold"
                            : "border-border/60 bg-card/60 text-muted-foreground hover:border-border"
                        }`}
                      >
                        <Icon className="size-3.5 text-primary" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {paymentMethod === "mixto" && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/40">
                    <div>
                      <span className="text-[10px] text-muted-foreground block mb-0.5">Cobro en Tarjeta TPV (€):</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ej: 320.00"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(e.target.value)}
                        className="w-full rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block mb-0.5">Cobro en Efectivo (€):</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ej: 130.00"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="w-full rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Foto / Comprobante del Cierre Z (Opcional) */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Foto o Archivo del Cierre Z (Opcional)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                />

                {attachedFile ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 truncate">
                      {filePreview ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={filePreview}
                          alt="Vista previa"
                          className="size-10 rounded-lg object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="size-10 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0">
                          <Receipt className="size-5" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-medium text-foreground truncate">{attachedFile.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {(attachedFile.size / 1024).toFixed(1)} KB · Comprobante vinculado
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="text-muted-foreground hover:text-destructive h-8 px-2"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border border-dashed border-border/80 hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40 p-3 text-center transition-all flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <UploadCloud className="size-4 text-primary" />
                    <span>Adjuntar foto del tique Z o factura (JPG, PNG, PDF)</span>
                  </button>
                )}
              </div>

              {/* 6. Notas opcionales */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                  Notas / Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Menú especial festivo, evento en terraza..."
                  className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Botón de acción */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || calculatedTotal <= 0}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-md shadow-primary/20 font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Guardando venta...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" />
                      <span>Guardar Cierre Z ({formatCurrency(calculatedTotal)})</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* Tab Historial de Ventas */
            <div className="space-y-3">
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="text-xs">Consultando libro de ingresos...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/80 rounded-xl p-6">
                  <Store className="size-8 text-muted-foreground/40 mb-2" />
                  <h4 className="text-sm font-semibold text-foreground">Aún no hay ventas registradas</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                    Registra los cierres de tu TPV para que el Modelo 303 calcule el IVA Repercutido real.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("register")}
                    className="gap-2 bg-primary text-primary-foreground text-xs"
                  >
                    <Store className="size-3.5" />
                    Registrar primer cierre
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1 mb-1">
                    <span>{historyList.length} registros de ventas encontrados</span>
                    <span className="font-mono font-medium text-foreground">
                      Total:{" "}
                      {formatCurrency(
                        historyList.reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0)
                      )}
                    </span>
                  </div>

                  <div className="divide-y divide-border/50 rounded-xl border border-border/70 bg-card overflow-hidden">
                    {historyList.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                            <Store className="size-4" />
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground truncate">
                                {item.description}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">
                                {formatDate(item.date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono mt-0.5">
                              <span>Base: {formatCurrency(Number(item.base_amount) || 0)}</span>
                              <span>·</span>
                              <span className="text-primary font-medium">
                                IVA ({item.vat_rate || 10}%): +{formatCurrency(Number(item.vat_amount) || 0)}
                              </span>
                              <span>·</span>
                              <span className="capitalize">{item.payment_method || "caja"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right font-mono">
                            <div className="text-xs font-bold text-foreground">
                              {formatCurrency(Number(item.total_amount) || 0)}
                            </div>
                            <span className="text-[9px] text-muted-foreground">
                              {item.fiscal_period_quarter ? `${item.fiscal_period_quarter}T` : ""} {item.fiscal_period_year || ""}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteIncome(item.id)}
                            disabled={deletingId === item.id}
                            className="size-7 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                            title="Eliminar registro"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
