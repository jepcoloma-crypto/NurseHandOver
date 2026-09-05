import { useParams, Link } from 'react-router-dom';
import { useHandover } from '../hooks/useApi';

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  CREATED: { icon: '+', color: 'bg-blue-500' },
  UPDATED: { icon: 'E', color: 'bg-yellow-500' },
  VIEWED: { icon: 'V', color: 'bg-gray-400' },
  SUBMITTED: { icon: 'S', color: 'bg-indigo-500' },
  RECEIVED: { icon: 'R', color: 'bg-purple-500' },
  ACCEPTED: { icon: 'A', color: 'bg-green-500' },
  REOPENED: { icon: 'O', color: 'bg-orange-500' },
  CLARIFICATION_REQUESTED: { icon: '?', color: 'bg-yellow-500' },
  CLARIFICATION_RESPONDED: { icon: '!', color: 'bg-amber-500' },
  TRANSITIONED_TO_READY_FOR_REVIEW: { icon: 'T', color: 'bg-blue-500' },
  TRANSITIONED_TO_SUBMITTED: { icon: 'T', color: 'bg-indigo-500' },
  TRANSITIONED_TO_RECEIVED: { icon: 'T', color: 'bg-purple-500' },
  TRANSITIONED_TO_ACCEPTED: { icon: 'T', color: 'bg-green-500' },
  TRANSITIONED_TO_CLARIFICATION_REQUIRED: { icon: 'T', color: 'bg-yellow-500' },
  TRANSITIONED_TO_CLARIFICATION_RESPONDED: { icon: 'T', color: 'bg-amber-500' },
  TRANSITIONED_TO_REOPENED: { icon: 'T', color: 'bg-orange-500' },
  TRANSITIONED_TO_DRAFT: { icon: 'T', color: 'bg-gray-500' },
  TRANSITIONED_TO_CANCELLED: { icon: 'T', color: 'bg-red-500' },
};

function getEventConfig(eventType: string) {
  return EVENT_ICONS[eventType] || { icon: '?', color: 'bg-gray-400' };
}

function formatDT(d: string) { return new Date(d).toLocaleString(); }

export function HandoverTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const { data: handover, isLoading } = useHandover(id || '');

  if (isLoading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!handover) return <div className="p-6 text-red-500">Handover not found</div>;

  const events = handover.events || [];

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/handovers" className="hover:text-primary-600">Handovers</Link>
        <span>/</span>
        <Link to={`/handovers/${id}`} className="hover:text-primary-600">{handover.patient?.firstName} {handover.patient?.lastName}</Link>
        <span>/</span>
        <span className="text-gray-900">Timeline</span>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Handover Timeline</h1>
        <p className="text-sm text-gray-500 mt-1">Chronological event history for this handover</p>
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span>Patient: {handover.patient?.firstName} {handover.patient?.lastName}</span>
          <span>Outgoing: {handover.outgoingNurse?.firstName} {handover.outgoingNurse?.lastName}</span>
          <span>Incoming: {handover.incomingNurse?.firstName} {handover.incomingNurse?.lastName || 'TBD'}</span>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No events recorded yet.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {events.map((event) => {
                const config = getEventConfig(event.eventType);
                const details = event.details as Record<string, unknown> | undefined;
                return (
                  <div key={event.id} className="relative flex items-start gap-4">
                    <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white text-xs font-bold`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">{event.eventType}</span>
                        {typeof details?.from === 'string' && typeof details?.to === 'string' && (
                          <span className="text-xs text-gray-400">
                            ({details.from} → {details.to})
                          </span>
                        )}
                      </div>
                      {event.user && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          by {event.user.firstName} {event.user.lastName}
                        </p>
                      )}
                      {typeof details?.question === 'string' && (
                        <p className="text-xs text-gray-600 mt-1 bg-yellow-50 p-2 rounded">
                          Question: {details.question}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDT(event.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
