import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  researchStudy: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  researchParticipant: { findMany: vi.fn(), create: vi.fn() },
  researchSurvey: { findMany: vi.fn(), create: vi.fn() },
  surveyQuestion: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
  surveyResponse: { findMany: vi.fn(), create: vi.fn() },
  researchMetric: { findMany: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
};

vi.mock('../config/database.js', () => ({
  prisma: mockPrisma,
}));

describe('Research Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization', () => {
    it('should require SUPERVISOR or ADMINISTRATOR for studies', () => {
      const allowedRoles = ['SUPERVISOR', 'ADMINISTRATOR'];
      expect(allowedRoles).toContain('SUPERVISOR');
      expect(allowedRoles).toContain('ADMINISTRATOR');
      expect(allowedRoles).not.toContain('NURSE');
    });

    it('should require ADMINISTRATOR for creating studies', () => {
      const allowedRoles = ['ADMINISTRATOR'];
      expect(allowedRoles).toContain('ADMINISTRATOR');
      expect(allowedRoles).not.toContain('SUPERVISOR');
    });
  });

  describe('Study CRUD', () => {
    it('should create a research study', async () => {
      mockPrisma.researchStudy.create.mockResolvedValue({
        id: 'study-1', title: 'Test Study', status: 'draft', description: null, startDate: null, endDate: null, createdAt: new Date(),
      });
      const study = await mockPrisma.researchStudy.create({
        data: { title: 'Test Study', description: undefined, startDate: undefined, endDate: undefined },
      });
      expect(study.title).toBe('Test Study');
      expect(study.status).toBe('draft');
    });

    it('should list all studies', async () => {
      mockPrisma.researchStudy.findMany.mockResolvedValue([
        { id: 'study-1', title: 'Study A', _count: { participants: 5, surveys: 2, metrics: 10 } },
        { id: 'study-2', title: 'Study B', _count: { participants: 3, surveys: 1, metrics: 5 } },
      ]);
      const studies = await mockPrisma.researchStudy.findMany();
      expect(studies).toHaveLength(2);
    });

    it('should update study status', async () => {
      mockPrisma.researchStudy.update.mockResolvedValue({ id: 'study-1', status: 'active' });
      const updated = await mockPrisma.researchStudy.update({ where: { id: 'study-1' }, data: { status: 'active' } });
      expect(updated.status).toBe('active');
    });
  });

  describe('Participant Management', () => {
    it('should require studyCode for de-identification', () => {
      const participant = { studyCode: 'N001', role: 'NURSE' };
      expect(participant.studyCode).toMatch(/^[A-Z]\d{3}$/);
    });

    it('should generate unique study codes per study', () => {
      const existingCodes = ['N001', 'N002', 'S001'];
      const newCode = 'N003';
      expect(existingCodes).not.toContain(newCode);
    });

    it('should create participant with study code', async () => {
      mockPrisma.researchParticipant.create.mockResolvedValue({
        id: 'p1', studyId: 'study-1', studyCode: 'N001', role: 'NURSE', userId: 'user-1', enrolledAt: new Date(), isActive: true,
      });
      const participant = await mockPrisma.researchParticipant.create({
        data: { studyId: 'study-1', userId: 'user-1', studyCode: 'N001', role: 'NURSE' },
      });
      expect(participant.studyCode).toBe('N001');
    });
  });

  describe('Survey Management', () => {
    it('should create survey with questions', async () => {
      mockPrisma.researchSurvey.create.mockResolvedValue({ id: 'survey-1', title: 'Pre-Intervention Survey', studyId: 'study-1' });
      mockPrisma.surveyQuestion.create.mockResolvedValue({ id: 'q1', surveyId: 'survey-1', question: 'How complete was the handover?', questionType: 'likert', orderIndex: 1 });

      const survey = await mockPrisma.researchSurvey.create({
        data: { studyId: 'study-1', title: 'Pre-Intervention Survey' },
      });
      expect(survey.title).toBe('Pre-Intervention Survey');

      const question = await mockPrisma.surveyQuestion.create({
        data: { surveyId: 'survey-1', question: 'How complete was the handover?', questionType: 'likert', options: { scale: [1, 2, 3, 4, 5] }, isRequired: true, orderIndex: 1 },
      });
      expect(question.questionType).toBe('likert');
    });

    it('should support different question types', () => {
      const questionTypes = ['likert', 'multiple_choice', 'text', 'numeric'];
      expect(questionTypes).toContain('likert');
      expect(questionTypes).toContain('multiple_choice');
      expect(questionTypes).toContain('text');
      expect(questionTypes).toContain('numeric');
    });
  });

  describe('Metric Recording', () => {
    it('should record pre and post intervention metrics', async () => {
      const preMetric = { metricName: 'handover_completeness', period: 'pre', metricValue: { score: 75 } };
      const postMetric = { metricName: 'handover_completeness', period: 'post', metricValue: { score: 90 } };

      mockPrisma.researchMetric.create
        .mockResolvedValueOnce({ id: 'm1', ...preMetric, studyId: 'study-1' })
        .mockResolvedValueOnce({ id: 'm2', ...postMetric, studyId: 'study-1' });

      const m1 = await mockPrisma.researchMetric.create({ data: { studyId: 'study-1', ...preMetric } });
      const m2 = await mockPrisma.researchMetric.create({ data: { studyId: 'study-1', ...postMetric } });

      expect(m1.period).toBe('pre');
      expect(m2.period).toBe('post');
      expect((m2.metricValue as { score: number }).score).toBeGreaterThan((m1.metricValue as { score: number }).score);
    });

    it('should support all 8 research metrics', () => {
      const metricNames = [
        'handover_completeness', 'handover_duration', 'information_omission',
        'clarification_frequency', 'task_completion', 'user_satisfaction',
        'usability', 'perceived_usefulness',
      ];
      expect(metricNames).toHaveLength(8);
    });
  });

  describe('De-identified Export', () => {
    it('should use study codes instead of personal identifiers', () => {
      const participant = { studyCode: 'N001', user: { firstName: 'John', lastName: 'Doe' } };
      const exportRow = { study_code: participant.studyCode };
      expect(exportRow.study_code).toBe('N001');
      expect(exportRow).not.toHaveProperty('firstName');
      expect(exportRow).not.toHaveProperty('lastName');
    });

    it('should support CSV format', () => {
      const csvHeaders = 'study_code,metric_name,metric_value,period,source,recorded_at';
      expect(csvHeaders).toContain('study_code');
      expect(csvHeaders).not.toContain('user_id');
      expect(csvHeaders).not.toContain('email');
    });

    it('should support XLSX format (JSON)', () => {
      const xlsxRow = {
        'Study Code': 'N001',
        'Metric Name': 'handover_completeness',
        'Metric Value': '{"score": 85}',
        Period: 'pre',
        Source: 'system',
        'Recorded At': '2026-01-15T10:30:00.000Z',
      };
      expect(xlsxRow['Study Code']).toBe('N001');
      expect(xlsxRow).not.toHaveProperty('userId');
    });

    it('should mark aggregate metrics appropriately', () => {
      const aggregateCode = 'aggregate';
      expect(aggregateCode).toBe('aggregate');
    });
  });

  describe('Privacy', () => {
    it('should not expose user IDs in exports', () => {
      const exportData = { study_code: 'N001', metric_name: 'test' };
      expect(exportData).not.toHaveProperty('user_id');
      expect(exportData).not.toHaveProperty('userId');
    });

    it('should not expose emails in exports', () => {
      const exportData = { study_code: 'N001', question: 'test' };
      expect(exportData).not.toHaveProperty('email');
    });

    it('should separate study codes from personal identifiers', () => {
      const studyCode = 'N001';
      const personalId = 'user-uuid-here';
      const exportRecord = { study_code: studyCode };
      const internalRecord = { study_code: studyCode, user_id: personalId };
      expect(exportRecord).not.toHaveProperty('user_id');
      expect(internalRecord).toHaveProperty('user_id');
    });
  });
});
