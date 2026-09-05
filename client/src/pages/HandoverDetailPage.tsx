import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useHandover, useUpdateHandover, useTransitionHandover, useDeleteHandover } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { ClarificationPanel } from '../components/ClarificationPanel';

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

const SBAR_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  SITUATION: { label: 'Situation', color: 'border-blue-500 bg-blue-50', description: 'What is happening right now?' },
  BACKGROUND: { label: 'Background', color: 'border-green-500 bg-green-50', description: 'What is the clinical background?' },
  ASSESSMENT: { label: 'Assessment', color: 'border-yellow-500 bg-yellow-50', description: 'What do you think the problem is?' },
  RECOMMENDATION: { label: 'Recommendation', color: 'border-purple-500 bg-purple-50', description: 'What should be done next?' },
};

const SBAR_TYPES = ['SITUATION', 'BACKGROUND', 'ASSESSMENT', 'RECOMMENDATION'];

const WORKFLOW_STEPS = [
  { status: 'SUBMITTED', label: 'Submitted', icon: '1' },
  { status: 'RECEIVED', label: 'Received', icon: '2' },
  { status: 'CLARIFICATION_REQUIRED', label: 'Clarification', icon: '3' },
  { status: 'ACCEPTED', label: 'Accepted', icon: '4' },
];

function formatDT(d: string) { return new Date(d).toLocaleString(); }

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

function getWorkflowStepStatus(currentStatus: string, stepStatus: string): 'completed' | 'current' | 'upcoming' {
  const order = ['SUBMITTED', 'RECEIVED', 'CLARIFICATION_REQUIRED', 'CLARIFICATION_RESPONDED', 'ACCEPTED'];
  const currentIdx = order.indexOf(currentStatus);
  const stepIdx = order.indexOf(stepStatus);
  if (stepStatus === 'ACCEPTED' && currentStatus === 'ACCEPTED') return 'completed';
  if (stepIdx <= currentIdx) return 'completed';
  if (stepIdx === currentIdx + 1) return 'current';
  return 'upcoming';
}

