import { useParams, Link } from 'react-router-dom';
import { usePatient, usePatientTimeline } from '../hooks/useApi';
import type { VitalSign, Assessment, Task, HandoverSummary } from '../hooks/useApi';

const EVENT_CONFIG: Record<string, { color: string; label: string }> = {
  VITAL_SIGN: { color: 'bg-blue-500', label: 'Vital Signs' },
  ASSESSMENT: { color: 'bg-green-500', label: 'Assessment' },
  TASK: { color: 'bg-yellow-500', label: 'Task' },
  HANDOVER: { color: 'bg-purple-500', label: 'Handover' },
};

function formatDT(d: string) {
  return new Date(d).toLocaleString();
}

function VitalSignEvent({ data }: { data: VitalSign }) {
  const parts: string[] = [];
  if (data.temperature) parts.push(`Temp: ${data.temperature}°C`);
  if (data.heartRate) parts.push(`HR: ${data.heartRate}`);
  if (data.bloodPressureSystolic && data.bloodPressureDiastolic) parts.push(`BP: ${data.bloodPressureSystolic}/${data.bloodPressureDiastolic}`);
  if (data.oxygenSaturation) parts.push(`SpO2: ${data.oxygenSaturation}%`);
  if (data.painScale != null) parts.push(`Pain: ${data.painScale}/10`);
  if (data.bloodGlucose) parts.push(`Glucose: ${data.bloodGlucose}`);
  return <p className="text-sm text-gray-700">{parts.join(' | ') || 'No values recorded'}</p>;
}

function AssessmentEvent({ data }: { data: Assessment }) {
  return (
    <div>
      <p className="text-sm text-gray-700"><span className="font-medium">{data.assessmentType}:</span> {data.findings.slice(0, 150)}{data.findings.length > 150 ? '...' : ''}</p>
      {data.painScale != null && <p className="text-xs text-gray-500 mt-1">Pain: {data.painScale}/10</p>}
    </div>
  );
}

function TaskEvent({ data }: { data: Task }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${data.priority === 'urgent' ? 'bg-red-500' : data.priority === 'high' ? 'bg-orange-500' : data.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
      <p className="text-sm text-gray-700">{data.title} <span className="text-xs text-gray-400">({data.status})</span></p>
    </div>
  );
}

function HandoverEvent({ data }: { data: HandoverSummary }) {
  return (
    <p className="text-sm text-gray-700">
      Handover: {data.outgoingNurse?.firstName} {data.outgoingNurse?.lastName} → {data.incomingNurse?.firstName} {data.incomingNurse?.lastName || 'TBD'}
      <span className="text-xs text-gray-400 ml-2">({data.status})</span>
    </p>
  );
}

export function TimelinePage() {
  const { id } = useParams<{ id: string }>();
  const { data: patient } = usePatient(id || '');
  const { data: events, isLoading } = usePatientTimeline(id || '', 50);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/patients" className="hover:text-primary-600">Patients</Link>
        <span>/</span>
        <Link to={`/patients/${id}`} className="hover:text-primary-600">{patient?.firstName} {patient?.lastName}</Link>
        <span>/</span>
        <span className="text-gray-900">Timeline</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Patient Timeline</h1>

      <div className="mt-6">
        {isLoading ? <div className="text-gray-500">Loading...</div> : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {events?.map((event, i) => {
                const config = EVENT_CONFIG[event.type];
                return (
                  <div key={i} className="relative pl-10">
                    <div className={`absolute left-2.5 w-3 h-3 rounded-full ${config.color} ring-2 ring-white`} />
                    <div className="bg-white shadow rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${config.color} text-white`}>{config.label}</span>
                        <span className="text-xs text-gray-400">{formatDT(event.date)}</span>
                      </div>
                      {event.type === 'VITAL_SIGN' && <VitalSignEvent data={event.data as VitalSign} />}
                      {event.type === 'ASSESSMENT' && <AssessmentEvent data={event.data as Assessment} />}
                      {event.type === 'TASK' && <TaskEvent data={event.data as Task} />}
                      {event.type === 'HANDOVER' && <HandoverEvent data={event.data as HandoverSummary} />}
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
