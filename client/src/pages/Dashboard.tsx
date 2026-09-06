import { useAuth } from '../contexts/AuthContext';
import { useMyAssignments, useTasks, useHandovers, useNotifications, usePatients } from '../hooks/useApi';
import { Link } from 'react-router-dom';

function formatTime(d: string) { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function formatDate(d: string) { return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' }); }

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

const PATIENT_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  discharge_pending: { label: 'Discharge Pending', className: 'bg-yellow-100 text-yellow-700' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
};

function StatusBadge({ status, type = 'status' }: { status: string; type?: 'status' | 'priority' | 'patient' }) {
  const badges = type === 'priority' ? PRIORITY_BADGE : type === 'patient' ? PATIENT_STATUS : STATUS_BADGE;
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

export function Dashboard() {
  const { user } = useAuth();
  const { data: assignments } = useMyAssignments();
  const { data: tasksData } = useTasks();
  const { data: outgoingHandovers } = useHandovers({ view: 'mine' });
  const { data: notifData } = useNotifications();
  const { data: patientsData } = usePatients({ limit: 50 });

  const unreadCount = notifData?.unreadCount ?? 0;
  const notifications = notifData?.data ?? [];
  const tasks = tasksData?.data ?? [];
  const handovers = outgoingHandovers ?? [];
  const assignmentsList = assignments ?? [];
  const patients = patientsData?.data ?? [];

  const myPatientIds = new Set(assignmentsList.flatMap((a) => {
    const wardPatients = patients.filter((p) => p.wardId === a.wardId);
    return wardPatients.map((p) => p.id);
  }));
  const myPatients = patients.filter((p) => myPatientIds.has(p.id));

  const pendingTasks = tasks.filter((t) => ['PENDING', 'IN_PROGRESS'].includes(t.status));
  const overdueTasks = tasks.filter((t) => ['PENDING', 'IN_PROGRESS'].includes(t.status) && t.dueDate && new Date(t.dueDate) < new Date());
  const myPendingHandovers = handovers.filter((h) => ['DRAFT', 'READY_FOR_REVIEW'].includes(h.status));
  const myIncomingHandovers = handovers.filter((h) => ['SUBMITTED', 'RECEIVED', 'CLARIFICATION_REQUIRED'].includes(h.status));
  const recentNotifications = notifications.slice(0, 5);

  const now = new Date();
  const currentShift = assignmentsList.find((a) => {
    const start = new Date(a.shift?.startTime ?? '');
    const end = new Date(a.shift?.endTime ?? '');
    return now >= start && now <= end;
  }) || assignmentsList[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.firstName}</h1>
          <p className="text-sm text-gray-500 mt-1">{user?.roles.join(' / ')}</p>
        </div>
        {currentShift && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-2 flex items-center gap-3" role="status" aria-label="Current shift">
            <span className="text-sm font-medium text-primary-800">Current Shift:</span>
            <span className="text-sm font-bold text-primary-900">{currentShift.shift?.name}</span>
            {currentShift.shift?.startTime && currentShift.shift?.endTime && (
              <span className="text-xs text-primary-600">
                {formatTime(currentShift.shift.startTime)} - {formatTime(currentShift.shift.endTime)}
              </span>
            )}
            {currentShift.ward && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{currentShift.ward.name}</span>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" role="list" aria-label="Dashboard statistics">
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className="text-2xl font-bold text-gray-900">{myPatients.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Assigned Patients</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className="text-2xl font-bold text-gray-900">{pendingTasks.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pending Tasks</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueTasks.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Overdue Tasks</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className="text-2xl font-bold text-gray-900">{myPendingHandovers.length + myIncomingHandovers.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Active Handovers</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className={`text-2xl font-bold ${unreadCount > 0 ? 'text-primary-600' : 'text-gray-900'}`}>{unreadCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Unread Notifications</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 text-center" role="listitem">
          <p className="text-2xl font-bold text-gray-900">{assignmentsList.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Shift Assignments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Patients */}
          <SectionCard title="Assigned Patients" count={myPatients.length} icon="&#x1F464;">
            {myPatients.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No patients assigned for current shift.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {myPatients.slice(0, 8).map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                        {p.firstName[0]}{p.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/patients/${p.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block">
                          {p.firstName} {p.lastName}
                        </Link>
                        <p className="text-xs text-gray-400">MRN: {p.mrn}{p.ward ? ` | ${p.ward.name}` : ''}{p.bed ? ` Bed ${p.bed.number}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={p.status} type="patient" />
                      <Link to={`/patients/${p.id}/timeline`} className="text-xs text-primary-600 hover:text-primary-800">View</Link>
                    </div>
                  </div>
                ))}
                {myPatients.length > 8 && (
                  <p className="text-xs text-gray-400 pt-2">+{myPatients.length - 8} more patients</p>
                )}
              </div>
            )}
          </SectionCard>

          {/* Pending Tasks */}
          <SectionCard title="Pending Tasks" count={pendingTasks.length} icon="&#x2705;"
            action={<Link to="/tasks" className="text-xs text-primary-600 hover:text-primary-800">View All</Link>}>
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No pending tasks.</p>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 6).map((t) => {
                  const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
                  const prioConfig = PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.medium;
                  return (
                    <div key={t.id} className={`flex items-center justify-between p-2 rounded-lg ${isOverdue ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Link to={`/tasks/${t.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block">
                          {t.title}
                        </Link>
                        {t.patient && (
                          <span className="text-xs text-gray-400 hidden sm:inline">{t.patient.firstName} {t.patient.lastName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={t.status} />
                        <span className={`text-xs px-1.5 py-0.5 rounded ${prioConfig.className}`}>{prioConfig.label}</span>
                        {isOverdue && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium" role="alert">Overdue</span>
                        )}
                        {t.dueDate && (
                          <span className="text-xs text-gray-400 hidden sm:inline">{formatDate(t.dueDate)} {formatTime(t.dueDate)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {pendingTasks.length > 6 && (
                  <p className="text-xs text-gray-400">+{pendingTasks.length - 6} more tasks</p>
                )}
              </div>
            )}
          </SectionCard>

          {/* Handovers */}
          <SectionCard title="Handovers" count={myPendingHandovers.length + myIncomingHandovers.length} icon="&#x1F4CB;"
            action={<Link to="/handovers" className="text-xs text-primary-600 hover:text-primary-800">View All</Link>}>
            {(myPendingHandovers.length === 0 && myIncomingHandovers.length === 0) ? (
              <p className="text-sm text-gray-500 py-2">No active handovers.</p>
            ) : (
              <div className="space-y-3">
                {myPendingHandovers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Outgoing Handovers</p>
                    {myPendingHandovers.slice(0, 3).map((h) => (
                      <div key={h.id} className="flex items-center justify-between py-1.5">
                        <div className="min-w-0">
                          <Link to={`/handovers/${h.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block">
                            {h.patient?.firstName} {h.patient?.lastName}
                          </Link>
                          <p className="text-xs text-gray-400">{h.incomingNurse?.firstName ? `To: ${h.incomingNurse.firstName} ${h.incomingNurse.lastName}` : 'No incoming nurse'}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={h.status} />
                          {h.completeness !== undefined && <CompletenessBar percentage={h.completeness} />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {myIncomingHandovers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Incoming Handovers</p>
                    {myIncomingHandovers.slice(0, 3).map((h) => (
                      <div key={h.id} className="flex items-center justify-between py-1.5">
                        <div className="min-w-0">
                          <Link to={`/handovers/${h.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block">
                            {h.patient?.firstName} {h.patient?.lastName}
                          </Link>
                          <p className="text-xs text-gray-400">From: {h.outgoingNurse?.firstName} {h.outgoingNurse?.lastName}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={h.status} />
                          {h.completeness !== undefined && <CompletenessBar percentage={h.completeness} />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Notifications */}
          <SectionCard title="Notifications" count={unreadCount} icon="&#x1F514;"
            action={<Link to="/notifications" className="text-xs text-primary-600 hover:text-primary-800">View All</Link>}>
            {recentNotifications.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No notifications.</p>
            ) : (
              <div className="space-y-2">
                {recentNotifications.map((n) => (
                  <div key={n.id} className={`p-2 rounded-lg text-sm ${!n.isRead ? 'bg-primary-50 border-l-2 border-primary-400' : 'bg-gray-50'}`}>
                    <p className="font-medium text-gray-900 text-xs">{n.title}</p>
                    <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)} {formatTime(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Handover Completeness Overview */}
          <SectionCard title="Handover Completeness" icon="&#x1F4CA;">
            {handovers.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No handovers to display.</p>
            ) : (
              <div className="space-y-2">
                {handovers.filter((h) => h.completeness !== undefined).slice(0, 5).map((h) => (
                  <div key={h.id} className="flex items-center gap-3">
                    <Link to={`/handovers/${h.id}`} className="text-xs font-medium text-gray-700 hover:text-primary-600 truncate w-32 flex-shrink-0">
                      {h.patient?.firstName} {h.patient?.lastName}
                    </Link>
                    <div className="flex-1">
                      <CompletenessBar percentage={h.completeness ?? 0} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Shift Assignments */}
          <SectionCard title="Shift Assignments" count={assignmentsList.length} icon="&#x1F4C5;">
            {assignmentsList.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No assignments for current period.</p>
            ) : (
              <div className="space-y-2">
                {assignmentsList.map((a) => (
                  <div key={a.id} className="bg-gray-50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.shift?.name}</p>
                        <p className="text-xs text-gray-400">{a.ward?.name}</p>
                      </div>
                      {a.shift?.startTime && a.shift?.endTime && (
                        <span className="text-xs text-gray-400">
                          {formatTime(a.shift.startTime)} - {formatTime(a.shift.endTime)}
                        </span>
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
