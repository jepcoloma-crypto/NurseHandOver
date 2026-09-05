import { computeCompleteness, validateHandoverForSubmission, SBAR_SECTIONS, type SectionData, type CompletenessResult } from './completeness.js';

export interface HandoverValidationConfig {
  minimumPercentage: number;
  requiredSections: string[];
  minimumSectionLength: number;
  maximumSectionLength: number;
}

export const DEFAULT_VALIDATION_CONFIG: HandoverValidationConfig = {
  minimumPercentage: 50,
  requiredSections: [...SBAR_SECTIONS],
  minimumSectionLength: 10,
  maximumSectionLength: 5000,
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completeness: CompletenessResult;
  fieldErrors: Record<string, string[]>;
}

export function validateHandoverSections(
  sections: SectionData[],
  config: HandoverValidationConfig = DEFAULT_VALIDATION_CONFIG,
): ValidationResult {
  const completeness = computeCompleteness(sections);
  const errors: string[] = [];
  const warnings: string[] = [];
  const fieldErrors: Record<string, string[]> = {};

  if (completeness.percentage < config.minimumPercentage) {
    errors.push(
      `Handover must be at least ${config.minimumPercentage}% complete to submit (currently ${completeness.percentage}%)`,
    );
  }

  for (const requiredSection of config.requiredSections) {
    const section = sections.find((s) => s.sectionType === requiredSection);
    if (!section || section.content.trim().length === 0) {
      errors.push(`Section "${requiredSection}" is required`);
      if (!fieldErrors[requiredSection]) fieldErrors[requiredSection] = [];
      fieldErrors[requiredSection].push('This section is required');
    }
  }

  for (const section of sections) {
    const trimmed = section.content.trim();
    if (trimmed.length > 0 && trimmed.length < config.minimumSectionLength) {
      warnings.push(`Section "${section.sectionType}" is very short (${trimmed.length} characters, minimum recommended: ${config.minimumSectionLength})`);
      if (!fieldErrors[section.sectionType]) fieldErrors[section.sectionType] = [];
      fieldErrors[section.sectionType].push(`Content is too short (${trimmed.length}/${config.minimumSectionLength} characters)`);
    }

    if (trimmed.length > config.maximumSectionLength) {
      errors.push(`Section "${section.sectionType}" exceeds maximum length (${trimmed.length}/${config.maximumSectionLength})`);
      if (!fieldErrors[section.sectionType]) fieldErrors[section.sectionType] = [];
      fieldErrors[section.sectionType].push(`Content exceeds maximum length (${trimmed.length}/${config.maximumSectionLength})`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completeness,
    fieldErrors,
  };
}

export function validateHandoverMetadata(data: {
  patientId?: string;
  shiftId?: string;
  outgoingNurseId?: string;
}): string[] {
  const errors: string[] = [];

  if (!data.patientId) errors.push('Patient is required');
  if (!data.shiftId) errors.push('Shift is required');
  if (!data.outgoingNurseId) errors.push('Outgoing nurse is required');

  return errors;
}

export { computeCompleteness, validateHandoverForSubmission, SBAR_SECTIONS };
export type { SectionData, CompletenessResult };
