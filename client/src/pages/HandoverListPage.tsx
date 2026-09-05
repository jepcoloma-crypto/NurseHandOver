import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHandovers } from '../hooks/useApi';
import type { HandoverSummary } from '../hooks/useApi';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  READY_FOR_REVIEW: { label: 'Ready for Review', color: 'bg-blue-100 text-blue-800' },
  SUBMITTED: { label: 'Submitted', color: 'bg-indigo-100 text-indigo-800' },
  RECEIVED: { label: 'Received', color: 'bg-purple-100 text-purple-800' },
  CLARIFICATION_REQUIRED: { label: 'Clarification Needed', color: 'bg-yellow-100 text-yellow-800' },
  CLARIFICATION_RESPONDED: { label: 'Clarification Responded', color: 'bg-amber-100 text-amber-800' },
  ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-800' },
  REOPENED: { label: 'Reopened', color: 'bg-orange-100 text-orange-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

function formatDT(d: string) { return new Date(d).toLocaleString(); }

export function HandoverListPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: handovers, isLoading } = useHandovers({ status: statusFilter || undefined });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Handovers</h1>
          <p className="text-sm text-gray-500 mt-1">Shift handover management</p>
        </div>
        <div className="flex gap-2">
          <Link to="/handovers/completeness" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300">
            Completeness
          </Link>
          <Link to="/handovers/new" className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">
            New Handover
          </Link>
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
        ) : !handovers || handovers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No handovers found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {handovers.map((h: HandoverSummary) => {
              const statusCfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.DRAFT;
              const completeness = h.completeness ?? 0;
              return (
                <Link key={h.id} to={`/handovers/${h.id}`}
                  className="block p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {h.patient?.firstName} {h.patient?.lastName}
                          {h.patient?.mrn && <span className="text-gray-400 ml-2">MRN: {h.patient.mrn}</span>}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {h.outgoingNurse?.firstName} {h.outgoingNurse?.lastName} → {h.incomingNurse?.firstName} {h.incomingNurse?.lastName || 'TBD'}
                          {h.shift && <span className="ml-2">| {h.shift.name}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {completeness > 0 && (
                        <div className="w-20">
                          <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                            <span>{completeness}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full">
                            <div className="h-1.5 bg-primary-500 rounded-full" style={{ width: `${completeness}%` }} />
                          </div>
                        </div>
                      )}
                      <span className="text-xs text-gray-400">{formatDT(h.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
