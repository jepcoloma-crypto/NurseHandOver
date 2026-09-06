import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useApi';

const adminLinks = [
  { to: '/admin/departments', label: 'Departments' },
  { to: '/admin/wards', label: 'Wards' },
  { to: '/admin/rooms', label: 'Rooms' },
  { to: '/admin/beds', label: 'Beds' },
  { to: '/admin/shifts', label: 'Shifts' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/alert-rules', label: 'Alert Rules' },
  { to: '/admin/audit-logs', label: 'Audit Log' },
];

const supervisorLinks = [
  { to: '/supervisor/dashboard', label: 'Supervisor Dashboard' },
  { to: '/supervisor/assignments', label: 'Nurse Assignments' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: notifData } = useNotifications();
  const unreadCount = notifData?.unreadCount ?? 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.roles.includes('ADMINISTRATOR');
  const isSupervisor = user?.roles.includes('SUPERVISOR');

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-primary-700">NurseHandOver</h1>
          <p className="text-xs text-gray-500 mt-1">Shift Handover System</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/"
            className={`block px-3 py-2 rounded-md text-sm font-medium ${
              location.pathname === '/' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </Link>

          <Link
            to="/patients"
            className={`block px-3 py-2 rounded-md text-sm font-medium ${
              location.pathname.startsWith('/patients') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Patients
          </Link>

          <Link
            to="/tasks"
            className={`block px-3 py-2 rounded-md text-sm font-medium ${
              location.pathname.startsWith('/tasks') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Tasks
          </Link>

          <Link
            to="/handovers"
            className={`block px-3 py-2 rounded-md text-sm font-medium ${
              location.pathname.startsWith('/handovers') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Handovers
          </Link>

          <Link
            to="/notifications"
            className={`block px-3 py-2 rounded-md text-sm font-medium ${
              location.pathname === '/notifications' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {isAdmin && (
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Administration</p>
              <div className="mt-2 space-y-1">
                {adminLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`block px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === link.to ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {isSupervisor && (
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Supervisor</p>
              <div className="mt-2 space-y-1">
                {supervisorLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`block px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === link.to ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t">
          <div className="text-sm text-gray-700">
            <p className="font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500">{user?.roles.join(', ')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
