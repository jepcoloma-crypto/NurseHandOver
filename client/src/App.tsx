import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { DepartmentsPage } from './pages/admin/DepartmentsPage';
import { WardsPage } from './pages/admin/WardsPage';
import { RoomsPage } from './pages/admin/RoomsPage';
import { BedsPage } from './pages/admin/BedsPage';
import { ShiftsPage } from './pages/admin/ShiftsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { AssignmentsPage } from './pages/supervisor/AssignmentsPage';
import { PatientsPage } from './pages/PatientsPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { VitalSignsPage } from './pages/VitalSignsPage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { TimelinePage } from './pages/TimelinePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AlertRulesPage } from './pages/AlertRulesPage';
import { TaskDashboardPage } from './pages/TaskDashboardPage';
import { PatientTasksPage } from './pages/PatientTasksPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { HandoverListPage } from './pages/HandoverListPage';
import { CreateHandoverPage } from './pages/CreateHandoverPage';
import { HandoverDetailPage } from './pages/HandoverDetailPage';
import { CompletenessDashboardPage } from './pages/CompletenessDashboardPage';
import { HandoverHistoryPage } from './pages/HandoverHistoryPage';
import { HandoverTimelinePage } from './pages/HandoverTimelinePage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SupervisorDashboardPage } from './pages/SupervisorDashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute><Layout><PatientsPage /></Layout></ProtectedRoute>} />
        <Route path="/patients/:id" element={<ProtectedRoute><Layout><PatientDetailPage /></Layout></ProtectedRoute>} />
        <Route path="/patients/:id/vitals" element={<ProtectedRoute><Layout><VitalSignsPage /></Layout></ProtectedRoute>} />
        <Route path="/patients/:id/assessments" element={<ProtectedRoute><Layout><AssessmentsPage /></Layout></ProtectedRoute>} />
        <Route path="/patients/:id/timeline" element={<ProtectedRoute><Layout><TimelinePage /></Layout></ProtectedRoute>} />
        <Route path="/patients/:id/tasks" element={<ProtectedRoute><Layout><PatientTasksPage /></Layout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Layout><TaskDashboardPage /></Layout></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute><Layout><TaskDetailPage /></Layout></ProtectedRoute>} />
        <Route path="/handovers" element={<ProtectedRoute><Layout><HandoverListPage /></Layout></ProtectedRoute>} />
        <Route path="/handovers/new" element={<ProtectedRoute><Layout><CreateHandoverPage /></Layout></ProtectedRoute>} />
        <Route path="/handovers/completeness" element={<ProtectedRoute><Layout><CompletenessDashboardPage /></Layout></ProtectedRoute>} />
        <Route path="/handovers/:id" element={<ProtectedRoute><Layout><HandoverDetailPage /></Layout></ProtectedRoute>} />
        <Route path="/handovers/:id/history" element={<ProtectedRoute><Layout><HandoverHistoryPage /></Layout></ProtectedRoute>} />
        <Route path="/handovers/:id/timeline" element={<ProtectedRoute><Layout><HandoverTimelinePage /></Layout></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/departments" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><DepartmentsPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/wards" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><WardsPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/rooms" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><RoomsPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/beds" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><BedsPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/shifts" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><ShiftsPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><UsersPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/alert-rules" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><AlertRulesPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/audit-logs" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><AuditLogPage /></Layout></ProtectedRoute>} />
        <Route path="/supervisor/assignments" element={<ProtectedRoute roles={['SUPERVISOR']}><Layout><AssignmentsPage /></Layout></ProtectedRoute>} />
        <Route path="/supervisor/dashboard" element={<ProtectedRoute roles={['SUPERVISOR', 'ADMINISTRATOR']}><Layout><SupervisorDashboardPage /></Layout></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute roles={['SUPERVISOR', 'ADMINISTRATOR']}><Layout><AnalyticsPage /></Layout></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
