import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useHandover } from '../hooks/useApi';

const SBAR_CONFIG: Record<string, { label: string; color: string }> = {
  SITUATION: { label: 'Situation', color: 'border-blue-500 bg-blue-50' },
  BACKGROUND: { label: 'Background', color: 'border-green-500 bg-green-50' },
  ASSESSMENT: { label: 'Assessment', color: 'border-yellow-500 bg-yellow-50' },
  RECOMMENDATION: { label: 'Recommendation', color: 'border-purple-500 bg-purple-50' },
};

const SBAR_TYPES = ['SITUATION', 'BACKGROUND', 'ASSESSMENT', 'RECOMMENDATION'];

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

interface VersionSnapshot {
  sections?: { sectionType: string; content: string }[];
  status?: string;
  patient?: { firstName: string; lastName: string };
  [key: string]: unknown;
}

export function HandoverHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { data: handover, isLoading } = useHandover(id || '');
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  if (isLoading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!handover) return <div className="p-6 text-red-500">Handover not found</div>;

  const versions = handover.versions || [];
  const selected = selectedVersion !== null ? versions.find((v) => v.version === selectedVersion) : null;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/handovers" className="hover:text-primary-600">Handovers</Link>
        <span>/</span>
        <Link to={`/handovers/${id}`} className="hover:text-primary-600">{handover.patient?.firstName} {handover.patient?.lastName}</Link>
        <span>/</span>
        <span className="text-gray-900">Version History</span>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Handover Version History</h1>
        <p className="text-sm text-gray-500 mt-1">Immutable historical snapshots of this handover</p>
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span>Patient: {handover.patient?.firstName} {handover.patient?.lastName}</span>
          <span>MRN: {handover.patient?.mrn}</span>
          <span>Current Status: <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${(STATUS_CONFIG[handover.status] || STATUS_CONFIG.DRAFT).color}`}>{(STATUS_CONFIG[handover.status] || STATUS_CONFIG.DRAFT).label}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Versions ({versions.length})</h2>
            {versions.length === 0 ? (
              <p className="text-sm text-gray-500">No versions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => {
                  const snap = v.snapshot as VersionSnapshot;
                  const status = snap?.status || 'UNKNOWN';
                  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
                  const isSelected = selectedVersion === v.version;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVersion(v.version)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Version {v.version}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{formatDT(v.createdAt)}</p>
                      {v.createdByUser && (
                        <p className="text-xs text-gray-400">by {v.createdByUser.firstName} {v.createdByUser.lastName}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Version {selected.version} Snapshot</h2>
                <span className="text-xs text-gray-400">{formatDT(selected.createdAt)}</span>
              </div>
              <div className="space-y-4">
                {SBAR_TYPES.map((type) => {
                  const section = (selected.snapshot as VersionSnapshot)?.sections?.find((s) => s.sectionType === type);
                  const content = section?.content || '';
                  const config = SBAR_CONFIG[type];
                  return (
                    <div key={type} className={`border-l-4 ${config.color} p-4 rounded-r-lg`}>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">{config.label}</h3>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {content || <span className="text-gray-400 italic">Not filled</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center min-h-[300px]">
              <p className="text-gray-400">Select a version to view its snapshot</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
