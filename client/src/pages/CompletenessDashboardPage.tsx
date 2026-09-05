import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHandovers } from '../hooks/useApi';
import type { HandoverSummary } from '../hooks/useApi';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  READY_FOR_REVIEW: { label: 'Ready for Review', color: 'bg-blue-100 text-blue-800' },
  SUBMITTED: { label: 'Submitted', color: 'bg-indigo-100 text-indigo-800' },
  RECEIVED: { label: 'Received', color: 'bg-purple-100 text-purple-800' },
  ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

function getCompletenessColor(p: number): string {
  if (p >= 75) return 'bg-green-500';
  if (p >= 50) return 'bg-yellow-500';
  if (p >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

function getCompletenessTextColor(p: number): string {
  if (p >= 75) return 'text-green-700';
  if (p >= 50) return 'text-yellow-700';
  if (p >= 25) return 'text-orange-700';
  return 'text-red-700';
}

function getCompletenessLabel(p: number): string {
  if (p === 100) return 'Complete';
  if (p >= 75) return 'Nearly Complete';
  if (p >= 50) return 'Partially Complete';
  if (p >= 25) return 'Barely Started';
  if (p > 0) return 'Just Started';
  return 'Empty';
}

function formatDT(d: string) { return new Date(d).toLocaleString(); }

export function CompletenessDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: handovers, isLoading } = useHandovers({ status: statusFilter || undefined });

  const list = Array.isArray(handovers) ? handovers : [];

  const stats = {
    total: list.length,
    draft: list.filter((h) => h.status === 'DRAFT').length,
    complete: list.filter((h) => (h.completeness ?? 0) === 100).length,
    submittable: list.filter((h) => (h.completeness ?? 0) >= 50).length,
    notSubmittable: list.filter((h) => (h.completeness ?? 0) < 50 && h.status === 'DRAFT').length,
  };

  const avgCompleteness = list.length > 0
    ? Math.round(list.reduce((sum, h) => sum + (h.completeness ?? 0), 0) / list.length)
    : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Completeness Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Handover information completeness overview</p>
        </div>
        <Link to="/handovers/new" className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">
          New Handover
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-medium">Overall Statistics</h2>
          <span className="text-xs text-gray-400">(Information completeness only — not clinical accuracy)</span>
        </div>
        <div className="grid grid-cols-5 gap-4 mt-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Total Handovers</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.draft}</p>
            <p className="text-xs text-gray-500 mt-1">Drafts</p>
          </div>
          <div className="text-center">
            <p className={`text-3xl font-bold ${getCompletenessTextColor(avgCompleteness)}`}>{avgCompleteness}%</p>
            <p className="text-xs text-gray-500 mt-1">Avg Completeness</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{stats.submittable}</p>
            <p className="text-xs text-gray-500 mt-1">Submittable</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">{stats.notSubmittable}</p>
            <p className="text-xs text-gray-500 mt-1">Not Submittable</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-gray-500">Loading...</div>
        ) : list.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No handovers found</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outgoing</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incoming</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completeness</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {list.map((h: HandoverSummary) => {
                const p = h.completeness ?? 0;
                const statusCfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.DRAFT;
                return (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/handovers/${h.id}`} className="text-primary-600 hover:text-primary-800 font-medium">
                        {h.patient?.firstName} {h.patient?.lastName}
                      </Link>
                      {h.patient?.mrn && <span className="text-xs text-gray-400 ml-2">MRN: {h.patient.mrn}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{h.outgoingNurse?.firstName} {h.outgoingNurse?.lastName}</td>
                    <td className="px-4 py-3 text-gray-600">{h.incomingNurse?.firstName} {h.incomingNurse?.lastName || 'TBD'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 rounded-full w-32">
                            <div className={`h-2 rounded-full ${getCompletenessColor(p)}`} style={{ width: `${p}%` }} />
                          </div>
                        </div>
                        <span className={`text-sm font-medium w-12 ${getCompletenessTextColor(p)}`}>{p}%</span>
                        <span className="text-xs text-gray-400 w-28">{getCompletenessLabel(p)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDT(h.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
