"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  Clock,
  ExternalLink,
  Search,
  Check,
  Trash2,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/utils";
import { initialDocuments } from "@/lib/mockData";
import { FiscalDocument } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { optimizeImage } from "@/lib/image-optimizer";
import { sha256Hex } from "@/lib/file-hash";

interface BatchProgress {
  total: number;
  uploaded: number;
  extracted: number;
  errors: number;
  duplicates: number;
  isProcessing: boolean;
  phase: "OPTIMIZING" | "UPLOADING" | "EXTRACTING" | "COMPLETED" | "IDLE";
  currentMessage: string;
}

// Pool de concurrencia genérico para controlar la tasa de peticiones simultáneas
async function runConcurrencyPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function next(): Promise<void> {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await worker(items[idx], idx);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => next()
  );
  await Promise.all(workers);
  return results;
}

export default function DocumentsPage() {
  const { business, supabase } = useAuth();
  const currentBizId = business?.id;
  const isDemo = business?.is_demo ?? false;

  const STORAGE_KEY = currentBizId
    ? `copiloto_fiscal_documents_${currentBizId}`
    : "copiloto_fiscal_documents_demo";

  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0,
    uploaded: 0,
    extracted: 0,
    errors: 0,
    duplicates: 0,
    isProcessing: false,
    phase: "IDLE",
    currentMessage: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Cargar documentos guardados localmente y desde Supabase al iniciar
  const loadDocuments = useCallback(async () => {
    if (!currentBizId) return;
    try {
      // Cargar desde localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      let currentDocs = isDemo ? initialDocuments : [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentDocs = parsed;
            setDocuments(parsed);
          }
        } catch {
          // Ignorar error de parsing
        }
      } else if (isDemo) {
        setDocuments(initialDocuments);
      } else {
        setDocuments([]);
      }

      // Consultar Supabase incluyendo document_extractions filtrados por business_id
      const { data: dbDocs, error } = await supabase
        .from("documents")
        .select("*, document_extractions(*)")
        .eq("business_id", currentBizId)
        .order("uploaded_at", { ascending: false });

      if (!error && dbDocs && dbDocs.length > 0) {
        const mappedDbDocs: FiscalDocument[] = dbDocs.map((item: Record<string, unknown>) => {
          const extList = item.document_extractions as Record<string, unknown>[] | null;
          const ext = Array.isArray(extList) && extList.length > 0 ? extList[0] : null;

          let publicUrl = "";
          if (item.storage_path) {
            const { data: urlData } = supabase.storage.from("documents").getPublicUrl(String(item.storage_path));
            publicUrl = urlData?.publicUrl || "";
          }

          return {
            id: String(item.id || ""),
            filename: String(item.original_filename || "Documento"),
            fileSize: Number(item.file_size_bytes) || 120000,
            uploadedAt: String(item.uploaded_at || new Date().toISOString()),
            status: (item.status as FiscalDocument["status"]) || "UPLOADED",
            url: publicUrl,
            providerName: (ext?.extracted_supplier_name as string) || String(item.notes || "Pendiente OCR"),
            nif: (ext?.extracted_supplier_nif as string) || "-",
            invoiceNumber: (ext?.extracted_invoice_number as string) || String(item.id || "").substring(0, 8),
            date: (ext?.extracted_date as string) || String(item.uploaded_at || "").split("T")[0] || new Date().toISOString().split("T")[0],
            baseAmount: Number(ext?.extracted_base_amount || 0),
            vatRate: Number(ext?.extracted_vat_rate || 21),
            vatAmount: Number(ext?.extracted_vat_amount || 0),
            totalAmount: Number(ext?.extracted_total_amount || 0),
            category: (ext?.extracted_category as string) || String(item.type || "Factura"),
            aiNotes: Array.isArray(ext?.extraction_warnings) && ext.extraction_warnings.length > 0
              ? (ext.extraction_warnings as string[]).join(". ")
              : "Sincronizado desde Supabase DB",
          };
        });

        // Unir evitando duplicados por ID
        const combined = [
          ...mappedDbDocs,
          ...currentDocs.filter((cd) => !mappedDbDocs.some((md) => md.id === cd.id)),
        ];
        setDocuments(combined);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      }
    } catch {
      // Fallback suave
    }
  }, [currentBizId, isDemo, STORAGE_KEY, supabase]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 2. Suscripción Supabase Realtime a cambios de estado en tabla documents
  useEffect(() => {
    if (!currentBizId || isDemo) return;

    const channel = supabase
      .channel(`documents-realtime-${currentBizId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "documents",
          filter: `business_id=eq.${currentBizId}`,
        },
        (payload) => {
          const updatedRow = payload.new as { id?: string; status?: FiscalDocument["status"] };
          if (updatedRow?.id) {
            setDocuments((prev) => {
              const updated = prev.map((d) =>
                d.id === updatedRow.id
                  ? { ...d, status: updatedRow.status || d.status }
                  : d
              );
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBizId, isDemo, STORAGE_KEY, supabase]);

  // 3. Polling de respaldo de baja frecuencia solo si hay documentos en estado EXTRACTING
  useEffect(() => {
    const hasExtracting = documents.some((d) => d.status === "EXTRACTING");
    if (!hasExtracting || isDemo) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, 4000);

    return () => clearInterval(interval);
  }, [documents, isDemo, loadDocuments]);

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("¿Deseas eliminar este documento permanentemente?")) return;

    // Actualizar estado local y persistencia
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Eliminar de Supabase DB
    try {
      await supabase.from("expenses").delete().eq("document_id", id);
      await supabase.from("document_extractions").delete().eq("document_id", id);
      await supabase.from("documents").delete().eq("id", id);
    } catch (err) {
      console.warn("Error borrando en Supabase:", err);
    }

    window.dispatchEvent(new Event("fiscal_docs_updated"));
  };

  const handleResetToMock = () => {
    if (!confirm("¿Deseas restablecer la lista con las facturas demo iniciales?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setDocuments(initialDocuments);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  /**
   * PROCESAMIENTO EN BLOQUE DESACOPLADO EN DOS FASES (ADR-01, ADR-02, ADR-03)
   *
   * Fase 1 (Ingesta Rápida Paralela - Concurrencia 3):
   *   - Optimiza y escala imágenes en cliente a máx 1600px JPEG (~250 KB)
   *   - Sube a Supabase Storage
   *   - Registra en DB con status EXTRACTING
   *   - Desbloquea la interfaz inmediatamente y añade los ítems a la tabla
   *
   * Fase 2 (Pool de Extracción n8n - Concurrencia 2):
   *   - Procesa llamadas a n8n con concurrencia máxima 2 para no saturar cuota TPM de OpenAI
   *   - Timeout controlado de 60s
   *   - Actualiza estado a EXTRACTED o NEEDS_REVIEW en tiempo real
   */
  const processUploadedFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    // Sin negocio cargado no se sube nada: evita huérfanos en UUID cero.
    if (!currentBizId) {
      setUploadStatus("Tu negocio aún está cargando. Espera unos segundos e inténtalo de nuevo.");
      return;
    }

    setIsUploading(true);
    const n8nWebhookUrl =
      process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
      process.env.NEXT_N8N_WEBHOOK_URL ||
      "https://n8n.cheosdesign.info/webhook/copilot-document-intake";

    setBatchProgress({
      total: fileList.length,
      uploaded: 0,
      extracted: 0,
      errors: 0,
      duplicates: 0,
      isProcessing: true,
      phase: "UPLOADING",
      currentMessage: `Optimizando e ingiriendo ${fileList.length} archivo${fileList.length > 1 ? "s" : ""}...`,
    });

    // ----------------------------------------------------
    // FASE 1: Ingesta Paralela a Storage + DB (Concurrencia: 3)
    // ----------------------------------------------------
    interface IngestedDoc {
      docId: string;
      storagePath: string;
      filename: string;
      fileSize: number;
      mimeType: string;
      filePublicUrl: string;
    }

    const ingestedDocs: (IngestedDoc | null)[] = await runConcurrencyPool(
      fileList,
      3,
      async (file) => {
        try {
          // Optimización de imagen en cliente (ADR-01 & ADR-02)
          const { file: fileToUpload } = await optimizeImage(file, 1600, 0.85);

          // Hash SHA-256 del fichero final + aviso inmediato si ya existe
          const fileHash = await sha256Hex(fileToUpload);
          const { data: dup } = await supabase
            .from("documents")
            .select("id, original_filename")
            .eq("business_id", currentBizId)
            .eq("hash_sha256", fileHash)
            .limit(1)
            .maybeSingle();

          if (dup) {
            setBatchProgress((prev) => ({
              ...prev,
              uploaded: prev.uploaded + 1,
              duplicates: prev.duplicates + 1,
              currentMessage: `Duplicado omitido: ${file.name} (ya existe como ${String(
                (dup as Record<string, unknown>).original_filename || "documento"
              )})`,
            }));
            return null;
          }

          const newDocUUID = crypto.randomUUID();
          const sanitizedName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const storagePath = `${newDocUUID}-${sanitizedName}`;

          let filePublicUrl = "";

          // Subida a Supabase Storage
          try {
            const { error: storageError } = await supabase.storage
              .from("documents")
              .upload(storagePath, fileToUpload, { cacheControl: "3600", upsert: true });

            if (!storageError) {
              const { data: urlData } = supabase.storage
                .from("documents")
                .getPublicUrl(storagePath);
              filePublicUrl = urlData?.publicUrl || "";
            }
          } catch (err) {
            console.warn("Storage upload warn:", err);
          }

          // Documento provisional en UI (aparece inmediatamente en estado EXTRACTING)
          const newDoc: FiscalDocument = {
            id: newDocUUID,
            filename: file.name,
            fileSize: fileToUpload.size,
            uploadedAt: new Date().toISOString(),
            status: "EXTRACTING",
            category: "Procesando con IA...",
            url: filePublicUrl,
          };

          setDocuments((prev) => {
            const updated = [newDoc, ...prev];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });

          // Inserción en Supabase DB
          try {
            await supabase.from("documents").insert([
              {
                id: newDocUUID,
                business_id: currentBizId,
                type: "invoice",
                direction: "expense",
                storage_path: storagePath,
                original_filename: file.name,
                file_size_bytes: fileToUpload.size,
                mime_type: fileToUpload.type || "application/pdf",
                hash_sha256: fileHash,
                status: "EXTRACTING",
                notes: filePublicUrl ? `URL: ${filePublicUrl}` : "Subido desde panel web",
              },
            ]);
          } catch (err) {
            console.warn("DB insert warn:", err);
          }

          setBatchProgress((prev) => ({
            ...prev,
            uploaded: prev.uploaded + 1,
            currentMessage: `Subido ${prev.uploaded + 1}/${fileList.length}: ${file.name}`,
          }));

          return {
            docId: newDocUUID,
            storagePath,
            filename: file.name,
            fileSize: fileToUpload.size,
            mimeType: fileToUpload.type || "application/pdf",
            filePublicUrl,
          };
        } catch (err) {
          console.error("Error en ingesta de archivo:", file.name, err);
          setBatchProgress((prev) => ({
            ...prev,
            uploaded: prev.uploaded + 1,
            errors: prev.errors + 1,
          }));
          return null;
        }
      }
    );

    const validIngested = ingestedDocs.filter((d): d is IngestedDoc => d !== null);

    // ----------------------------------------------------
    // FASE 2: Pool de Extracción con Concurrencia Controlada (Máx 2 llamadas simultáneas)
    // ----------------------------------------------------
    setBatchProgress((prev) => ({
      ...prev,
      phase: "EXTRACTING",
      currentMessage: `Extrayendo datos fiscales con IA (${validIngested.length} en cola)...`,
    }));

    await runConcurrencyPool(validIngested, 2, async (doc) => {
      try {
        const payload = {
          documentId: doc.docId,
          businessId: currentBizId,
          storagePath: doc.storagePath,
          originalFilename: doc.filename,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          fileUrl: doc.filePublicUrl,
          uploadedAt: new Date().toISOString(),
        };

        const response = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(60000),
        });

        if (response.ok) {
          const result = await response.json();
          const ext = result.extracted || {};
          const status = (result.status === "EXTRACTED" ? "EXTRACTED" : "NEEDS_REVIEW") as FiscalDocument["status"];

          setDocuments((prev) => {
            const updated = prev.map((d) =>
              d.id === doc.docId
                ? {
                    ...d,
                    status: status,
                    providerName: ext.supplier_name || "Proveedor detectado",
                    nif: ext.supplier_nif || "-",
                    invoiceNumber: ext.invoice_number || `F-${doc.docId.slice(-4).toUpperCase()}`,
                    date: ext.date || new Date().toISOString().split("T")[0],
                    baseAmount: Number(ext.base_amount || 0),
                    vatRate: Number(ext.vat_rate || 21),
                    vatAmount: Number(ext.vat_amount || 0),
                    totalAmount: Number(ext.total_amount || 0),
                    category: ext.category || "Factura",
                    aiNotes: result.warnings && result.warnings.length > 0
                      ? result.warnings.join(". ")
                      : "Extracción OpenAI completada con éxito.",
                    url: doc.filePublicUrl || d.url,
                  }
                : d
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });

          setBatchProgress((prev) => ({
            ...prev,
            extracted: prev.extracted + 1,
            currentMessage: `Extracción completada (${prev.extracted + 1}/${validIngested.length})`,
          }));
        } else {
          // n8n respondió con error (ej: 500) -> marcar como NEEDS_REVIEW
          setDocuments((prev) => {
            const updated = prev.map((d) =>
              d.id === doc.docId
                ? {
                    ...d,
                    status: "NEEDS_REVIEW" as FiscalDocument["status"],
                    aiNotes: `Respuesta n8n HTTP ${response.status}. Pendiente de revisión manual.`,
                  }
                : d
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });

          setBatchProgress((prev) => ({
            ...prev,
            errors: prev.errors + 1,
            currentMessage: `Revisión requerida para ${doc.filename}`,
          }));
        }
      } catch (fetchErr: unknown) {
        // Timeout o fallo de red
        const errMsg = fetchErr instanceof Error ? fetchErr.message : "error de red";
        setDocuments((prev) => {
          const updated = prev.map((d) =>
            d.id === doc.docId
              ? {
                  ...d,
                  status: "NEEDS_REVIEW" as FiscalDocument["status"],
                  aiNotes: `Webhook n8n (${errMsg}). Pendiente de revisión manual.`,
                }
              : d
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });

        setBatchProgress((prev) => ({
          ...prev,
          errors: prev.errors + 1,
        }));
      }
    });

    setIsUploading(false);
    setBatchProgress((prev) => ({
      ...prev,
      phase: "COMPLETED",
      isProcessing: false,
      currentMessage: `Lote completado: ${prev.extracted} extraídos con éxito${
        prev.duplicates > 0 ? `, ${prev.duplicates} duplicado${prev.duplicates > 1 ? "s" : ""} omitido${prev.duplicates > 1 ? "s" : ""}` : ""
      }${prev.errors > 0 ? `, ${prev.errors} para revisión manual` : ""}.`,
    }));

    window.dispatchEvent(new Event("fiscal_docs_updated"));

    // Ocultar banner de lote después de 7 segundos
    setTimeout(() => {
      setBatchProgress((prev) => ({ ...prev, phase: "IDLE" }));
      setUploadStatus(null);
    }, 7000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(e.target.files);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesFilter =
      filter === "ALL"
        ? true
        : filter === "PENDING"
        ? doc.status === "PENDING_REVIEW" || doc.status === "EXTRACTING"
        : filter === "REVIEWED"
        ? doc.status === "REVIEWED"
        : filter === "ANOMALIES"
        ? (doc.anomalies && doc.anomalies.length > 0)
        : true;

    const matchesSearch =
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.providerName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (doc.nif?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Header */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          Ingesta &amp; Pipeline n8n
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Gestión de Documentos y Facturas
        </h1>
        <p className="text-sm text-muted-foreground">
          Sube facturas o tickets (PDF, JPG, PNG). Se guardan de forma persistente y el pipeline de n8n dispara la extracción OCR vía OpenAI.
        </p>
      </div>

      {/* Aviso piloto (temporal, tarea A): qué se procesa y con qué límites */}
      <div
        role="alert"
        className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs leading-relaxed text-foreground"
      >
        <strong>Entorno piloto:</strong> tus documentos se procesan con IA de un
        tercero (OpenAI) y las cifras son estimativas, no válidas para presentar
        impuestos. Sube solo documentos de tu propio negocio o con permiso de su titular.
      </div>

      {/* 2. Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 md:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-border/80 bg-card hover:border-primary/50 hover:bg-card/80"
        } ${isUploading ? "opacity-80 cursor-wait" : ""}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          disabled={isUploading}
        />
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary mb-4 border border-primary/20">
          {isUploading ? (
            <Loader2 className="size-7 animate-spin" />
          ) : (
            <UploadCloud className="size-7" />
          )}
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {isUploading
            ? "Procesando documentos en segundo plano..."
            : "Arrastra aquí tus facturas o haz clic para examinar"}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          Soporta subida en bloque de tickets y facturas (PDF multipágina, JPG, PNG). Optimización automática de resolución en cliente (§23).
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-[11px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <Check className="size-3 text-primary" /> Redimensionado Inteligente (1600px)
          </span>
          <span className="flex items-center gap-1">
            <Check className="size-3 text-primary" /> Supabase Storage
          </span>
          <span className="flex items-center gap-1">
            <Check className="size-3 text-primary" /> Pool Asíncrono n8n
          </span>
          <span className="flex items-center gap-1">
            <Check className="size-3 text-primary" /> Realtime Sync
          </span>
        </div>

        {uploadStatus && !batchProgress.isProcessing && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium border border-primary/30 animate-pulse">
            <Clock className="size-3.5 animate-spin" />
            <span>{uploadStatus}</span>
          </div>
        )}
      </div>

      {/* 2.1 Batch Progress Card (Two-phase batch upload - ADR-03) */}
      {batchProgress.phase !== "IDLE" && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-6 backdrop-blur-md transition-all shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                {batchProgress.phase === "COMPLETED" ? (
                  <CheckCircle2 className="size-5 text-primary" />
                ) : (
                  <Loader2 className="size-5 animate-spin text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {batchProgress.phase === "UPLOADING" && "Fase 1: Ingesta rápida y optimización de imágenes"}
                    {batchProgress.phase === "EXTRACTING" && "Fase 2: Extracción fiscal con IA (Pool de concurrencia)"}
                    {batchProgress.phase === "COMPLETED" && "Lote completado con éxito"}
                  </h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
                    {Math.min(
                      100,
                      Math.round(
                        ((batchProgress.uploaded * 0.4 + batchProgress.extracted * 0.6) /
                          (batchProgress.total || 1)) *
                          100
                      )
                    )}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {batchProgress.currentMessage}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center text-xs font-mono">
              <span className="px-2.5 py-1 rounded-md bg-background/80 border border-border text-foreground">
                Subidos: <strong className="text-primary">{batchProgress.uploaded}</strong>/{batchProgress.total}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-background/80 border border-border text-foreground">
                Extraídos: <strong className="text-primary">{batchProgress.extracted}</strong>/{batchProgress.total}
              </span>
              {batchProgress.errors > 0 && (
                <span className="px-2.5 py-1 rounded-md bg-warning/15 border border-warning/30 text-warning font-semibold">
                  Revisión: {batchProgress.errors}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4">
            <ProgressBar
              value={Math.min(
                100,
                Math.round(
                  ((batchProgress.uploaded * 0.4 + batchProgress.extracted * 0.6) /
                    (batchProgress.total || 1)) *
                    100
                )
              )}
              className="h-2"
            />
          </div>

          {batchProgress.phase === "EXTRACTING" && (
            <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
              <Sparkles className="size-3 text-primary shrink-0" />
              <span>
                <strong>Proceso no bloqueante:</strong> Puedes continuar navegando y validando facturas. La tabla se actualiza automáticamente en segundo plano conforme la IA finaliza cada documento.
              </span>
            </p>
          )}
        </div>
      )}

      {/* 3. Document Repository List */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Archivos en el Sistema ({documents.length})</CardTitle>
            <CardDescription>
              Trazabilidad completa con visor y validación paso a paso
            </CardDescription>
          </div>

          {/* Controls: Search + Filter Tabs + Reset */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por proveedor, NIF o archivo..."
                className="h-8 w-full sm:w-64 rounded-lg border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="inline-flex rounded-lg bg-muted p-1">
              {[
                { id: "ALL", label: "Todos" },
                { id: "PENDING", label: "Pendientes" },
                { id: "ANOMALIES", label: "Con Alertas" },
                { id: "REVIEWED", label: "Aprobados" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    filter === tab.id
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToMock}
              className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              title="Restablecer facturas demo"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">Restablecer</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No se han encontrado documentos con los criterios seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="pb-3 font-medium">Documento</th>
                    <th className="pb-3 font-medium">Fecha Subida</th>
                    <th className="pb-3 font-medium">Proveedor</th>
                    <th className="pb-3 font-medium text-right">Base</th>
                    <th className="pb-3 font-medium text-right">Total</th>
                    <th className="pb-3 font-medium text-center">Estado</th>
                    <th className="pb-3 font-medium text-center">Alertas</th>
                    <th className="pb-3 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 pr-2 font-sans font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground shrink-0" />
                          <div>
                            <div className="text-xs truncate max-w-[200px]">{doc.filename}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {(doc.fileSize / 1024).toFixed(0)} KB
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-muted-foreground font-sans text-xs">
                        {formatDate(doc.uploadedAt)}
                      </td>
                      <td className="py-3.5 px-2 font-sans">
                        <div className="text-foreground">{doc.providerName || "Por clasificar"}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{doc.nif || "-"}</div>
                      </td>
                      <td className="py-3.5 px-2 text-right text-foreground">
                        {doc.baseAmount ? formatCurrency(doc.baseAmount) : "-"}
                      </td>
                      <td className="py-3.5 px-2 text-right font-semibold text-foreground">
                        {doc.totalAmount ? formatCurrency(doc.totalAmount) : "-"}
                      </td>
                      <td className="py-3.5 px-2 text-center font-sans">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-3.5 px-2 text-center font-sans">
                        {doc.anomalies && doc.anomalies.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-destructive bg-destructive/15 px-2 py-0.5 rounded-full border border-destructive/20 font-medium">
                            <AlertTriangle className="size-3" /> {doc.anomalies.length}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 pl-2 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/documents/${doc.id}/review`}>
                            <Button
                              size="sm"
                              variant={doc.status === "PENDING_REVIEW" ? "primary" : "secondary"}
                              className="text-xs h-7 gap-1"
                            >
                              <span>Revisar</span>
                              <ExternalLink className="size-3" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDeleteDocument(doc.id, e)}
                            className="size-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar documento"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
