// src/engine/fiscal/anomaly/rules/DuplicateDocumentRule.ts

export interface DuplicateDocumentCheckInput {
  documentId: string;
  hashSha256: string;
  existingHashes: Array<{ documentId: string; hashSha256: string; filename: string }>;
}

export class DuplicateDocumentRule {
  public static check(input: DuplicateDocumentCheckInput) {
    const match = input.existingHashes.find(
      (doc) => doc.hashSha256 === input.hashSha256 && doc.documentId !== input.documentId
    );

    if (match) {
      return {
        severity: 'high' as const,
        type: 'DUPLICATE_DOCUMENT',
        title: 'Documento duplicado detectado',
        description: `El documento tiene el mismo hash criptográfico SHA-256 que el archivo existente "${match.filename}".`,
        evidence: {
          duplicateOfDocumentId: match.documentId,
          duplicateOfFilename: match.filename,
          hashSha256: input.hashSha256
        },
        entityType: 'document' as const,
        entityId: input.documentId,
        source: 'system' as const
      };
    }

    return null;
  }
}
