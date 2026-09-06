import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useResearchStudy, useResearchParticipants, useResearchSurveys, useResearchMetrics, useUpdateResearchStudy, useCreateResearchParticipant, useCreateResearchSurvey, useCreateResearchMetric } from '../hooks/useApi';

const STATUS_OPTIONS = ['draft', 'active', 'completed', 'archived'];
const METRIC_NAMES = [
  { value: 'handover_completeness', label: 'Handover Completeness' },
  { value: 'handover_duration', label: 'Handover Duration' },
  { value: 'information_omission', label: 'Information Omission' },
  { value: 'clarification_frequency', label: 'Clarification Frequency' },
  { value: 'task_completion', label: 'Task Completion' },
  { value: 'user_satisfaction', label: 'User Satisfaction' },
  { value: 'usability', label: 'Usability' },
  { value: 'perceived_usefulness', label: 'Perceived Usefulness' },
];
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700' },
  archived: { label: 'Archived', className: 'bg-purple-100 text-purple-700' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
}

export function ResearchStudyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: study, isLoading } = useResearchStudy(id || '');
  const { data: participants } = useResearchParticipants(id || '');
  const { data: surveys } = useResearchSurveys(id || '');
  const { data: metrics } = useResearchMetrics(id || '');
  const updateStudy = useUpdateResearchStudy();
  const createParticipant = useCreateResearchParticipant();
  const createSurvey = useCreateResearchSurvey();
  const createMetric = useCreateResearchMetric();

  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [pStudyCode, setPStudyCode] = useState('');
  const [pUserId, setPUserId] = useState('');
  const [pRole, setPRole] = useState('NURSE');

  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [sTitle, setSTitle] = useState('');
  const [sDesc, setSDesc] = useState('');

  const [showMetricForm, setShowMetricForm] = useState(false);
  const [mName, setMName] = useState('handover_completeness');
  const [mValue, setMValue] = useState('');
  const [mPeriod, setMPeriod] = useState('pre');

  const [exportType, setExportType] = useState('metrics');
  const [exportFormat, setExportFormat] = useState('csv');

  if (isLoading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading study...</p></div>;
  if (!study) return <div className="flex items-center justify-center h-64"><p className="text-red-500">Study not found.</p></div>;

  const handleStatusChange = (status: string) => {
    updateStudy.mutate({ id: id!, data: { status } });
  };

  const handleAddParticipant = async () => {
    if (!pStudyCode.trim() || !pUserId.trim()) return;
    await createParticipant.mutateAsync({ studyId: id!, data: { userId: pUserId.trim(), studyCode: pStudyCode.trim(), role: pRole } });
    setPStudyCode(''); setPUserId(''); setShowParticipantForm(false);
  };

  const handleAddSurvey = async () => {
    if (!sTitle.trim()) return;
    await createSurvey.mutateAsync({ studyId: id!, data: { title: sTitle.trim(), description: sDesc.trim() || undefined } });
    setSTitle(''); setSDesc(''); setShowSurveyForm(false);
  };

  const handleAddMetric = async () => {
    if (!mValue.trim()) return;
    let parsed: unknown;
    try { parsed = JSON.parse(mValue); } catch { parsed = mValue; }
    await createMetric.mutateAsync({ studyId: id!, data: { metricName: mName, metricValue: parsed, period: mPeriod } });
    setMValue(''); setShowMetricForm(false);
  };

  const handleExport = () => {
    const base = `/api/v1/research/studies/${id}/export/${exportFormat}?type=${exportType}`;
    window.open(base, '_blank');
  };

  const preMetrics = metrics?.filter((m) => m.period === 'pre') || [];
  const postMetrics = metrics?.filter((m) => m.period === 'post') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/research" className="text-xs text-primary-600 hover:text-primary-800">&larr; Back to Studies</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{study.title}</h1>
          {study.description && <p className="text-sm text-gray-500 mt-1">{study.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={study.status} />
          <select value={study.status} onChange={(e) => handleStatusChange(e.target.value)} className="border border-gray-300 rounded-md px-2 py-1 text-xs">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Participants */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Participants ({participants?.length || 0})</h3>
          <button onClick={() => setShowParticipantForm(!showParticipantForm)} className="text-xs text-primary-600 hover:text-primary-800 font-medium">{showParticipantForm ? 'Cancel' : '+ Add'}</button>
        </div>
        <div className="p-4">
          {showParticipantForm && (
            <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div><label htmlFor="p-study-code" className="block text-xs text-gray-600 mb-1">Study Code</label><input id="p-study-code" value={pStudyCode} onChange={(e) => setPStudyCode(e.target.value)} className="border rounded px-2 py-1 text-sm w-32" placeholder="N001" /></div>
              <div><label htmlFor="p-user-id" className="block text-xs text-gray-600 mb-1">User ID</label><input id="p-user-id" value={pUserId} onChange={(e) => setPUserId(e.target.value)} className="border rounded px-2 py-1 text-sm w-64" placeholder="UUID" /></div>
              <div><label htmlFor="p-role" className="block text-xs text-gray-600 mb-1">Role</label><select id="p-role" value={pRole} onChange={(e) => setPRole(e.target.value)} className="border rounded px-2 py-1 text-sm"><option value="NURSE">Nurse</option><option value="SUPERVISOR">Supervisor</option></select></div>
              <button onClick={handleAddParticipant} className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md">Add</button>
            </div>
          )}
          {(!participants || participants.length === 0) ? (
            <p className="text-sm text-gray-500">No participants enrolled.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm" role="table" aria-label="Research participants">
                <thead><tr className="border-b border-gray-200"><th className="text-left py-2 px-3 font-medium text-gray-600" scope="col">Study Code</th><th className="text-left py-2 px-3 font-medium text-gray-600" scope="col">Name</th><th className="text-left py-2 px-3 font-medium text-gray-600" scope="col">Role</th><th className="text-left py-2 px-3 font-medium text-gray-600" scope="col">Enrolled</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {participants.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-xs">{p.studyCode}</td>
                      <td className="py-2 px-3">{p.user.firstName} {p.user.lastName}</td>
                      <td className="py-2 px-3">{p.role}</td>
                      <td className="py-2 px-3 text-gray-400">{new Date(p.enrolledAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Surveys */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Surveys ({surveys?.length || 0})</h3>
          <button onClick={() => setShowSurveyForm(!showSurveyForm)} className="text-xs text-primary-600 hover:text-primary-800 font-medium">{showSurveyForm ? 'Cancel' : '+ Add'}</button>
        </div>
        <div className="p-4">
          {showSurveyForm && (
            <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div><label htmlFor="s-title" className="block text-xs text-gray-600 mb-1">Title</label><input id="s-title" value={sTitle} onChange={(e) => setSTitle(e.target.value)} className="border rounded px-2 py-1 text-sm w-64" /></div>
              <div><label htmlFor="s-desc" className="block text-xs text-gray-600 mb-1">Description</label><input id="s-desc" value={sDesc} onChange={(e) => setSDesc(e.target.value)} className="border rounded px-2 py-1 text-sm w-64" /></div>
              <button onClick={handleAddSurvey} className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md">Add</button>
            </div>
          )}
          {(!surveys || surveys.length === 0) ? (
            <p className="text-sm text-gray-500">No surveys created.</p>
          ) : (
            <div className="space-y-2">
              {surveys.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div><p className="text-sm font-medium">{s.title}</p><p className="text-xs text-gray-400">{s._count.questions} questions, {s._count.responses} responses</p></div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Research Metrics ({metrics?.length || 0})</h3>
          <button onClick={() => setShowMetricForm(!showMetricForm)} className="text-xs text-primary-600 hover:text-primary-800 font-medium">{showMetricForm ? 'Cancel' : '+ Add'}</button>
        </div>
        <div className="p-4">
          {showMetricForm && (
            <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div><label htmlFor="m-name" className="block text-xs text-gray-600 mb-1">Metric</label><select id="m-name" value={mName} onChange={(e) => setMName(e.target.value)} className="border rounded px-2 py-1 text-sm">{METRIC_NAMES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
              <div><label htmlFor="m-period" className="block text-xs text-gray-600 mb-1">Period</label><select id="m-period" value={mPeriod} onChange={(e) => setMPeriod(e.target.value)} className="border rounded px-2 py-1 text-sm"><option value="pre">Pre-intervention</option><option value="post">Post-intervention</option></select></div>
              <div><label htmlFor="m-value" className="block text-xs text-gray-600 mb-1">Value (JSON)</label><input id="m-value" value={mValue} onChange={(e) => setMValue(e.target.value)} className="border rounded px-2 py-1 text-sm w-48" placeholder='{"score": 85}' /></div>
              <button onClick={handleAddMetric} className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md">Add</button>
            </div>
          )}
          {(!metrics || metrics.length === 0) ? (
            <p className="text-sm text-gray-500">No metrics recorded.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Pre-Intervention ({preMetrics.length})</p>
                {preMetrics.length === 0 ? <p className="text-xs text-gray-400">No pre-intervention data</p> : (
                  <div className="space-y-1">
                    {preMetrics.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs p-1.5 bg-blue-50 rounded">
                        <span className="font-medium">{METRIC_NAMES.find((n) => n.value === m.metricName)?.label || m.metricName}</span>
                        <span className="text-gray-500">{typeof m.metricValue === 'object' ? JSON.stringify(m.metricValue) : String(m.metricValue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Post-Intervention ({postMetrics.length})</p>
                {postMetrics.length === 0 ? <p className="text-xs text-gray-400">No post-intervention data</p> : (
                  <div className="space-y-1">
                    {postMetrics.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs p-1.5 bg-green-50 rounded">
                        <span className="font-medium">{METRIC_NAMES.find((n) => n.value === m.metricName)?.label || m.metricName}</span>
                        <span className="text-gray-500">{typeof m.metricValue === 'object' ? JSON.stringify(m.metricValue) : String(m.metricValue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">De-identified Data Export</h3>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 mb-3">Export de-identified research data. Participant study codes are used instead of personal identifiers.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="export-type" className="block text-xs text-gray-600 mb-1">Data Type</label>
              <select id="export-type" value={exportType} onChange={(e) => setExportType(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                <option value="metrics">Research Metrics</option>
                <option value="surveys">Survey Responses</option>
              </select>
            </div>
            <div>
              <label htmlFor="export-format" className="block text-xs text-gray-600 mb-1">Format</label>
              <select id="export-format" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX (JSON)</option>
              </select>
            </div>
            <button onClick={handleExport} className="px-4 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700">Export</button>
          </div>
        </div>
      </div>
    </div>
  );
}
