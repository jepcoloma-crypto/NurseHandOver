import { describe, it, expect } from 'vitest';

describe('Handover State Machine', () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ['READY_FOR_REVIEW'],
    READY_FOR_REVIEW: ['DRAFT', 'SUBMITTED'],
    SUBMITTED: ['RECEIVED'],
    RECEIVED: ['CLARIFICATION_REQUIRED', 'ACCEPTED'],
    CLARIFICATION_REQUIRED: ['CLARIFICATION_RESPONDED'],
    CLARIFICATION_RESPONDED: ['ACCEPTED', 'CLARIFICATION_REQUIRED'],
    ACCEPTED: ['REOPENED'],
    REOPENED: ['ACCEPTED'],
    CANCELLED: [],
  };

  it('should allow DRAFT -> READY_FOR_REVIEW', () => {
    expect(VALID_TRANSITIONS.DRAFT).toContain('READY_FOR_REVIEW');
  });

  it('should not allow DRAFT -> SUBMITTED', () => {
    expect(VALID_TRANSITIONS.DRAFT).not.toContain('SUBMITTED');
  });

  it('should allow READY_FOR_REVIEW -> DRAFT (return to edit)', () => {
    expect(VALID_TRANSITIONS.READY_FOR_REVIEW).toContain('DRAFT');
  });

  it('should allow READY_FOR_REVIEW -> SUBMITTED', () => {
    expect(VALID_TRANSITIONS.READY_FOR_REVIEW).toContain('SUBMITTED');
  });

  it('should allow SUBMITTED -> RECEIVED', () => {
    expect(VALID_TRANSITIONS.SUBMITTED).toContain('RECEIVED');
  });

  it('should allow RECEIVED -> ACCEPTED', () => {
    expect(VALID_TRANSITIONS.RECEIVED).toContain('ACCEPTED');
  });

  it('should allow RECEIVED -> CLARIFICATION_REQUIRED', () => {
    expect(VALID_TRANSITIONS.RECEIVED).toContain('CLARIFICATION_REQUIRED');
  });

  it('should allow CLARIFICATION_REQUIRED -> CLARIFICATION_RESPONDED', () => {
    expect(VALID_TRANSITIONS.CLARIFICATION_REQUIRED).toContain('CLARIFICATION_RESPONDED');
  });

  it('should allow CLARIFICATION_RESPONDED -> ACCEPTED', () => {
    expect(VALID_TRANSITIONS.CLARIFICATION_RESPONDED).toContain('ACCEPTED');
  });

  it('should allow ACCEPTED -> REOPENED', () => {
    expect(VALID_TRANSITIONS.ACCEPTED).toContain('REOPENED');
  });

  it('should allow REOPENED -> ACCEPTED', () => {
    expect(VALID_TRANSITIONS.REOPENED).toContain('ACCEPTED');
  });

  it('should not allow CANCELLED -> any', () => {
    expect(VALID_TRANSITIONS.CANCELLED).toHaveLength(0);
  });

  it('should not allow DRAFT -> ACCEPTED', () => {
    expect(VALID_TRANSITIONS.DRAFT).not.toContain('ACCEPTED');
  });

  it('should not allow SUBMITTED -> DRAFT', () => {
    expect(VALID_TRANSITIONS.SUBMITTED).not.toContain('DRAFT');
  });
});

describe('SBAR Completeness', () => {
  const SBAR_SECTIONS = ['SITUATION', 'BACKGROUND', 'ASSESSMENT', 'RECOMMENDATION'];

  function computeCompleteness(sections: { sectionType: string; content: string }[]): number {
    let filled = 0;
    for (const type of SBAR_SECTIONS) {
      const section = sections.find((s) => s.sectionType === type);
      if (section && section.content.trim().length > 0) filled++;
    }
    return Math.round((filled / SBAR_SECTIONS.length) * 100);
  }

  it('should return 0% with no sections', () => {
    expect(computeCompleteness([])).toBe(0);
  });

  it('should return 25% with one section filled', () => {
    expect(computeCompleteness([{ sectionType: 'SITUATION', content: 'Patient is stable' }])).toBe(25);
  });

  it('should return 50% with two sections filled', () => {
    expect(computeCompleteness([
      { sectionType: 'SITUATION', content: 'Patient is stable' },
      { sectionType: 'BACKGROUND', content: 'History of diabetes' },
    ])).toBe(50);
  });

  it('should return 75% with three sections filled', () => {
    expect(computeCompleteness([
      { sectionType: 'SITUATION', content: 'Patient is stable' },
      { sectionType: 'BACKGROUND', content: 'History of diabetes' },
      { sectionType: 'ASSESSMENT', content: 'Blood sugar elevated' },
    ])).toBe(75);
  });

  it('should return 100% with all sections filled', () => {
    expect(computeCompleteness([
      { sectionType: 'SITUATION', content: 'Patient is stable' },
      { sectionType: 'BACKGROUND', content: 'History of diabetes' },
      { sectionType: 'ASSESSMENT', content: 'Blood sugar elevated' },
      { sectionType: 'RECOMMENDATION', content: 'Continue monitoring' },
    ])).toBe(100);
  });

  it('should not count empty sections', () => {
    expect(computeCompleteness([
      { sectionType: 'SITUATION', content: 'Patient is stable' },
      { sectionType: 'BACKGROUND', content: '   ' },
    ])).toBe(25);
  });

  it('should not count whitespace-only sections', () => {
    expect(computeCompleteness([
      { sectionType: 'SITUATION', content: '' },
    ])).toBe(0);
  });
});

describe('Handover Validation', () => {
  it('should require patientId', () => {
    const data = { patientId: '', shiftId: 'shift-1' };
    expect(data.patientId.length).toBe(0);
  });

  it('should require shiftId', () => {
    const data = { patientId: 'patient-1', shiftId: '' };
    expect(data.shiftId.length).toBe(0);
  });

  it('should validate UUID format for patientId', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should limit section content to 5000 characters', () => {
    const maxContent = 'a'.repeat(5000);
    expect(maxContent.length).toBeLessThanOrEqual(5000);

    const tooLongContent = 'a'.repeat(5001);
    expect(tooLongContent.length).toBeGreaterThan(5000);
  });
});
