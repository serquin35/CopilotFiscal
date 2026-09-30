# Reglas Fiscales - Copiloto Fiscal

Este directorio contiene las definiciones declarativas y deterministas de conjuntos de reglas fiscales (`FiscalRuleSet`).

## Estructura
- `/demo/DEMO_v1.rules.ts`: Conjunto de reglas ficticias para el entorno sandbox/DEMO.
- Los conjuntos de reglas reales (ej. `ES_RETA_2026_v1.ts`) deben crearse con referencias directas al BOE/AEAT y someterse a auditoría técnica antes de su registro.

## Reglas para añadir un nuevo conjunto
1. Debe implementar estrictamente la interfaz `FiscalRuleSet`.
2. Las tasas impositivas y porcentajes de deductibilidad deben ser inmutables.
3. Todo nuevo conjunto debe registrarse en `RuleRegistry`.
