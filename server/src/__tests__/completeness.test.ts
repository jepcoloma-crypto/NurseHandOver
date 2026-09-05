import { describe, it, expect } from 'vitest';
import {
  computeCompleteness,
  computeSectionBreakdown,
  validateHandoverForSubmission,
  getCompletenessColor,
  getCompletenessBgColor,
  getCompletenessLabel,
  SBAR_SECTIONS,
} from '../lib/completeness.js';
import type { SectionData } from '../lib/completeness.js';

describe('Completeness Engine', () => {
  describe('computeCompleteness - Score Calculation', () => {
    it('should return 0% with no sections', () => {
      const result = computeCompleteness([]);
      expect(result.percentage).toBe(0);
      expect(result.score).toBe(0);
      expect(result.filledCount).toBe(0);
      expect(result.totalCount).toBe(4);
    });

    it('should return 0% with all empty sections', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: '' },
        { sectionType: 'BACKGROUND', content: '   ' },
        { sectionType: 'ASSESSMENT', content: '\n\t' },
        { sectionType: 'RECOMMENDATION', content: '' },
      ];
      const result = computeCompleteness(sections);
      expect(result.percentage).toBe(0);
      expect(result.filledCount).toBe(0);
    });

    it('should return 25% with one section filled', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Patient is stable' },
      ];
      const result = computeCompleteness(sections);
      expect(result.percentage).toBe(25);
      expect(result.filledCount).toBe(1);
    });

    it('should return 50% with two sections filled', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Patient is stable' },
        { sectionType: 'BACKGROUND', content: 'History of diabetes' },
      ];
      const result = computeCompleteness(sections);
      expect(result.percentage).toBe(50);
      expect(result.filledCount).toBe(2);
    });

    it('should return 75% with three sections filled', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Patient is stable' },
        { sectionType: 'BACKGROUND', content: 'History of diabetes' },
        { sectionType: 'ASSESSMENT', content: 'Blood sugar elevated' },
      ];
      const result = computeCompleteness(sections);
      expect(result.percentage).toBe(75);
      expect(result.filledCount).toBe(3);
    });

    it('should return 100% with all sections filled', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Patient is stable' },
        { sectionType: 'BACKGROUND', content: 'History of diabetes' },
        { sectionType: 'ASSESSMENT', content: 'Blood sugar elevated' },
        { sectionType: 'RECOMMENDATION', content: 'Continue monitoring' },
      ];
      const result = computeCompleteness(sections);
      expect(result.percentage).toBe(100);
      expect(result.filledCount).toBe(4);
      expect(result.isComplete).toBe(true);
    });

    it('should handle duplicate section types by using first match', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'First entry' },
        { sectionType: 'SITUATION', content: 'Second entry' },
      ];
      const result = computeCompleteness(sections);
      expect(result.percentage).toBe(25);
      expect(result.filledCount).toBe(1);
    });
  });

  describe('computeCompleteness - Missing Sections', () => {
    it('should identify all sections as missing when empty', () => {
      const result = computeCompleteness([]);
      expect(result.missingSections).toEqual(['SITUATION', 'BACKGROUND', 'ASSESSMENT', 'RECOMMENDATION']);
      expect(result.completedSections).toEqual([]);
      expect(result.incompleteSections).toEqual(['SITUATION', 'BACKGROUND', 'ASSESSMENT', 'RECOMMENDATION']);
    });

    it('should identify missing SITUATION', () => {
      const sections: SectionData[] = [
        { sectionType: 'BACKGROUND', content: 'History' },
        { sectionType: 'ASSESSMENT', content: 'Assessment' },
        { sectionType: 'RECOMMENDATION', content: 'Recommendation' },
      ];
      const result = computeCompleteness(sections);
      expect(result.missingSections).toContain('SITUATION');
      expect(result.completedSections).not.toContain('SITUATION');
    });

    it('should identify missing BACKGROUND', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Situation' },
        { sectionType: 'ASSESSMENT', content: 'Assessment' },
        { sectionType: 'RECOMMENDATION', content: 'Recommendation' },
      ];
      const result = computeCompleteness(sections);
      expect(result.missingSections).toContain('BACKGROUND');
    });

    it('should identify missing ASSESSMENT', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Situation' },
        { sectionType: 'BACKGROUND', content: 'Background' },
        { sectionType: 'RECOMMENDATION', content: 'Recommendation' },
      ];
      const result = computeCompleteness(sections);
      expect(result.missingSections).toContain('ASSESSMENT');
    });

    it('should identify missing RECOMMENDATION', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Situation' },
        { sectionType: 'BACKGROUND', content: 'Background' },
        { sectionType: 'ASSESSMENT', content: 'Assessment' },
      ];
      const result = computeCompleteness(sections);
      expect(result.missingSections).toContain('RECOMMENDATION');
    });

    it('should have no missing sections when all filled', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Situation' },
        { sectionType: 'BACKGROUND', content: 'Background' },
        { sectionType: 'ASSESSMENT', content: 'Assessment' },
        { sectionType: 'RECOMMENDATION', content: 'Recommendation' },
      ];
      const result = computeCompleteness(sections);
      expect(result.missingSections).toEqual([]);
      expect(result.completedSections).toEqual(['SITUATION', 'BACKGROUND', 'ASSESSMENT', 'RECOMMENDATION']);
    });

    it('should not count whitespace-only sections as filled', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: '   ' },
        { sectionType: 'BACKGROUND', content: '\n\t  \n' },
      ];
      const result = computeCompleteness(sections);
      expect(result.percentage).toBe(0);
      expect(result.missingSections).toContain('SITUATION');
      expect(result.missingSections).toContain('BACKGROUND');
    });
  });

  describe('computeCompleteness - Submittable Status', () => {
    it('should not be submittable at 0%', () => {
      const result = computeCompleteness([]);
      expect(result.isSubmittable).toBe(false);
    });

    it('should not be submittable at 25%', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Patient' },
      ];
      const result = computeCompleteness(sections);
      expect(result.isSubmittable).toBe(false);
    });

    it('should be submittable at 50%', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Patient' },
        { sectionType: 'BACKGROUND', content: 'History' },
      ];
      const result = computeCompleteness(sections);
      expect(result.isSubmittable).toBe(true);
    });

    it('should be submittable at 75%', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Patient' },
        { sectionType: 'BACKGROUND', content: 'History' },
        { sectionType: 'ASSESSMENT', content: 'Assessment' },
      ];
      const result = computeCompleteness(sections);
      expect(result.isSubmittable).toBe(true);
    });

    it('should be submittable at 100%', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Patient' },
        { sectionType: 'BACKGROUND', content: 'History' },
        { sectionType: 'ASSESSMENT', content: 'Assessment' },
        { sectionType: 'RECOMMENDATION', content: 'Plan' },
      ];
      const result = computeCompleteness(sections);
      expect(result.isSubmittable).toBe(true);
      expect(result.isComplete).toBe(true);
    });
  });

  describe('computeSectionBreakdown', () => {
    it('should detect empty section', () => {
      const breakdown = computeSectionBreakdown('SITUATION', []);
      expect(breakdown.isPresent).toBe(false);
      expect(breakdown.isEmpty).toBe(true);
      expect(breakdown.contentLength).toBe(0);
      expect(breakdown.wordCount).toBe(0);
    });

    it('should detect filled section', () => {
      const breakdown = computeSectionBreakdown('SITUATION', [
        { sectionType: 'SITUATION', content: 'Patient is stable and comfortable' },
      ]);
      expect(breakdown.isPresent).toBe(true);
      expect(breakdown.isEmpty).toBe(false);
      expect(breakdown.wordCount).toBe(5);
    });

    it('should count words correctly', () => {
      const breakdown = computeSectionBreakdown('BACKGROUND', [
        { sectionType: 'BACKGROUND', content: 'History of diabetes and hypertension' },
      ]);
      expect(breakdown.wordCount).toBe(5);
    });

    it('should handle multi-line content', () => {
      const breakdown = computeSectionBreakdown('ASSESSMENT', [
        { sectionType: 'ASSESSMENT', content: 'Line one\nLine two\nLine three' },
      ]);
      expect(breakdown.isPresent).toBe(true);
      expect(breakdown.wordCount).toBe(6);
    });
  });

  describe('validateHandoverForSubmission', () => {
    it('should reject empty handover', () => {
      const result = validateHandoverForSubmission([]);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject 25% complete handover', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Patient is stable' },
      ];
      const result = validateHandoverForSubmission(sections);
      expect(result.isValid).toBe(false);
    });

    it('should accept 100% complete handover with all sections present', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Patient is stable and comfortable in bed' },
        { sectionType: 'BACKGROUND', content: 'History of diabetes and hypertension' },
        { sectionType: 'ASSESSMENT', content: 'Vital signs within normal limits today' },
        { sectionType: 'RECOMMENDATION', content: 'Continue current treatment plan' },
      ];
      const result = validateHandoverForSubmission(sections);
      expect(result.isValid).toBe(true);
    });

    it('should report missing sections', () => {
      const sections: SectionData[] = [
        { sectionType: 'SITUATION', content: 'Patient is stable' },
      ];
      const result = validateHandoverForSubmission(sections);
      expect(result.errors.some((e) => e.includes('Missing sections'))).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('getCompletenessColor returns correct colors', () => {
      expect(getCompletenessColor(100)).toBe('text-green-600');
      expect(getCompletenessColor(75)).toBe('text-green-600');
      expect(getCompletenessColor(50)).toBe('text-yellow-600');
      expect(getCompletenessColor(25)).toBe('text-orange-600');
      expect(getCompletenessColor(0)).toBe('text-red-600');
    });

    it('getCompletenessBgColor returns correct bg colors', () => {
      expect(getCompletenessBgColor(100)).toBe('bg-green-500');
      expect(getCompletenessBgColor(75)).toBe('bg-green-500');
      expect(getCompletenessBgColor(50)).toBe('bg-yellow-500');
      expect(getCompletenessBgColor(25)).toBe('bg-orange-500');
      expect(getCompletenessBgColor(0)).toBe('bg-red-500');
    });

    it('getCompletenessLabel returns correct labels', () => {
      expect(getCompletenessLabel(100)).toBe('Complete');
      expect(getCompletenessLabel(75)).toBe('Nearly Complete');
      expect(getCompletenessLabel(50)).toBe('Partially Complete');
      expect(getCompletenessLabel(25)).toBe('Barely Started');
      expect(getCompletenessLabel(10)).toBe('Just Started');
      expect(getCompletenessLabel(0)).toBe('Empty');
    });
  });

  describe('SBAR_SECTIONS constant', () => {
    it('should contain all four SBAR sections', () => {
      expect(SBAR_SECTIONS).toEqual(['SITUATION', 'BACKGROUND', 'ASSESSMENT', 'RECOMMENDATION']);
    });

    it('should have exactly 4 sections', () => {
      expect(SBAR_SECTIONS.length).toBe(4);
    });
  });
});
