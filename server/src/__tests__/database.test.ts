import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

describe('Database', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should connect to the database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    expect(result).toEqual([{ result: 1 }]);
  });

  it('should have users table', async () => {
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThan(0);
  });

  it('should have roles table', async () => {
    const roles = await prisma.role.findMany();
    expect(roles.length).toBeGreaterThan(0);
  });

  it('should have patients table', async () => {
    const patients = await prisma.patient.findMany();
    expect(patients.length).toBeGreaterThan(0);
  });

  it('should have departments table', async () => {
    const departments = await prisma.department.findMany();
    expect(departments.length).toBeGreaterThan(0);
  });

  it('should have wards table', async () => {
    const wards = await prisma.ward.findMany();
    expect(wards.length).toBeGreaterThan(0);
  });

  it('should have rooms table', async () => {
    const rooms = await prisma.room.findMany();
    expect(rooms.length).toBeGreaterThan(0);
  });

  it('should have beds table', async () => {
    const beds = await prisma.bed.findMany();
    expect(beds.length).toBeGreaterThan(0);
  });

  it('should have shifts table', async () => {
    const shifts = await prisma.shift.findMany();
    expect(shifts.length).toBeGreaterThan(0);
  });

  it('should have nurse_assignments table', async () => {
    const assignments = await prisma.nurseAssignment.findMany();
    expect(assignments.length).toBeGreaterThan(0);
  });

  it('should have vital_signs table', async () => {
    const result = await prisma.$queryRaw`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vital_signs') as exists`;
    expect((result as [{ exists: boolean }])[0].exists).toBe(true);
  });

  it('should have nursing_assessments table', async () => {
    const result = await prisma.$queryRaw`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nursing_assessments') as exists`;
    expect((result as [{ exists: boolean }])[0].exists).toBe(true);
  });

  it('should have nursing_tasks table', async () => {
    const result = await prisma.$queryRaw`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nursing_tasks') as exists`;
    expect((result as [{ exists: boolean }])[0].exists).toBe(true);
  });

  it('should have audit_logs table', async () => {
    const auditLogs = await prisma.auditLog.findMany();
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  it('should have correct user with role', async () => {
    const userWithRoles = await prisma.user.findFirst({
      include: { roles: { include: { role: true } } },
    });
    expect(userWithRoles).not.toBeNull();
    expect(userWithRoles?.roles.length).toBeGreaterThan(0);
  });

  it('should have correct patient with ward', async () => {
    const patientWithWard = await prisma.patient.findFirst({
      include: { ward: true },
    });
    expect(patientWithWard).not.toBeNull();
    expect(patientWithWard?.ward).not.toBeNull();
  });
});
