// src/engine/fiscal/validators/DocumentValidator.ts

import { ValidationIssue } from './ExpenseValidator.js';

export interface DocumentValidationPayload {
  type: string;
  direction: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  hashSha256?: string;
}

export class DocumentValidator {
  private static readonly ALLOWED_TYPES = ['invoice', 'ticket', 'receipt', 'credit_note', 'other'];
  private static readonly ALLOWED_DIRECTIONS = ['expense', 'income'];
  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];
  private static readonly MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

  public static validate(payload: DocumentValidationPayload): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.ALLOWED_TYPES.includes(payload.type)) {
      issues.push({
        field: 'type',
        code: 'INVALID_DOCUMENT_TYPE',
        message: `Tipo de documento no válido: "${payload.type}".`,
        severity: 'error'
      });
    }

    if (!this.ALLOWED_DIRECTIONS.includes(payload.direction)) {
      issues.push({
        field: 'direction',
        code: 'INVALID_DIRECTION',
        message: `Dirección no válida: "${payload.direction}". Debe ser "expense" o "income".`,
        severity: 'error'
      });
    }

    if (!this.ALLOWED_MIME_TYPES.includes(payload.mimeType)) {
      issues.push({
        field: 'mimeType',
        code: 'UNSUPPORTED_MIME_TYPE',
        message: `Formato de archivo no soportado: "${payload.mimeType}". Se admiten PDF, JPEG, PNG y WebP.`,
        severity: 'error'
      });
    }

    if (payload.fileSizeBytes <= 0) {
      issues.push({
        field: 'fileSizeBytes',
        code: 'EMPTY_FILE',
        message: 'El archivo está vacío.',
        severity: 'error'
      });
    } else if (payload.fileSizeBytes > this.MAX_FILE_SIZE_BYTES) {
      issues.push({
        field: 'fileSizeBytes',
        code: 'FILE_TOO_LARGE',
        message: `El archivo supera el tamaño máximo permitido (${this.MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB).`,
        severity: 'error'
      });
    }

    return issues;
  }
}
