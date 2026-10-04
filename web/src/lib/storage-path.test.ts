import { describe, it, expect } from "vitest";
import { buildStoragePath, extensionForMime, isLegacyRootPath } from "./storage-path";

const BIZ = "63abb270-c1a7-461f-9c84-641d8efff333";
const DOC = "11111111-1111-4111-8111-111111111111";

describe("storage-path (ADR-11)", () => {
  it("construye {business}/{doc}.{ext} desde el MIME, no del nombre", () => {
    expect(buildStoragePath(BIZ, DOC, "application/pdf")).toBe(`${BIZ}/${DOC}.pdf`);
    expect(buildStoragePath(BIZ, DOC, "image/png")).toBe(`${BIZ}/${DOC}.png`);
    expect(buildStoragePath(BIZ, DOC, "image/jpeg")).toBe(`${BIZ}/${DOC}.jpg`);
    expect(buildStoragePath(BIZ, DOC, "image/webp")).toBe(`${BIZ}/${DOC}.webp`);
    expect(buildStoragePath(BIZ, DOC, "image/gif")).toBe(`${BIZ}/${DOC}.gif`);
  });

  it("ignora la extensión del nombre del usuario", () => {
    // aunque el archivo se llame .exe, el MIME manda
    expect(buildStoragePath(BIZ, DOC, "application/pdf")).toBe(`${BIZ}/${DOC}.pdf`);
  });

  it("rechaza MIME no admitidos", () => {
    expect(() => buildStoragePath(BIZ, DOC, "image/tiff")).toThrow();
    expect(() => buildStoragePath(BIZ, DOC, "")).toThrow();
  });

  it("rechaza ids con traversal o barras", () => {
    expect(() => buildStoragePath(`${BIZ}/..`, DOC, "application/pdf")).toThrow();
    expect(() => buildStoragePath(BIZ, "../x", "application/pdf")).toThrow();
    expect(() => buildStoragePath("", DOC, "application/pdf")).toThrow();
  });

  it("extensionForMime normaliza mayúsculas y parámetros", () => {
    expect(extensionForMime("IMAGE/PNG")).toBe("png");
    expect(extensionForMime("image/jpeg; charset=binary")).toBe("jpg");
    expect(extensionForMime("application/zip")).toBeNull();
  });

  it("isLegacyRootPath distingue rutas antiguas", () => {
    expect(isLegacyRootPath("uuid-archivo.pdf")).toBe(true);
    expect(isLegacyRootPath(`${BIZ}/doc.pdf`)).toBe(false);
    expect(isLegacyRootPath("")).toBe(false);
    expect(isLegacyRootPath(null)).toBe(false);
  });
});