export function HandoverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: handover, isLoading } = useHandover(id || '');
  const updateHandover = useUpdateHandover();
  const transitionHandover = useTransitionHandover();
  const deleteHandover = useDeleteHandover();

  const [editing, setEditing] = useState(false);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);

  if (isLoading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!handover) return <div className="p-6 text-red-500">Handover not found</div>;

  const statusCfg = STATUS_CONFIG[handover.status] || STATUS_CONFIG.DRAFT;
  const validTransitions = handover.validTransitions || [];
  const sectionsList = handover.sections || [];
  const completeness = handover.completeness ?? 0;

  const isOutgoingNurse = user?.id === handover.outgoingNurse?.id;
  const isIncomingNurse = user?.id === handover.incomingNurse?.id;
  const isAdmin = user?.roles?.some((r) => r === 'ADMINISTRATOR');

  const sectionAnalysis = SBAR_TYPES.map((type) => {
    const section = sectionsList.find((s) => s.sectionType === type);
    const content = section?.content || '';
    const trimmed = content.trim();
    const isEmpty = trimmed.length === 0;
    const wordCount = isEmpty ? 0 : trimmed.split(/\s+/).filter(Boolean).length;
    const config = SBAR_CONFIG[type];
    return { type, config, content: trimmed, isEmpty, wordCount, charCount: trimmed.length };
  });

  const filledCount = sectionAnalysis.filter((s) => !s.isEmpty).length;

  const canEdit = (isOutgoingNurse || isAdmin) && ['DRAFT', 'READY_FOR_REVIEW'].includes(handover.status);
  const canClarify = isIncomingNurse && ['RECEIVED', 'CLARIFICATION_RESPONDED'].includes(handover.status);
  const canRespondClarification = isOutgoingNurse && ['CLARIFICATION_REQUIRED'].includes(handover.status);

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

  const handleAccept = async () => {
    await transitionHandover.mutateAsync({ id: id!, status: 'ACCEPTED' });
    setShowAcceptConfirm(false);
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
        <Link to="/handovers/completeness" className="hover:text-primary-600">Completeness</Link>
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
          <div className="w-40">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Information Completeness</span>
              <span className={`font-medium ${getCompletenessTextColor(completeness)}`}>{completeness}%</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full">
              <div className={`h-2.5 rounded-full ${getCompletenessColor(completeness)}`}
                style={{ width: `${completeness}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{getCompletenessLabel(completeness)}</p>
          </div>
        </div>

        {['SUBMITTED', 'RECEIVED', 'CLARIFICATION_REQUIRED', 'CLARIFICATION_RESPONDED', 'ACCEPTED'].includes(handover.status) && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Receiving Workflow</h3>
            <div className="flex items-center gap-0">
              {WORKFLOW_STEPS.map((step, i) => {
                const stepSt = getWorkflowStepStatus(handover.status, step.status);
                const isLast = i === WORKFLOW_STEPS.length - 1;
                return (
                  <div key={step.status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        stepSt === 'completed' ? 'bg-green-500 text-white' :
                        stepSt === 'current' ? 'bg-primary-600 text-white ring-2 ring-primary-200' :
                        'bg-gray-200 text-gray-500'
                      }`}>
                        {stepSt === 'completed' ? '✓' : step.icon}
                      </div>
                      <span className={`text-xs mt-1 ${
                        stepSt === 'completed' ? 'text-green-600' :
                        stepSt === 'current' ? 'text-primary-600 font-medium' :
                        'text-gray-400'
                      }`}>{step.label}</span>
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-0.5 mx-2 ${
                        stepSt === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {canEdit && (
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
              Mark as Received
            </button>
          )}
          {validTransitions.includes('ACCEPTED') && !showAcceptConfirm && (
            <button onClick={() => setShowAcceptConfirm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700">
              Accept Handover
            </button>
          )}
          {showAcceptConfirm && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-4">
              <span className="text-sm text-green-800 font-medium">Confirm acceptance?</span>
              <button onClick={handleAccept} disabled={transitionHandover.isPending}
                className="bg-green-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-green-700 disabled:opacity-50">
                {transitionHandover.isPending ? 'Accepting...' : 'Yes, Accept'}
              </button>
              <button onClick={() => setShowAcceptConfirm(false)}
                className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs hover:bg-gray-300">
                Cancel
              </button>
            </div>
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

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Completeness Breakdown</h2>
        <p className="text-xs text-gray-400 mb-4">Information completeness only — not clinical accuracy</p>
        <div className="grid grid-cols-4 gap-4">
          {sectionAnalysis.map((s) => (
            <div key={s.type} className={`border-l-4 ${s.config.color} p-4 rounded-r-lg`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">{s.config.label}</h3>
                {s.isEmpty ? (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Missing</span>
                ) : (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Filled</span>
                )}
              </div>
              <p className="text-xs text-gray-500">{s.config.description}</p>
              {!s.isEmpty && (
                <div className="mt-2 text-xs text-gray-400">
                  <span>{s.charCount} chars</span>
                  <span className="mx-1">·</span>
                  <span>{s.wordCount} words</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          <span>{filledCount}/{SBAR_TYPES.length} sections filled</span>
          <span>·</span>
          <span className={completeness >= 50 ? 'text-green-600' : 'text-red-600'}>
            {completeness >= 50 ? 'Ready for submission' : `${50 - completeness}% more needed for submission`}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {sectionAnalysis.map((s) => {
          const content = editing ? (sections[s.type] || '') : s.content;

          return (
            <div key={s.type} className={`bg-white shadow rounded-lg p-6 border-l-4 ${s.config.color}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">{s.config.label}</h3>
                {!s.isEmpty && (
                  <span className="text-xs text-gray-400">{s.charCount} chars, {s.wordCount} words</span>
                )}
              </div>
              {editing ? (
                <textarea
                  value={sections[s.type] || ''}
                  onChange={(e) => setSections((prev) => ({ ...prev, [s.type]: e.target.value }))}
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

      <div className="mt-6">
        <ClarificationPanel
          handoverId={id!}
          clarifications={handover.clarifications || []}
          canRequest={canClarify}
          canRespond={canRespondClarification}
        />
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
