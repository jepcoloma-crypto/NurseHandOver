import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/password.js';
import { generateToken } from '../lib/token.js';
import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';

const TEST_PORT = '13199';
const prisma = new PrismaClient();

async function apiCall(
  method: string,
  path: string,
  token: string | null,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`http://localhost:${TEST_PORT}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as Record<string, unknown>;
  return { status: response.status, data };
}

let serverProcess: ChildProcess | null = null;

beforeAll(async () => {
  const tsxPath = resolve(process.cwd(), 'node_modules/.bin/tsx');

  try {
    const { execSync } = await import('child_process');
    execSync(`netstat -ano | findstr :${TEST_PORT} | findstr LISTENING`, { stdio: 'pipe' });
    execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${TEST_PORT} ^| findstr LISTENING') do taskkill /PID %a /F`, { stdio: 'pipe' });
    await new Promise((r) => setTimeout(r, 500));
  } catch {
    // Port is free
  }

  serverProcess = spawn(tsxPath, ['src/index.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: TEST_PORT, NODE_ENV: 'test' },
    stdio: 'pipe',
    shell: true,
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 15000);
    serverProcess!.stdout!.on('data', (data: Buffer) => {
      if (data.toString().includes('Server running')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    serverProcess!.stderr!.on('data', (data: Buffer) => {
      const msg = data.toString();
      if (msg.includes('EADDRINUSE')) {
        clearTimeout(timeout);
        reject(new Error(`Port ${TEST_PORT} already in use`));
      }
    });
    serverProcess!.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}, 20000);

afterAll(async () => {
  if (serverProcess) {
    serverProcess.kill();
    await new Promise<void>((resolve) => {
      serverProcess!.on('close', () => resolve());
      setTimeout(() => resolve(), 2000);
    });
  }
  await prisma.$disconnect();
});

describe('E2E: Full Handover Lifecycle', () => {
  let outgoingNurseToken: string;
  let incomingNurseToken: string;
  let outgoingNurseId: string;
  let incomingNurseId: string;
  let patientId: string;
  let shiftId: string;
  let handoverId: string;
  let clarificationId: string;

  const OUTGOING_EMAIL = `e2e-outgoing-${Date.now()}@test.com`;
  const INCOMING_EMAIL = `e2e-incoming-${Date.now()}@test.com`;
  const PASSWORD = 'TestPassword123!';

  beforeAll(async () => {
    const passwordHash = await hashPassword(PASSWORD);
    const role = await prisma.role.findFirst({ where: { name: 'NURSE' } });
    const nurseRoleId = role!.id;
    const ward = await prisma.ward.findFirst({ where: { isActive: true } });
    const wardId = ward!.id;
    const shift = await prisma.shift.findFirst({ where: { isActive: true } });
    shiftId = shift!.id;

    const outgoingNurse = await prisma.user.create({
      data: {
        email: OUTGOING_EMAIL,
        passwordHash,
        firstName: 'E2E',
        lastName: 'Outgoing',
        roles: { create: [{ roleId: nurseRoleId }] },
      },
    });
    outgoingNurseId = outgoingNurse.id;

    await prisma.nurseAssignment.create({
      data: {
        nurseId: outgoingNurseId,
        wardId,
        shiftId,
        assignedDate: new Date(),
      },
    });

    const incomingNurse = await prisma.user.create({
      data: {
        email: INCOMING_EMAIL,
        passwordHash,
        firstName: 'E2E',
        lastName: 'Incoming',
        roles: { create: [{ roleId: nurseRoleId }] },
      },
    });
    incomingNurseId = incomingNurse.id;

    await prisma.nurseAssignment.create({
      data: {
        nurseId: incomingNurseId,
        wardId,
        shiftId,
        assignedDate: new Date(),
      },
    });

    const patient = await prisma.patient.create({
      data: {
        mrn: `E2E-MRN-${Date.now()}`,
        firstName: 'E2E',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'Male',
        admissionDate: new Date(),
        wardId,
      },
    });
    patientId = patient.id;

    outgoingNurseToken = generateToken({
      userId: outgoingNurseId,
      email: OUTGOING_EMAIL,
      roles: ['NURSE'],
    });

    incomingNurseToken = generateToken({
      userId: incomingNurseId,
      email: INCOMING_EMAIL,
      roles: ['NURSE'],
    });
  }, 15000);

  afterAll(async () => {
    if (patientId) {
      await prisma.handoverClarification.deleteMany({ where: { handover: { patientId } } }).catch(() => {});
      await prisma.handoverEvent.deleteMany({ where: { handover: { patientId } } }).catch(() => {});
      await prisma.handoverVersion.deleteMany({ where: { handover: { patientId } } }).catch(() => {});
      await prisma.handoverSection.deleteMany({ where: { handover: { patientId } } }).catch(() => {});
      await prisma.handover.deleteMany({ where: { patientId } }).catch(() => {});
      await prisma.nursingTask.deleteMany({ where: { patientId } }).catch(() => {});
      await prisma.vitalSign.deleteMany({ where: { patientId } }).catch(() => {});
      await prisma.nursingAssessment.deleteMany({ where: { patientId } }).catch(() => {});
    }
    const nurseIds = [outgoingNurseId, incomingNurseId].filter(Boolean);
    if (nurseIds.length > 0) {
      await prisma.notification.deleteMany({ where: { userId: { in: nurseIds } } }).catch(() => {});
      await prisma.nurseAssignment.deleteMany({ where: { nurseId: { in: nurseIds } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: nurseIds } } }).catch(() => {});
    }
  });

  it('Step 1: Login as outgoing nurse', async () => {
    const res = await apiCall('POST', '/api/v1/auth/login', null, {
      email: OUTGOING_EMAIL,
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    const body = res.data.data as { token: string; user: { id: string } };
    expect(body.token).toBeDefined();
    expect(body.user.id).toBe(outgoingNurseId);
    outgoingNurseToken = body.token;
  });

  it('Step 2: Login as incoming nurse', async () => {
    const res = await apiCall('POST', '/api/v1/auth/login', null, {
      email: INCOMING_EMAIL,
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    const body = res.data.data as { token: string };
    incomingNurseToken = body.token;
  });

  it('Step 3: Outgoing nurse views patient', async () => {
    const res = await apiCall('GET', `/api/v1/patients/${patientId}`, outgoingNurseToken);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    const body = res.data.data as { id: string; firstName: string };
    expect(body.id).toBe(patientId);
    expect(body.firstName).toBe('E2E');
  });

  it('Step 4: Incoming nurse can view same patient (same ward)', async () => {
    const res = await apiCall('GET', `/api/v1/patients/${patientId}`, incomingNurseToken);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('Step 5: Outgoing nurse records vitals', async () => {
    const res = await apiCall('POST', `/api/v1/patients/${patientId}/vitals`, outgoingNurseToken, {
      temperature: 37.2,
      heartRate: 72,
      respiratoryRate: 16,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      oxygenSaturation: 98,
      painScale: 2,
      notes: 'Patient comfortable',
    });
    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    const body = res.data.data as { id: string; temperature: number };
    expect(Number(body.temperature)).toBe(37.2);
  });

  it('Step 6: Outgoing nurse creates handover with full SBAR', async () => {
    const res = await apiCall('POST', '/api/v1/handovers', outgoingNurseToken, {
      patientId,
      shiftId,
      incomingNurseId,
      sections: {
        SITUATION: 'Patient is a 35-year-old male admitted for observation following minor surgery.',
        BACKGROUND: 'History of well-controlled hypertension. No known drug allergies.',
        ASSESSMENT: 'Vital signs stable. Pain well controlled with acetaminophen.',
        RECOMMENDATION: 'Continue monitoring vital signs every 4 hours.',
      },
    });
    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    const body = res.data.data as { id: string; status: string; completeness: number };
    expect(body.id).toBeDefined();
    expect(body.status).toBe('DRAFT');
    expect(body.completeness).toBe(100);
    handoverId = body.id;
  });

  it('Step 7: DRAFT -> READY_FOR_REVIEW', async () => {
    const res = await apiCall('POST', `/api/v1/handovers/${handoverId}/transition`, outgoingNurseToken, {
      status: 'READY_FOR_REVIEW',
    });
    expect(res.status).toBe(200);
    const body = res.data.data as { status: string };
    expect(body.status).toBe('READY_FOR_REVIEW');
  });

  it('Step 8: READY_FOR_REVIEW -> SUBMITTED', async () => {
    const res = await apiCall('POST', `/api/v1/handovers/${handoverId}/transition`, outgoingNurseToken, {
      status: 'SUBMITTED',
    });
    expect(res.status).toBe(200);
    const body = res.data.data as { status: string };
    expect(body.status).toBe('SUBMITTED');
  });

  it('Step 9: Incoming nurse views handover detail', async () => {
    const res = await apiCall('GET', `/api/v1/handovers/${handoverId}`, incomingNurseToken);
    expect(res.status).toBe(200);
    const body = res.data.data as { id: string; status: string; sections: Array<{ sectionType: string; content: string }> };
    expect(body.id).toBe(handoverId);
    expect(body.sections.length).toBe(4);
  });

  it('Step 10: SUBMITTED -> RECEIVED', async () => {
    const res = await apiCall('POST', `/api/v1/handovers/${handoverId}/transition`, incomingNurseToken, {
      status: 'RECEIVED',
    });
    expect(res.status).toBe(200);
    const body = res.data.data as { status: string };
    expect(body.status).toBe('RECEIVED');
  });

  it('Step 11: Request clarification (RECEIVED -> CLARIFICATION_REQUIRED)', async () => {
    const res = await apiCall('POST', `/api/v1/handovers/${handoverId}/clarifications`, incomingNurseToken, {
      question: 'Can you clarify the medication dosage for the hypertension?',
    });
    expect(res.status).toBe(201);
    const body = res.data.data as { id: string; status: string };
    clarificationId = body.id;

    const statusRes = await apiCall('GET', `/api/v1/handovers/${handoverId}`, incomingNurseToken);
    const handoverBody = statusRes.data.data as { status: string };
    expect(handoverBody.status).toBe('CLARIFICATION_REQUIRED');
  });

  it('Step 12: Respond to clarification (CLARIFICATION_REQUIRED -> CLARIFICATION_RESPONDED)', async () => {
    const res = await apiCall('PUT', `/api/v1/handovers/${handoverId}/clarifications/${clarificationId}/respond`, outgoingNurseToken, {
      response: 'The patient is on Lisinopril 10mg daily.',
    });
    expect(res.status).toBe(200);

    const statusRes = await apiCall('GET', `/api/v1/handovers/${handoverId}`, outgoingNurseToken);
    const handoverBody = statusRes.data.data as { status: string };
    expect(handoverBody.status).toBe('CLARIFICATION_RESPONDED');
  });

  it('Step 13: CLARIFICATION_RESPONDED -> ACCEPTED', async () => {
    const res = await apiCall('POST', `/api/v1/handovers/${handoverId}/transition`, incomingNurseToken, {
      status: 'ACCEPTED',
    });
    expect(res.status).toBe(200);
    const body = res.data.data as { status: string };
    expect(body.status).toBe('ACCEPTED');
  });

  it('Step 14: Verify full event history recorded', async () => {
    const res = await apiCall('GET', `/api/v1/handovers/${handoverId}`, incomingNurseToken);
    const body = res.data.data as { events: Array<{ eventType: string }> };
    const eventTypes = body.events.map((e) => e.eventType);
    expect(eventTypes).toContain('CREATED');
    expect(eventTypes).toContain('TRANSITIONED_TO_READY_FOR_REVIEW');
    expect(eventTypes).toContain('TRANSITIONED_TO_SUBMITTED');
    expect(eventTypes).toContain('TRANSITIONED_TO_RECEIVED');
    expect(eventTypes).toContain('CLARIFICATION_REQUESTED');
    expect(eventTypes).toContain('CLARIFICATION_RESPONDED');
    expect(eventTypes).toContain('TRANSITIONED_TO_ACCEPTED');
  });

  it('Step 15: Verify version snapshots were created', async () => {
    const res = await apiCall('GET', `/api/v1/handovers/${handoverId}`, outgoingNurseToken);
    const body = res.data.data as { versions: Array<{ version: number }> };
    expect(body.versions.length).toBeGreaterThan(0);
  });

  it('Step 16: Notifications created for both nurses', async () => {
    const outgoingNotifs = await prisma.notification.findMany({
      where: { userId: outgoingNurseId },
      orderBy: { createdAt: 'desc' },
    });
    expect(outgoingNotifs.length).toBeGreaterThan(0);

    const incomingNotifs = await prisma.notification.findMany({
      where: { userId: incomingNurseId },
      orderBy: { createdAt: 'desc' },
    });
    expect(incomingNotifs.length).toBeGreaterThan(0);
  });

  it('Step 17: Invalid transition rejected (ACCEPTED -> RECEIVED)', async () => {
    const res = await apiCall('POST', `/api/v1/handovers/${handoverId}/transition`, outgoingNurseToken, {
      status: 'RECEIVED',
    });
    expect(res.status).toBe(400);
  });

  it('Step 18: IDOR protection - non-participant nurse cannot view handover', async () => {
    const thirdNurse = await prisma.user.create({
      data: {
        email: `e2e-third-${Date.now()}@test.com`,
        passwordHash: await hashPassword(PASSWORD),
        firstName: 'E2E',
        lastName: 'Third',
        roles: { create: [{ roleId: (await prisma.role.findFirst({ where: { name: 'NURSE' } }))!.id }] },
      },
    });
    const thirdToken = generateToken({
      userId: thirdNurse.id,
      email: thirdNurse.email,
      roles: ['NURSE'],
    });
    const res = await apiCall('GET', `/api/v1/handovers/${handoverId}`, thirdToken);
    expect(res.status).toBe(403);
    await prisma.user.delete({ where: { id: thirdNurse.id } });
  });

  it('Step 19: Unauthenticated request rejected', async () => {
    const res = await apiCall('GET', `/api/v1/handovers/${handoverId}`, null);
    expect(res.status).toBe(401);
  });

  it('Step 20: Handover list scoped to nurse', async () => {
    const res = await apiCall('GET', '/api/v1/handovers', outgoingNurseToken);
    expect(res.status).toBe(200);
    const body = res.data.data as Array<{ id: string }>;
    const ids = body.map((h) => h.id);
    expect(ids).toContain(handoverId);
  });
});
