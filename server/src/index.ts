import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/users.js';
import { patientRouter } from './routes/patients.js';
import { departmentRouter } from './routes/departments.js';
import { wardRouter } from './routes/wards.js';
import { roomRouter } from './routes/rooms.js';
import { bedRouter } from './routes/beds.js';
import { shiftRouter } from './routes/shifts.js';
import { assignmentRouter } from './routes/assignments.js';
import { taskRouter } from './routes/tasks.js';
import { handoverRouter } from './routes/handovers.js';
import { notificationRouter } from './routes/notifications.js';
import { alertRuleRouter, loadAlertRules } from './routes/alertRules.js';
import { auditLogRouter } from './routes/auditLogs.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());

app.use(cors({
  origin: env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
});

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/patients', patientRouter);
app.use('/api/v1/departments', departmentRouter);
app.use('/api/v1/wards', wardRouter);
app.use('/api/v1/rooms', roomRouter);
app.use('/api/v1/beds', bedRouter);
app.use('/api/v1/shifts', shiftRouter);
app.use('/api/v1/assignments', assignmentRouter);
app.use('/api/v1/tasks', taskRouter);
app.use('/api/v1/handovers', handoverRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/alert-rules', alertRuleRouter);
app.use('/api/v1/audit-logs', auditLogRouter);

app.use(notFoundHandler);

app.use(errorHandler);

const startServer = async (): Promise<void> => {
  try {
    await loadAlertRules();
    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app };
