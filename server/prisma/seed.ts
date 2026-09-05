import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create roles
  const nurseRole = await prisma.role.create({
    data: {
      id: uuidv4(),
      name: 'NURSE',
      description: 'Registered Nurse with clinical access',
    },
  });

  const supervisorRole = await prisma.role.create({
    data: {
      id: uuidv4(),
      name: 'SUPERVISOR',
      description: 'Nurse Supervisor with ward management access',
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      id: uuidv4(),
      name: 'ADMINISTRATOR',
      description: 'System Administrator with full access',
    },
  });

  const researcherRole = await prisma.role.create({
    data: {
      id: uuidv4(),
      name: 'RESEARCHER',
      description: 'Research access with de-identified data',
    },
  });

  console.log('Roles created');

  // Hash passwords
  const defaultPassword = await bcrypt.hash('password123', 12);

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'admin@example.local',
      passwordHash: defaultPassword,
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  const supervisorUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'supervisor@example.local',
      passwordHash: defaultPassword,
      firstName: 'Nurse',
      lastName: 'Supervisor',
    },
  });

  const nurse1 = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'nurse1@example.local',
      passwordHash: defaultPassword,
      firstName: 'Jane',
      lastName: 'Nurse',
    },
  });

  const nurse2 = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'nurse2@example.local',
      passwordHash: defaultPassword,
      firstName: 'John',
      lastName: 'Nurse',
    },
  });

  const researcherUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'researcher@example.local',
      passwordHash: defaultPassword,
      firstName: 'Research',
      lastName: 'User',
    },
  });

  console.log('Users created');

  // Assign roles
  await prisma.userRole.createMany({
    data: [
      { id: uuidv4(), userId: adminUser.id, roleId: adminRole.id },
      { id: uuidv4(), userId: supervisorUser.id, roleId: supervisorRole.id },
      { id: uuidv4(), userId: nurse1.id, roleId: nurseRole.id },
      { id: uuidv4(), userId: nurse2.id, roleId: nurseRole.id },
      { id: uuidv4(), userId: researcherUser.id, roleId: researcherRole.id },
    ],
  });

  console.log('User roles assigned');

  // Create department
  const department = await prisma.department.create({
    data: {
      id: uuidv4(),
      name: 'General Medicine',
      description: 'General Medical Department',
    },
  });

  console.log('Department created');

  // Create ward
  const ward = await prisma.ward.create({
    data: {
      id: uuidv4(),
      name: 'Ward A',
      departmentId: department.id,
      capacity: 20,
    },
  });

  console.log('Ward created');

  // Create rooms and beds
  const rooms = [];
  for (let i = 1; i <= 5; i++) {
    const room = await prisma.room.create({
      data: {
        id: uuidv4(),
        number: `Room ${i}`,
        wardId: ward.id,
      },
    });
    rooms.push(room);

    for (let j = 1; j <= 4; j++) {
      await prisma.bed.create({
        data: {
          id: uuidv4(),
          number: `Bed ${i}${j}`,
          roomId: room.id,
        },
      });
    }
  }

  console.log('Rooms and beds created');

  // Create shifts
  const dayShift = await prisma.shift.create({
    data: {
      id: uuidv4(),
      name: 'Day Shift',
      startTime: new Date('2024-01-01T07:00:00Z'),
      endTime: new Date('2024-01-01T19:00:00Z'),
    },
  });

  const nightShift = await prisma.shift.create({
    data: {
      id: uuidv4(),
      name: 'Night Shift',
      startTime: new Date('2024-01-01T19:00:00Z'),
      endTime: new Date('2024-01-02T07:00:00Z'),
    },
  });

  console.log('Shifts created');

  // Create nurse assignments
  await prisma.nurseAssignment.create({
    data: {
      id: uuidv4(),
      nurseId: nurse1.id,
      wardId: ward.id,
      shiftId: dayShift.id,
      assignedDate: new Date(),
    },
  });

  await prisma.nurseAssignment.create({
    data: {
      id: uuidv4(),
      nurseId: nurse2.id,
      wardId: ward.id,
      shiftId: nightShift.id,
      assignedDate: new Date(),
    },
  });

  console.log('Nurse assignments created');

  // Create test patients
  const beds = await prisma.bed.findMany({
    where: { roomId: { in: rooms.map((r) => r.id) } },
  });

  const patients = [];
  for (let i = 1; i <= 5; i++) {
    const patient = await prisma.patient.create({
      data: {
        id: uuidv4(),
        mrn: `TEST-PATIENT-${String(i).padStart(3, '0')}`,
        firstName: `Patient${i}`,
        lastName: `Test`,
        dateOfBirth: new Date(`1980-0${i}-15`),
        gender: i % 2 === 0 ? 'Female' : 'Male',
        admissionDate: new Date(),
        wardId: ward.id,
        bedId: beds[i - 1]?.id,
      },
    });
    patients.push(patient);
  }

  console.log('Patients created');

  // Create vital signs for patients
  for (const patient of patients) {
    await prisma.vitalSign.create({
      data: {
        id: uuidv4(),
        patientId: patient.id,
        recordedBy: nurse1.id,
        temperature: 36.5 + Math.random() * 2,
        heartRate: 70 + Math.floor(Math.random() * 30),
        respiratoryRate: 14 + Math.floor(Math.random() * 8),
        bloodPressureSystolic: 110 + Math.floor(Math.random() * 30),
        bloodPressureDiastolic: 70 + Math.floor(Math.random() * 20),
        oxygenSaturation: 95 + Math.random() * 5,
        painScale: Math.floor(Math.random() * 10),
      },
    });
  }

  console.log('Vital signs created');

  // Create nursing assessments
  for (const patient of patients) {
    await prisma.nursingAssessment.create({
      data: {
        id: uuidv4(),
        patientId: patient.id,
        assessedBy: nurse1.id,
        assessmentType: 'General',
        findings: 'Patient appears stable. No acute distress noted.',
        painScale: 2,
      },
    });
  }

  console.log('Nursing assessments created');

  // Create nursing tasks
  for (const patient of patients) {
    await prisma.nursingTask.create({
      data: {
        id: uuidv4(),
        patientId: patient.id,
        assignedTo: nurse1.id,
        title: 'Monitor vital signs',
        description: 'Check vital signs every 4 hours',
        priority: 'medium',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('Nursing tasks created');

  // Create audit logs
  await prisma.auditLog.create({
    data: {
      id: uuidv4(),
      userId: adminUser.id,
      action: 'SEED',
      entity: 'SYSTEM',
      details: { message: 'Database seeded successfully' },
    },
  });

  console.log('Audit logs created');

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
