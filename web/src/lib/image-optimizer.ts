/**
 * Utilidad de optimización y redimensionado de imágenes en cliente (ADR-01 & ADR-02)
 *
 * Reduce el lado largo de las imágenes a un máximo de 1600px y comprime a JPEG (calidad 0.85).
 * Conserva la máxima nitidez requerida para OCR fiscal de OpenAI Vision mientras reduce el
 * peso de 4-8 MB a ~200-350 KB (ahorro del 85% en ancho de banda y almacenamiento).
 *
 * Los archivos PDF no se modifican (se conservan como documentos binarios nativos).
 */

export interface ImageOptimizationResult {
  file: File;
  optimized: boolean;
  originalSize: number;
  newSize: number;
  dimensions?: { width: number; height: number };
}

export async function optimizeImage(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<ImageOptimizationResult> {
  const originalSize = file.size;

  // 1. Si es PDF o no es imagen, no tocar
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  const isImage =
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|heic|bmp)$/i.test(file.name);

  if (isPdf || !isImage) {
    return {
      file,
      optimized: false,
      originalSize,
      newSize: originalSize,
    };
  }

  // 2. Cargar la imagen en un elemento HTMLImageElement
  return new Promise((resolve) => {
    // Si no estamos en entorno de navegador, fallback inmediato
    if (typeof window === "undefined") {
      return resolve({
        file,
        optimized: false,
        originalSize,
        newSize: originalSize,
      });
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const srcWidth = img.naturalWidth || img.width;
      const srcHeight = img.naturalHeight || img.height;

      // Calcular factor de escala manteniendo ratio de aspecto
      let targetWidth = srcWidth;
      let targetHeight = srcHeight;
      const longestSide = Math.max(srcWidth, srcHeight);

      if (longestSide > maxDimension) {
        const scale = maxDimension / longestSide;
        targetWidth = Math.round(srcWidth * scale);
        targetHeight = Math.round(srcHeight * scale);
      }

      // 3. Dibujar en canvas con interpolación de alta calidad
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return resolve({
          file,
          optimized: false,
          originalSize,
          newSize: originalSize,
        });
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      // Fondo blanco en caso de transparencias PNG
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // 4. Exportar a JPEG con la calidad definida
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve({
              file,
              optimized: false,
              originalSize,
              newSize: originalSize,
            });
          }

          // Solo sustituir si el resultado es menor o si la resolución era excesiva
          const newSize = blob.size;
          const wasScaledDown = longestSide > maxDimension;

          if (newSize < originalSize || wasScaledDown) {
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            const optimizedFile = new File([blob], `${baseName}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve({
              file: optimizedFile,
              optimized: true,
              originalSize,
              newSize,
              dimensions: { width: targetWidth, height: targetHeight },
            });
          } else {
            resolve({
              file,
              optimized: false,
              originalSize,
              newSize: originalSize,
              dimensions: { width: srcWidth, height: srcHeight },
            });
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Si falla la decodificación por navegador, devolver original intacto
      resolve({
        file,
        optimized: false,
        originalSize,
        newSize: originalSize,
      });
    };

    img.src = objectUrl;
  });
}
