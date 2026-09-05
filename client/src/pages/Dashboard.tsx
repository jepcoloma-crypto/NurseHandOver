import { useAuth } from '../contexts/AuthContext';
import { useDepartments, useWards, useShifts, useUsers } from '../hooks/useApi';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { user } = useAuth();
  const { data: departments } = useDepartments();
  const { data: wards } = useWards();
  const { data: shifts } = useShifts();
  const { data: users } = useUsers();

  const isAdmin = user?.roles.includes('ADMINISTRATOR');

  const stats = [
    { label: 'Departments', value: departments?.length ?? '-', link: isAdmin ? '/admin/departments' : undefined },
    { label: 'Wards', value: wards?.length ?? '-', link: isAdmin ? '/admin/wards' : undefined },
    { label: 'Shifts', value: shifts?.length ?? '-', link: isAdmin ? '/admin/shifts' : undefined },
    { label: 'Staff', value: users?.length ?? '-', link: isAdmin ? '/admin/users' : undefined },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome, {user?.firstName}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {user?.roles.join(' / ')}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <p className="text-sm font-medium text-gray-500 truncate">{stat.label}</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{stat.value}</p>
            </div>
            {stat.link && (
              <div className="bg-gray-50 px-5 py-3">
                <Link to={stat.link} className="text-sm font-medium text-primary-600 hover:text-primary-500">
                  Manage
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
