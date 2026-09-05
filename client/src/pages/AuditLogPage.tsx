import { useState } from 'react';
import { useAuditLogs } from '../hooks/useApi';
import type { AuditLog } from '../hooks/useApi';

function formatDT(d: string) { return new Date(d).toLocaleString(); }

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  DELETE: 'bg-red-100 text-red-700',
  TRANSITION_SUBMITTED: 'bg-indigo-100 text-indigo-700',
  TRANSITION_RECEIVED: 'bg-purple-100 text-purple-700',
  TRANSITION_ACCEPTED: 'bg-green-100 text-green-700',
  CLARIFICATION_REQUESTED: 'bg-yellow-100 text-yellow-700',
  CLARIFICATION_RESPONDED: 'bg-amber-100 text-amber-700',
};

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return color;
  }
  return 'bg-gray-100 text-gray-700';
}

export function AuditLogPage() {
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAuditLogs({
    entity: entityFilter || undefined,
    action: actionFilter || undefined,
    page,
    limit: 25,
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">System-wide audit trail of all actions (admin only)</p>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
          <option value="">All Entities</option>
          <option value="HANDOVER">Handover</option>
          <option value="PATIENT">Patient</option>
          <option value="TASK">Task</option>
          <option value="USER">User</option>
          <option value="DEPARTMENT">Department</option>
        </select>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="DELETE">Delete</option>
          <option value="TRANSITION">Transition</option>
          <option value="CLARIFICATION">Clarification</option>
        </select>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No audit logs found</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log: AuditLog) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDT(log.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.entity}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.entityId?.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50">
                Previous
              </button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
