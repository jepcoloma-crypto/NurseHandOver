import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useHandover, useUpdateHandover, useTransitionHandover, useDeleteHandover } from '../hooks/useApi';

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

const SBAR_CONFIG: Record<string, { label: string; color: string }> = {
  SITUATION: { label: 'Situation', color: 'border-blue-500 bg-blue-50' },
  BACKGROUND: { label: 'Background', color: 'border-green-500 bg-green-50' },
  ASSESSMENT: { label: 'Assessment', color: 'border-yellow-500 bg-yellow-50' },
  RECOMMENDATION: { label: 'Recommendation', color: 'border-purple-500 bg-purple-50' },
};

function formatDT(d: string) { return new Date(d).toLocaleString(); }

export function HandoverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: handover, isLoading } = useHandover(id || '');
  const updateHandover = useUpdateHandover();
  const transitionHandover = useTransitionHandover();
  const deleteHandover = useDeleteHandover();

  const [editing, setEditing] = useState(false);
  const [sections, setSections] = useState<Record<string, string>>({});

  if (isLoading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!handover) return <div className="p-6 text-red-500">Handover not found</div>;

  const statusCfg = STATUS_CONFIG[handover.status] || STATUS_CONFIG.DRAFT;
  const validTransitions = handover.validTransitions || [];
  const sectionsList = handover.sections || [];
  const completeness = handover.completeness ?? 0;

  const handleStartEdit = () => {
    const s: Record<string, string> = {};
    for (const section of sectionsList) {
      s[section.sectionType] = section.content;
    }
    setSections(s);
    setEditing(true);
  };

  const handleSave = async () => {
    await updateHandover.mutateAsync({ id: id!, sections });
    setEditing(false);
  };

  const handleTransition = async (status: string) => {
    await transitionHandover.mutateAsync({ id: id!, status });
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this draft handover?')) return;
    await deleteHandover.mutateAsync(id!);
    navigate('/handovers');
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/handovers" className="hover:text-primary-600">Handovers</Link>
        <span>/</span>
        <span className="text-gray-900">Handover Detail</span>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {handover.patient?.firstName} {handover.patient?.lastName}
              </h1>
              <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>MRN: {handover.patient?.mrn}</span>
              <span>Outgoing: {handover.outgoingNurse?.firstName} {handover.outgoingNurse?.lastName}</span>
              <span>Incoming: {handover.incomingNurse?.firstName} {handover.incomingNurse?.lastName || 'TBD'}</span>
              <span>Shift: {handover.shift?.name}</span>
            </div>
          </div>
          <div className="w-32">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Completeness</span>
              <span>{completeness}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div className={`h-2 rounded-full ${completeness >= 75 ? 'bg-green-500' : completeness >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${completeness}%` }} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {!editing && validTransitions.length > 0 && handover.status !== 'COMPLETED' && handover.status !== 'CANCELLED' && (
            <button onClick={handleStartEdit} className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">
              Edit Sections
            </button>
          )}
          {validTransitions.includes('READY_FOR_REVIEW') && (
            <button onClick={() => handleTransition('READY_FOR_REVIEW')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700">
              Submit for Review
            </button>
          )}
          {validTransitions.includes('SUBMITTED') && (
            <button onClick={() => handleTransition('SUBMITTED')}
              className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700">
              Submit
            </button>
          )}
          {validTransitions.includes('RECEIVED') && (
            <button onClick={() => handleTransition('RECEIVED')}
              className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700">
              Mark Received
            </button>
          )}
          {validTransitions.includes('ACCEPTED') && (
            <button onClick={() => handleTransition('ACCEPTED')}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700">
              Accept
            </button>
          )}
          {validTransitions.includes('DRAFT') && (
            <button onClick={() => handleTransition('DRAFT')}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300">
              Return to Draft
            </button>
          )}
          {handover.status === 'DRAFT' && (
            <button onClick={handleDelete}
              className="bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm hover:bg-red-200">
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {(Object.entries(SBAR_CONFIG) as [string, typeof SBAR_CONFIG[string]][]).map(([type, config]) => {
          const section = sectionsList.find((s) => s.sectionType === type);
          const content = editing ? (sections[type] || '') : (section?.content || '');

          return (
            <div key={type} className={`bg-white shadow rounded-lg p-6 border-l-4 ${config.color}`}>
              <h3 className="text-lg font-medium text-gray-900 mb-3">{config.label}</h3>
              {editing ? (
                <textarea
                  value={sections[type] || ''}
                  onChange={(e) => setSections((prev) => ({ ...prev, [type]: e.target.value }))}
                  rows={5}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-y"
                />
              ) : (
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {content || <span className="text-gray-400 italic">Not filled</span>}
                </div>
              )}
            </div>
          );
        })}

        {editing && (
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={updateHandover.isPending}
              className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700 disabled:opacity-50">
              {updateHandover.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setEditing(false)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300">
              Cancel
            </button>
          </div>
        )}
      </div>

      {handover.events && handover.events.length > 0 && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Event History</h3>
          <div className="space-y-3">
            {handover.events.map((event) => (
              <div key={event.id} className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-36 flex-shrink-0">{formatDT(event.createdAt)}</span>
                <span className="text-gray-600">{event.eventType}</span>
                {event.user && <span className="text-gray-400">by {event.user.firstName} {event.user.lastName}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
