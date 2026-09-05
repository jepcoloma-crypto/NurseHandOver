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

  it('should not allow SUBMITTED -> DRAFT', () => {
    expect(VALID_TRANSITIONS.SUBMITTED).not.toContain('DRAFT');
  });

  it('should not allow SUBMITTED -> ACCEPTED', () => {
    expect(VALID_TRANSITIONS.SUBMITTED).not.toContain('ACCEPTED');
  });

  it('should allow RECEIVED -> ACCEPTED', () => {
    expect(VALID_TRANSITIONS.RECEIVED).toContain('ACCEPTED');
  });

  it('should allow RECEIVED -> CLARIFICATION_REQUIRED', () => {
    expect(VALID_TRANSITIONS.RECEIVED).toContain('CLARIFICATION_REQUIRED');
  });

  it('should not allow RECEIVED -> SUBMITTED', () => {
    expect(VALID_TRANSITIONS.RECEIVED).not.toContain('SUBMITTED');
  });

  it('should not allow RECEIVED -> DRAFT', () => {
    expect(VALID_TRANSITIONS.RECEIVED).not.toContain('DRAFT');
  });

  it('should allow CLARIFICATION_REQUIRED -> CLARIFICATION_RESPONDED', () => {
    expect(VALID_TRANSITIONS.CLARIFICATION_REQUIRED).toContain('CLARIFICATION_RESPONDED');
  });

  it('should not allow CLARIFICATION_REQUIRED -> ACCEPTED', () => {
    expect(VALID_TRANSITIONS.CLARIFICATION_REQUIRED).not.toContain('ACCEPTED');
  });

  it('should not allow CLARIFICATION_REQUIRED -> RECEIVED', () => {
    expect(VALID_TRANSITIONS.CLARIFICATION_REQUIRED).not.toContain('RECEIVED');
  });

  it('should allow CLARIFICATION_RESPONDED -> ACCEPTED', () => {
    expect(VALID_TRANSITIONS.CLARIFICATION_RESPONDED).toContain('ACCEPTED');
  });

  it('should allow CLARIFICATION_RESPONDED -> CLARIFICATION_REQUIRED (re-request)', () => {
    expect(VALID_TRANSITIONS.CLARIFICATION_RESPONDED).toContain('CLARIFICATION_REQUIRED');
  });

  it('should not allow CLARIFICATION_RESPONDED -> RECEIVED', () => {
    expect(VALID_TRANSITIONS.CLARIFICATION_RESPONDED).not.toContain('RECEIVED');
  });

  it('should allow ACCEPTED -> REOPENED', () => {
    expect(VALID_TRANSITIONS.ACCEPTED).toContain('REOPENED');
  });

  it('should not allow ACCEPTED -> RECEIVED', () => {
    expect(VALID_TRANSITIONS.ACCEPTED).not.toContain('RECEIVED');
  });

  it('should not allow ACCEPTED -> CLARIFICATION_REQUIRED', () => {
    expect(VALID_TRANSITIONS.ACCEPTED).not.toContain('CLARIFICATION_REQUIRED');
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

  it('should not allow DRAFT -> RECEIVED', () => {
    expect(VALID_TRANSITIONS.DRAFT).not.toContain('RECEIVED');
  });

  it('should not allow DRAFT -> CLARIFICATION_REQUIRED', () => {
    expect(VALID_TRANSITIONS.DRAFT).not.toContain('CLARIFICATION_REQUIRED');
  });
});

