import { useState } from 'react';
import { useAnalytics } from '../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatTile({ label, value, unit, color }: { label: string; value: number | string; unit?: string; color?: string }) {
  return (
    <div className="bg-white shadow rounded-lg p-3 text-center">
      <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}{unit && <span className="text-sm font-normal ml-0.5">{unit}</span>}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  READY_FOR_REVIEW: 'Ready for Review',
  SUBMITTED: 'Submitted',
  RECEIVED: 'Received',
  CLARIFICATION_REQUIRED: 'Needs Clarification',
  ACCEPTED: 'Accepted',
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  DEFERRED: 'Deferred',
};

export function AnalyticsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [wardId, setWardId] = useState('');

  const filters = {
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(wardId && { wardId }),
  };

  const { data, isLoading, error } = useAnalytics(filters);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading analytics...</p></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64"><p className="text-red-500">Failed to load analytics data.</p></div>;
  }

  const d = data!;
  const { summary, handoversByStatus, tasksByStatus, handoversByShift, handoversByDay, tasksByDay, completenessDistribution, shiftReport, availableWards } = d;

  const handoverStatusData = Object.entries(handoversByStatus).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
  }));

  const taskStatusData = Object.entries(tasksByStatus).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
  }));

  const handoversByDayData = Object.entries(handoversByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), handovers: count }));

  const tasksByDayData = Object.entries(tasksByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date: date.slice(5), created: v.created, completed: v.completed, overdue: v.overdue }));

  const handoversByShiftData = Object.entries(handoversByShift).map(([name, v]) => ({
    name,
    completed: v.completed,
    pending: v.pending,
    incomplete: v.incomplete,
  }));

  const completenessData = [
    { name: 'Complete (75-100%)', value: completenessDistribution.complete },
    { name: 'Partial (50-74%)', value: completenessDistribution.partial },
    { name: 'Started (25-49%)', value: completenessDistribution.started },
    { name: 'Empty (0-24%)', value: completenessDistribution.empty },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Performance metrics and compliance data</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="startDate" className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
            <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <label htmlFor="wardFilter" className="block text-xs font-medium text-gray-600 mb-1">Ward</label>
            <select id="wardFilter" value={wardId} onChange={(e) => setWardId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="">All Wards</option>
              {availableWards.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.department})</option>
              ))}
            </select>
          </div>
          {(startDate || endDate || wardId) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); setWardId(''); }}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium">Clear Filters</button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile label="Avg Completeness" value={summary.avgCompleteness} unit="%" color={summary.avgCompleteness >= 75 ? 'text-green-600' : summary.avgCompleteness >= 50 ? 'text-yellow-600' : 'text-red-600'} />
        <StatTile label="Avg Handover Duration" value={summary.avgDurationMinutes} unit="min" />
        <StatTile label="Clarification Rate" value={summary.clarificationRate} unit="%" color={summary.clarificationRate > 20 ? 'text-yellow-600' : 'text-gray-900'} />
        <StatTile label="Task Completion Rate" value={summary.taskCompletionRate} unit="%" color={summary.taskCompletionRate >= 80 ? 'text-green-600' : 'text-yellow-600'} />
        <StatTile label="Overdue Task Rate" value={summary.overdueTaskRate} unit="%" color={summary.overdueTaskRate > 10 ? 'text-red-600' : 'text-gray-900'} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total Handovers" value={summary.totalHandovers} />
        <StatTile label="Completed" value={summary.completedHandovers} color="text-green-600" />
        <StatTile label="Clarifications" value={summary.totalClarifications} color={summary.totalClarifications > 0 ? 'text-yellow-600' : 'text-gray-900'} />
        <StatTile label="Total Tasks" value={summary.totalTasks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Handover Status Pie Chart */}
        <SectionCard title="Handovers by Status">
          {handoverStatusData.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={handoverStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {handoverStatusData.map((_entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Task Status Pie Chart */}
        <SectionCard title="Tasks by Status">
          {taskStatusData.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={taskStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {taskStatusData.map((_entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Handovers Over Time */}
        <SectionCard title="Handovers Over Time">
          {handoversByDayData.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={handoversByDayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="handovers" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Tasks Over Time */}
        <SectionCard title="Tasks Over Time">
          {tasksByDayData.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tasksByDayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" fill="#3b82f6" name="Created" />
                <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Handovers by Shift */}
        <SectionCard title="Handovers by Shift">
          {handoversByShiftData.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={handoversByShiftData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                <Bar dataKey="incomplete" fill="#ef4444" name="Incomplete" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Completeness Distribution */}
        <SectionCard title="Completeness Distribution">
          {completenessData.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={completenessData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {completenessData.map((_entry, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Shift Report Table */}
      <SectionCard title="Shift Report">
        {shiftReport.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No shift data</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm" role="table" aria-label="Shift report">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600" scope="col">Shift</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600" scope="col">Total Handovers</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600" scope="col">Completed</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600" scope="col">Avg Completeness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shiftReport.map((s) => (
                  <tr key={s.shiftId} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-900">{s.shiftName}</td>
                    <td className="py-2 px-3 text-center">{s.totalHandovers}</td>
                    <td className="py-2 px-3 text-center text-green-600 font-medium">{s.completedHandovers}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`font-medium ${s.avgCompleteness >= 75 ? 'text-green-600' : s.avgCompleteness >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {s.avgCompleteness}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
