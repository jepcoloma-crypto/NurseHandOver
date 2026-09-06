import { useAuth } from '../contexts/AuthContext';
import { useSupervisorDashboard } from '../hooks/useApi';
import { Link } from 'react-router-dom';

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'Low', className: 'bg-green-100 text-green-800' },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  READY_FOR_REVIEW: { label: 'Ready for Review', className: 'bg-blue-100 text-blue-700' },
  SUBMITTED: { label: 'Submitted', className: 'bg-indigo-100 text-indigo-700' },
  RECEIVED: { label: 'Received', className: 'bg-purple-100 text-purple-700' },
  CLARIFICATION_REQUIRED: { label: 'Needs Clarification', className: 'bg-yellow-100 text-yellow-700' },
  ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-700' },
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  DEFERRED: { label: 'Deferred', className: 'bg-orange-100 text-orange-700' },
};

function StatusBadge({ status, type = 'status' }: { status: string; type?: 'status' | 'priority' }) {
  const badges = type === 'priority' ? PRIORITY_BADGE : STATUS_BADGE;
  const config = badges[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function SectionCard({ title, count, icon, children, action }: {
  title: string; count?: number; icon: string; children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label={title}>{icon}</span>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {count !== undefined && count > 0 && (
            <span className="bg-primary-100 text-primary-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function CompletenessBar({ percentage }: { percentage: number }) {
  let color = 'bg-red-500';
  let textColor = 'text-red-700';
  let label = 'Empty';
  if (percentage >= 75) { color = 'bg-green-500'; textColor = 'text-green-700'; label = 'Complete'; }
  else if (percentage >= 50) { color = 'bg-yellow-500'; textColor = 'text-yellow-700'; label = 'Partial'; }
  else if (percentage >= 25) { color = 'bg-orange-500'; textColor = 'text-orange-700'; label = 'Started'; }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`Completeness: ${percentage}%`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className={`text-xs font-medium w-8 ${textColor}`}>{percentage}%</span>
      <span className="text-xs text-gray-400 w-14">{label}</span>
    </div>
  );
}

export function SupervisorDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useSupervisorDashboard();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading supervisor dashboard...</p></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64"><p className="text-red-500">Failed to load dashboard data.</p></div>;
  }

  const d = data!;
  const { stats, wardBreakdown, recentHandovers, recentTasks, assignedWards } = d;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supervisor Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.firstName} {user?.lastName} — {assignedWards.map((w) => w.name).join(', ') || 'No assigned wards'}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3" role="list" aria-label="Supervisor statistics">
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Patients</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className="text-2xl font-bold text-gray-900">{stats.activeNurses}</p>
          <p className="text-xs text-gray-500 mt-0.5">Active Nurses</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className="text-2xl font-bold text-green-600">{stats.completedHandovers}</p>
          <p className="text-xs text-gray-500 mt-0.5">Completed Handovers</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className="text-2xl font-bold text-blue-600">{stats.pendingHandovers}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pending Handovers</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className={`text-2xl font-bold ${stats.clarifications > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>{stats.clarifications}</p>
          <p className="text-xs text-gray-500 mt-0.5">Clarifications</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className={`text-2xl font-bold ${stats.incompleteHandovers > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{stats.incompleteHandovers}</p>
          <p className="text-xs text-gray-500 mt-0.5">Incomplete Handovers</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className="text-2xl font-bold text-gray-900">{stats.pendingTasks}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pending Tasks</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className={`text-2xl font-bold ${stats.overdueTasks > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.overdueTasks}</p>
          <p className="text-xs text-gray-500 mt-0.5">Overdue Tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Ward Overview + Handover Monitoring */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ward Overview */}
          <SectionCard title="Ward Overview" icon="&#x1F3E5;">
            {wardBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No ward data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm" role="table" aria-label="Ward overview">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600" scope="col">Ward</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600" scope="col">Department</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600" scope="col">Patients</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600" scope="col">Nurses</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600" scope="col">Completed</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600" scope="col">Pending HO</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600" scope="col">Clarif.</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600" scope="col">Tasks</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600" scope="col">Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {wardBreakdown.map((w) => (
                      <tr key={w.wardId} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-900">{w.wardName}</td>
                        <td className="py-2 px-3 text-gray-500">{w.departmentName}</td>
                        <td className="py-2 px-3 text-center">{w.patientCount}</td>
                        <td className="py-2 px-3 text-center">{w.activeNurseCount}</td>
                        <td className="py-2 px-3 text-center text-green-600 font-medium">{w.completedHandovers}</td>
                        <td className="py-2 px-3 text-center text-blue-600 font-medium">{w.pendingHandovers}</td>
                        <td className="py-2 px-3 text-center">
                          {w.clarifications > 0 ? (
                            <span className="text-yellow-600 font-medium" role="alert">{w.clarifications}</span>
                          ) : <span className="text-gray-400">0</span>}
                        </td>
                        <td className="py-2 px-3 text-center">{w.pendingTasks}</td>
                        <td className="py-2 px-3 text-center">
                          {w.overdueTasks > 0 ? (
                            <span className="text-red-600 font-medium" role="alert">{w.overdueTasks}</span>
                          ) : <span className="text-gray-400">0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Handover Monitoring */}
          <SectionCard title="Handover Monitoring" count={recentHandovers.length} icon="&#x1F4CB;"
            action={<Link to="/handovers" className="text-xs text-primary-600 hover:text-primary-800">View All</Link>}>
            {recentHandovers.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No recent handovers.</p>
            ) : (
              <div className="space-y-2">
                {recentHandovers.slice(0, 8).map((h) => {
                  const isClarification = h.status === 'CLARIFICATION_REQUIRED';
                  const isIncomplete = h.completeness !== null && h.completeness !== undefined && h.completeness < 50;
                  return (
                    <div key={h.id} className={`flex items-center justify-between p-2 rounded-lg ${isClarification ? 'bg-yellow-50 border border-yellow-200' : isIncomplete ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Link to={`/handovers/${h.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block">
                          {h.patient?.firstName} {h.patient?.lastName}
                        </Link>
                        <span className="text-xs text-gray-400 hidden sm:inline">
                          {h.outgoingNurse?.firstName} {h.outgoingNurse?.lastName} → {h.incomingNurse?.firstName} {h.incomingNurse?.lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={h.status} />
                        {h.completeness !== null && h.completeness !== undefined && <CompletenessBar percentage={h.completeness} />}
                        {isClarification && <span className="text-xs text-yellow-700 font-medium" role="alert">Needs Response</span>}
                      </div>
                    </div>
                  );
                })}
                {recentHandovers.length > 8 && (
                  <p className="text-xs text-gray-400">+{recentHandovers.length - 8} more handovers</p>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column: Task Monitoring + Assignments */}
        <div className="space-y-6">
          {/* Task Monitoring */}
          <SectionCard title="Task Monitoring" count={recentTasks.length} icon="&#x2705;"
            action={<Link to="/tasks" className="text-xs text-primary-600 hover:text-primary-800">View All</Link>}>
            {recentTasks.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No recent tasks.</p>
            ) : (
              <div className="space-y-2">
                {recentTasks.slice(0, 8).map((t) => {
                  const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
                  const prioConfig = PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.medium;
                  return (
                    <div key={t.id} className={`flex items-center justify-between p-2 rounded-lg ${isOverdue ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                      <div className="min-w-0">
                        <Link to={`/tasks/${t.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block">
                          {t.title}
                        </Link>
                        <p className="text-xs text-gray-400">
                          {t.patient?.firstName} {t.patient?.lastName}
                          {t.assignedTo && ` — ${t.assignedTo.firstName} ${t.assignedTo.lastName}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={t.status} />
                        <span className={`text-xs px-1.5 py-0.5 rounded ${prioConfig.className}`}>{prioConfig.label}</span>
                        {isOverdue && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium" role="alert">Overdue</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {recentTasks.length > 8 && (
                  <p className="text-xs text-gray-400">+{recentTasks.length - 8} more tasks</p>
                )}
              </div>
            )}
          </SectionCard>

          {/* Assignment Monitoring */}
          <SectionCard title="Assignment Monitoring" icon="&#x1F4C5;"
            action={<Link to="/supervisor/assignments" className="text-xs text-primary-600 hover:text-primary-800">Manage</Link>}>
            {wardBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No ward assignment data.</p>
            ) : (
              <div className="space-y-3">
                {wardBreakdown.map((w) => (
                  <div key={w.wardId} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">{w.wardName}</p>
                      <span className="text-xs text-gray-400">{w.departmentName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>{w.activeNurseCount} active nurse{w.activeNurseCount !== 1 ? 's' : ''}</span>
                      <span>{w.patientCount} patient{w.patientCount !== 1 ? 's' : ''}</span>
                      {w.overdueTasks > 0 && (
                        <span className="text-red-600 font-medium" role="alert">{w.overdueTasks} overdue task{w.overdueTasks !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