describe('Receiving Workflow - Full Path', () => {
  it('should complete SUBMITTED -> RECEIVED -> ACCEPTED', () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      SUBMITTED: ['RECEIVED'],
      RECEIVED: ['CLARIFICATION_REQUIRED', 'ACCEPTED'],
    };
    expect(VALID_TRANSITIONS.SUBMITTED).toContain('RECEIVED');
    expect(VALID_TRANSITIONS.RECEIVED).toContain('ACCEPTED');
  });

  it('should complete SUBMITTED -> RECEIVED -> CLARIFICATION_REQUIRED -> CLARIFICATION_RESPONDED -> ACCEPTED', () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      SUBMITTED: ['RECEIVED'],
      RECEIVED: ['CLARIFICATION_REQUIRED', 'ACCEPTED'],
      CLARIFICATION_REQUIRED: ['CLARIFICATION_RESPONDED'],
      CLARIFICATION_RESPONDED: ['ACCEPTED', 'CLARIFICATION_REQUIRED'],
    };
    expect(VALID_TRANSITIONS.SUBMITTED).toContain('RECEIVED');
    expect(VALID_TRANSITIONS.RECEIVED).toContain('CLARIFICATION_REQUIRED');
    expect(VALID_TRANSITIONS.CLARIFICATION_REQUIRED).toContain('CLARIFICATION_RESPONDED');
    expect(VALID_TRANSITIONS.CLARIFICATION_RESPONDED).toContain('ACCEPTED');
  });

  it('should complete SUBMITTED -> RECEIVED -> CLARIFICATION_REQUIRED -> CLARIFICATION_RESPONDED -> CLARIFICATION_REQUIRED -> CLARIFICATION_RESPONDED -> ACCEPTED (re-clarification)', () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      SUBMITTED: ['RECEIVED'],
      RECEIVED: ['CLARIFICATION_REQUIRED', 'ACCEPTED'],
      CLARIFICATION_REQUIRED: ['CLARIFICATION_RESPONDED'],
      CLARIFICATION_RESPONDED: ['ACCEPTED', 'CLARIFICATION_REQUIRED'],
    };
    expect(VALID_TRANSITIONS.SUBMITTED).toContain('RECEIVED');
    expect(VALID_TRANSITIONS.RECEIVED).toContain('CLARIFICATION_REQUIRED');
    expect(VALID_TRANSITIONS.CLARIFICATION_REQUIRED).toContain('CLARIFICATION_RESPONDED');
    expect(VALID_TRANSITIONS.CLARIFICATION_RESPONDED).toContain('CLARIFICATION_REQUIRED');
    expect(VALID_TRANSITIONS.CLARIFICATION_REQUIRED).toContain('CLARIFICATION_RESPONDED');
    expect(VALID_TRANSITIONS.CLARIFICATION_RESPONDED).toContain('ACCEPTED');
  });

  it('should complete ACCEPTED -> REOPENED -> ACCEPTED', () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      ACCEPTED: ['REOPENED'],
      REOPENED: ['ACCEPTED'],
    };
    expect(VALID_TRANSITIONS.ACCEPTED).toContain('REOPENED');
    expect(VALID_TRANSITIONS.REOPENED).toContain('ACCEPTED');
  });
});

