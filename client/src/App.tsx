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

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute><Layout><PatientsPage /></Layout></ProtectedRoute>} />
        <Route path="/patients/:id" element={<ProtectedRoute><Layout><PatientDetailPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/departments" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><DepartmentsPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/wards" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><WardsPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/rooms" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><RoomsPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/beds" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><BedsPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/shifts" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><ShiftsPage /></Layout></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['ADMINISTRATOR']}><Layout><UsersPage /></Layout></ProtectedRoute>} />
        <Route path="/supervisor/assignments" element={<ProtectedRoute roles={['SUPERVISOR']}><Layout><AssignmentsPage /></Layout></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
