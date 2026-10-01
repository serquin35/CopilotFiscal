"use client";

import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { initialDocuments } from "@/lib/mockData";
import { FiscalDocument } from "@/types";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "copiloto_fiscal_documents_v1";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<FiscalDocument[]>(initialDocuments);
  const [filter, setFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Cargar documentos guardados localmente y desde Supabase al iniciar
  const loadDocuments = async () => {
    try {
      // Cargar desde localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      let currentDocs = initialDocuments;
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
      }

      // Consultar Supabase incluyendo document_extractions
      const { data: dbDocs, error } = await supabase
        .from("documents")
        .select("*, document_extractions(*)")
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
  };

  useEffect(() => {
    loadDocuments();
  }, []);

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

  const processUploadedFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    const n8nWebhookUrl =
      process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
      process.env.NEXT_N8N_WEBHOOK_URL ||
      "https://n8n.cheosdesign.info/webhook/copilot-document-intake";

    for (const file of Array.from(files)) {
      setUploadStatus(`Subiendo ${file.name} a Supabase Storage...`);

      const newDocUUID = crypto.randomUUID();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${newDocUUID}-${sanitizedName}`;

      let filePublicUrl = "";

      // 1. Subida a Supabase Storage (Bucket "documents")
      try {
        const { error: storageError } = await supabase.storage
          .from("documents")
          .upload(storagePath, file, { cacheControl: "3600", upsert: true });

        if (!storageError) {
          const { data: urlData } = supabase.storage
            .from("documents")
            .getPublicUrl(storagePath);
          filePublicUrl = urlData?.publicUrl || "";
        }
      } catch (err) {
        console.warn("Storage upload warn:", err);
      }

      // 2. Crear documento provisional en UI
      const newDocId = newDocUUID;
      const newDoc: FiscalDocument = {
        id: newDocId,
        filename: file.name,
        fileSize: file.size,
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

      // 3. Insertar registro en Supabase DB
      try {
        await supabase.from("documents").insert([
          {
            id: newDocId,
            business_id: "00000000-0000-0000-0000-000000000001",
            type: "invoice",
            direction: "expense",
            storage_path: storagePath,
            original_filename: file.name,
            file_size_bytes: file.size,
            mime_type: file.type || "application/pdf",
            status: "EXTRACTING",
            notes: filePublicUrl ? `URL: ${filePublicUrl}` : "Subido desde panel web",
          },
        ]);
      } catch (err) {
        console.warn("DB insert warn:", err);
      }

      // 4. Disparar Webhook real de n8n
      setUploadStatus(`Extrayendo datos fiscales con OpenAI Vision...`);
      try {
        const payload = {
          documentId: newDocId,
          businessId: "00000000-0000-0000-0000-000000000001",
          storagePath: storagePath,
          originalFilename: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/pdf",
          fileUrl: filePublicUrl,
          uploadedAt: new Date().toISOString(),
        };

        const response = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          setUploadStatus("¡Extracción OpenAI completada con éxito!");

          const ext = result.extracted || {};
          const status = (result.status === "EXTRACTED" ? "EXTRACTED" : "PENDING_REVIEW") as FiscalDocument["status"];

          setDocuments((prev) => {
            const updated = prev.map((d) =>
              d.id === newDocId
                ? {
                    ...d,
                    status: status,
                    providerName: ext.supplier_name || "Proveedor detectado",
                    nif: ext.supplier_nif || "-",
                    invoiceNumber: ext.invoice_number || `F-${newDocUUID.slice(-4).toUpperCase()}`,
                    date: ext.date || new Date().toISOString().split("T")[0],
                    baseAmount: Number(ext.base_amount || 0),
                    vatRate: Number(ext.vat_rate || 21),
                    vatAmount: Number(ext.vat_amount || 0),
                    totalAmount: Number(ext.total_amount || 0),
                    category: ext.category || "Factura",
                    aiNotes: result.warnings && result.warnings.length > 0
                      ? result.warnings.join(". ")
                      : "Extracción OpenAI completada satisfactoriamente.",
                    url: filePublicUrl || d.url,
                  }
                : d
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            window.dispatchEvent(new Event("fiscal_docs_updated"));
            return updated;
          });
        } else {
          setUploadStatus(`n8n respondió HTTP ${response.status}. Documento guardado.`);
        }
      } catch (fetchErr: unknown) {
        const errMsg = fetchErr instanceof Error ? fetchErr.message : "error de red";
        setUploadStatus("Guardado localmente (Webhook: " + errMsg + ")");
      }
    }

    setIsUploading(false);
    setTimeout(() => setUploadStatus(null), 5000);
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
        }`}
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
          <UploadCloud className="size-7" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          Arrastra aquí tus facturas o haz clic para examinar
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          Soporta archivos PDF multipágina, imágenes JPG y PNG de tickets. Límite máximo: 25 MB por archivo.
        </p>
        <div className="flex items-center gap-4 mt-4 text-[11px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <Check className="size-3 text-primary" /> Supabase Storage
          </span>
          <span className="flex items-center gap-1">
            <Check className="size-3 text-primary" /> Webhook n8n
          </span>
          <span className="flex items-center gap-1">
            <Check className="size-3 text-primary" /> Persistencia Local &amp; DB
          </span>
        </div>

        {uploadStatus && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium border border-primary/30 animate-pulse">
            <Clock className="size-3.5 animate-spin" />
            <span>{uploadStatus}</span>
          </div>
        )}
      </div>

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