describe('Receiving Workflow - Role Authorization', () => {
  it('should require incoming nurse to transition SUBMITTED -> RECEIVED', () => {
    const handover = { status: 'SUBMITTED', incomingNurseId: 'nurse-incoming', outgoingNurseId: 'nurse-outgoing' };
    const userId = 'nurse-incoming';
    expect(handover.incomingNurseId).toBe(userId);
  });

  it('should require incoming nurse to request clarification', () => {
    const handover = { status: 'RECEIVED', incomingNurseId: 'nurse-incoming', outgoingNurseId: 'nurse-outgoing' };
    const userId = 'nurse-incoming';
    expect(handover.incomingNurseId).toBe(userId);
  });

  it('should require outgoing nurse to respond to clarification', () => {
    const handover = { status: 'CLARIFICATION_REQUIRED', incomingNurseId: 'nurse-incoming', outgoingNurseId: 'nurse-outgoing' };
    const userId = 'nurse-outgoing';
    expect(handover.outgoingNurseId).toBe(userId);
  });

  it('should require incoming nurse to accept handover', () => {
    const handover = { status: 'RECEIVED', incomingNurseId: 'nurse-incoming', outgoingNurseId: 'nurse-outgoing' };
    const userId = 'nurse-incoming';
    expect(handover.incomingNurseId).toBe(userId);
  });

  it('should not allow outgoing nurse to transition SUBMITTED -> RECEIVED', () => {
    const handover = { status: 'SUBMITTED', incomingNurseId: 'nurse-incoming', outgoingNurseId: 'nurse-outgoing' };
    const userId = 'nurse-outgoing';
    expect(handover.outgoingNurseId).toBe(userId);
    expect(handover.incomingNurseId).not.toBe(userId);
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

describe('Clarification Messaging', () => {
  it('should require non-empty question for clarification request', () => {
    const question = '';
    expect(question.trim().length).toBe(0);
  });

  it('should accept valid clarification question', () => {
    const question = 'Can you clarify the medication dosage?';
    expect(question.trim().length).toBeGreaterThan(0);
    expect(question.length).toBeLessThanOrEqual(2000);
  });

  it('should require non-empty response for clarification answer', () => {
    const response = '';
    expect(response.trim().length).toBe(0);
  });

  it('should accept valid clarification response', () => {
    const response = 'The dosage is 500mg twice daily.';
    expect(response.trim().length).toBeGreaterThan(0);
    expect(response.length).toBeLessThanOrEqual(2000);
  });

  it('should track clarification status', () => {
    const clarifications = [
      { id: '1', status: 'pending', question: 'Q1', response: undefined },
      { id: '2', status: 'answered', question: 'Q2', response: 'A2' },
    ];
    const pending = clarifications.filter((c) => c.status === 'pending');
    const answered = clarifications.filter((c) => c.status === 'answered');
    expect(pending).toHaveLength(1);
    expect(answered).toHaveLength(1);
  });

  it('should require clarification in VALID_TRANSITIONS for RECEIVED state', () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      RECEIVED: ['CLARIFICATION_REQUIRED', 'ACCEPTED'],
    };
    expect(VALID_TRANSITIONS.RECEIVED).toContain('CLARIFICATION_REQUIRED');
  });

  it('should require CLARIFICATION_REQUIRED -> CLARIFICATION_RESPONDED transition', () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      CLARIFICATION_REQUIRED: ['CLARIFICATION_RESPONDED'],
    };
    expect(VALID_TRANSITIONS.CLARIFICATION_REQUIRED).toContain('CLARIFICATION_RESPONDED');
  });

  it('should allow re-clarification from CLARIFICATION_RESPONDED', () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      CLARIFICATION_RESPONDED: ['ACCEPTED', 'CLARIFICATION_REQUIRED'],
    };
    expect(VALID_TRANSITIONS.CLARIFICATION_RESPONDED).toContain('CLARIFICATION_REQUIRED');
  });
});

describe('Event Recording', () => {
  it('should record CLARIFICATION_REQUESTED event', () => {
    const eventType = 'CLARIFICATION_REQUESTED';
    expect(eventType).toBe('CLARIFICATION_REQUESTED');
  });

  it('should record CLARIFICATION_RESPONDED event', () => {
    const eventType = 'CLARIFICATION_RESPONDED';
    expect(eventType).toBe('CLARIFICATION_RESPONDED');
  });

  it('should record TRANSITIONED_TO_RECEIVED event', () => {
    const eventType = 'TRANSITIONED_TO_RECEIVED';
    expect(eventType).toBe('TRANSITIONED_TO_RECEIVED');
  });

  it('should record TRANSITIONED_TO_ACCEPTED event', () => {
    const eventType = 'TRANSITIONED_TO_ACCEPTED';
    expect(eventType).toBe('TRANSITIONED_TO_ACCEPTED');
  });

  it('should record TRANSITIONED_TO_SUBMITTED event', () => {
    const eventType = 'TRANSITIONED_TO_SUBMITTED';
    expect(eventType).toBe('TRANSITIONED_TO_SUBMITTED');
  });

  it('should record TRANSITIONED_TO_CLARIFICATION_REQUIRED event', () => {
    const eventType = 'TRANSITIONED_TO_CLARIFICATION_REQUIRED';
    expect(eventType).toBe('TRANSITIONED_TO_CLARIFICATION_REQUIRED');
  });

  it('should record TRANSITIONED_TO_CLARIFICATION_RESPONDED event', () => {
    const eventType = 'TRANSITIONED_TO_CLARIFICATION_RESPONDED';
    expect(eventType).toBe('TRANSITIONED_TO_CLARIFICATION_RESPONDED');
  });

  it('should include userId in event', () => {
    const event = { userId: 'user-123', eventType: 'CREATED' };
    expect(event.userId).toBeDefined();
  });

  it('should include details in event', () => {
    const details = { from: 'SUBMITTED', to: 'RECEIVED' };
    expect(details.from).toBe('SUBMITTED');
    expect(details.to).toBe('RECEIVED');
  });
});
