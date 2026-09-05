export const SBAR_SECTIONS = ['SITUATION', 'BACKGROUND', 'ASSESSMENT', 'RECOMMENDATION'] as const;

export type SbarSection = (typeof SBAR_SECTIONS)[number];

export interface SectionData {
  sectionType: string;
  content: string;
}

export interface CompletenessBreakdown {
  sectionType: SbarSection;
  label: string;
  isPresent: boolean;
  contentLength: number;
  wordCount: number;
  isEmpty: boolean;
}

export interface CompletenessResult {
  score: number;
  filledCount: number;
  totalCount: number;
  percentage: number;
  isComplete: boolean;
  isSubmittable: boolean;
  sections: CompletenessBreakdown[];
  missingSections: SbarSection[];
  completedSections: SbarSection[];
  incompleteSections: SbarSection[];
  minimumRequired: number;
}

const SECTION_LABELS: Record<SbarSection, string> = {
  SITUATION: 'Situation',
  BACKGROUND: 'Background',
  ASSESSMENT: 'Assessment',
  RECOMMENDATION: 'Recommendation',
};

const MINIMUM_SUBMITTABLE_PERCENTAGE = 50;

export function computeSectionBreakdown(
  sectionType: SbarSection,
  sections: SectionData[],
): CompletenessBreakdown {
  const section = sections.find((s) => s.sectionType === sectionType);
  const content = section?.content || '';
  const trimmed = content.trim();
  const isEmpty = trimmed.length === 0;
  const wordCount = isEmpty ? 0 : trimmed.split(/\s+/).filter(Boolean).length;

  return {
    sectionType,
    label: SECTION_LABELS[sectionType],
    isPresent: !isEmpty,
    contentLength: trimmed.length,
    wordCount,
    isEmpty,
  };
}

export function computeCompleteness(sections: SectionData[]): CompletenessResult {
  const breakdowns = SBAR_SECTIONS.map((type) => computeSectionBreakdown(type, sections));

  const filledCount = breakdowns.filter((b) => b.isPresent).length;
  const totalCount = SBAR_SECTIONS.length;
  const percentage = Math.round((filledCount / totalCount) * 100);

  const completedSections = breakdowns.filter((b) => b.isPresent).map((b) => b.sectionType);
  const missingSections = breakdowns.filter((b) => b.isEmpty).map((b) => b.sectionType);
  const incompleteSections = missingSections;

  return {
    score: percentage,
    filledCount,
    totalCount,
    percentage,
    isComplete: percentage === 100,
    isSubmittable: percentage >= MINIMUM_SUBMITTABLE_PERCENTAGE,
    sections: breakdowns,
    missingSections,
    completedSections,
    incompleteSections,
    minimumRequired: MINIMUM_SUBMITTABLE_PERCENTAGE,
  };
}

export function validateHandoverForSubmission(sections: SectionData[]): {
  isValid: boolean;
  errors: string[];
  completeness: CompletenessResult;
} {
  const completeness = computeCompleteness(sections);
  const errors: string[] = [];

  if (!completeness.isSubmittable) {
    errors.push(
      `Handover must be at least ${MINIMUM_SUBMITTABLE_PERCENTAGE}% complete to submit for review (currently ${completeness.percentage}%)`,
    );
  }

  if (completeness.missingSections.length > 0) {
    const missingLabels = completeness.missingSections.map((s) => SECTION_LABELS[s]).join(', ');
    errors.push(`Missing sections: ${missingLabels}`);
  }

  for (const section of completeness.sections) {
    if (section.isPresent && section.contentLength < 10) {
      errors.push(`${section.label} section is too short (minimum 10 characters)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    completeness,
  };
}

export function getCompletenessColor(percentage: number): string {
  if (percentage >= 75) return 'text-green-600';
  if (percentage >= 50) return 'text-yellow-600';
  if (percentage >= 25) return 'text-orange-600';
  return 'text-red-600';
}

export function getCompletenessBgColor(percentage: number): string {
  if (percentage >= 75) return 'bg-green-500';
  if (percentage >= 50) return 'bg-yellow-500';
  if (percentage >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getCompletenessLabel(percentage: number): string {
  if (percentage === 100) return 'Complete';
  if (percentage >= 75) return 'Nearly Complete';
  if (percentage >= 50) return 'Partially Complete';
  if (percentage >= 25) return 'Barely Started';
  if (percentage > 0) return 'Just Started';
  return 'Empty';
}
