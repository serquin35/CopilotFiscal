# AI POLICY — COPILOTO FISCAL

> **Versión:** 1.0 — 03/10/2026
> **Fuente de verdad:** `COPILOTO_FISCAL_MASTER_PLAN.md` §4, §15.

## Principio

La IA **propone y explica**; el código determinista **valida y calcula**.
Ningún importe fiscal sale de un prompt.

## Permitido

- OCR semántico y extracción de campos (`document_extractions`).
- Clasificación y normalización de proveedores.
- Explicación de resultados del motor y resúmenes.
- Preguntas en lenguaje natural sobre datos existentes (`/copilot`).
- Señales secundarias de anomalía (la decisión es de reglas deterministas).

## Prohibido

- Calcular IVA, saldos o deducibilidad final mediante LLM.
- Inventar facturas, importes, proveedores o fuentes normativas.
- Modificar cifras sin confirmación Human-in-the-Loop.
- Presentar estimaciones como obligaciones oficiales o asesoramiento certificado.
- Afirmar legalidad/ilegalidad sin regla y fuente.

## Trazabilidad obligatoria de cada extracción

`provider`, `model`, `prompt_version`, `raw_payload`, `confidence`,
`extracted_at`. Sin estos campos, la extracción no entra en cálculo.

## Desacoplamiento

Todo acceso a IA pasa por `web/src/lib/ai/` (`AiProvider`,
`OpenAIProvider`, `MockAiProvider`). Modelo activo: `gpt-4o`
(`OPENAI_MODEL`, `.env.example`). `OPENAI_MOCK_STREAM=1` = respuestas
locales sin cuota para desarrollo.
