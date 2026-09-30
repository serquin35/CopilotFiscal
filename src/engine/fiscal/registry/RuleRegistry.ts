// src/engine/fiscal/registry/RuleRegistry.ts

import { FiscalRuleSet } from '../types/FiscalRuleSet.js';
import { DEMO_v1 } from '../rules/demo/DEMO_v1.rules.js';

export class RuleRegistry {
  private static instance: RuleRegistry;
  private readonly rules: Map<string, FiscalRuleSet> = new Map();

  private constructor() {
    // Registrar reglas iniciales por defecto
    this.register(DEMO_v1);
  }

  public static getInstance(): RuleRegistry {
    if (!RuleRegistry.instance) {
      RuleRegistry.instance = new RuleRegistry();
    }
    return RuleRegistry.instance;
  }

  public register(ruleSet: FiscalRuleSet): void {
    if (this.rules.has(ruleSet.version)) {
      throw new Error(`FiscalRuleSet with version "${ruleSet.version}" is already registered. RuleSets are immutable.`);
    }
    this.rules.set(ruleSet.version, Object.freeze({ ...ruleSet }));
  }

  public get(version: string): FiscalRuleSet {
    const ruleSet = this.rules.get(version);
    if (!ruleSet) {
      throw new Error(`FiscalRuleSet "${version}" not found in registry.`);
    }
    return ruleSet;
  }

  public getDefault(): FiscalRuleSet {
    return this.get('DEMO_v1');
  }

  public listVersions(): string[] {
    return Array.from(this.rules.keys());
  }
}
