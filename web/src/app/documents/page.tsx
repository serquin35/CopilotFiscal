"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  Clock,
  ExternalLink,
  Search,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { initialDocuments } from "@/lib/mockData";
import { FiscalDocument } from "@/types";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<FiscalDocument[]>(initialDocuments);
  const [filter, setFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processUploadedFiles = (files: FileList | File[]) => {
    setUploadStatus("Procesando y enviando a n8n...");
    Array.from(files).forEach((file, index) => {
      const newDoc: FiscalDocument = {
        id: `doc-${Date.now()}-${index}`,
        filename: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        status: "EXTRACTING",
        category: "Pendiente de clasificación",
      };

      setDocuments((prev) => [newDoc, ...prev]);

      // Simulación de pipeline n8n: EXTRACTING -> PENDING_REVIEW
      setTimeout(() => {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === newDoc.id
              ? {
                  ...d,
                  status: "PENDING_REVIEW",
                  providerName: "Proveedor Analizado IA",
                  nif: "B" + Math.floor(10000000 + Math.random() * 90000000),
                  invoiceNumber: "F-2026-" + Math.floor(100 + Math.random() * 900),
                  date: new Date().toISOString().split("T")[0],
                  baseAmount: 150.0,
                  vatRate: 21,
                  vatAmount: 31.5,
                  totalAmount: 181.5,
                  aiNotes: "Extracción realizada con OpenAI gpt-4o. Verificado NIF en censo.",
                }
              : d
          )
        );
        setUploadStatus("¡Documento procesado por n8n con éxito!");
        setTimeout(() => setUploadStatus(null), 4000);
      }, 2500);
    });
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
      (doc.filename.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
          Sube facturas o tickets (PDF, JPG, PNG). Se almacenarán de forma inmutable en Supabase Storage y el pipeline de n8n iniciará la extracción OCR vía OpenAI.
        </p>
      </div>

      {/* 2. Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
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
            <Check className="size-3 text-primary" /> Hash SHA-256
          </span>
          <span className="flex items-center gap-1">
            <Check className="size-3 text-primary" /> Supabase Storage
          </span>
          <span className="flex items-center gap-1">
            <Check className="size-3 text-primary" /> Webhook n8n
          </span>
        </div>

        {uploadStatus && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium border border-primary/30">
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

          {/* Controls: Search + Filter Tabs */}
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
