import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePatient, usePatientVitals, usePatientTasks, useTransitionTask, useCreateVitalSign, useCreateTask } from '../hooks/useApi';
import type { VitalSign, Assessment, Task, HandoverSummary } from '../hooks/useApi';

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: patient, isLoading: patientLoading } = usePatient(id || '');
  const { data: vitals } = usePatientVitals(id || '', 5);
  const { data: tasks } = usePatientTasks(id || '', 10);
  const createVital = useCreateVitalSign();
  const createTask = useCreateTask();
  const transitionTask = useTransitionTask();

  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'tasks' | 'timeline'>('overview');
  const [showVitalForm, setShowVitalForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [vitalData, setVitalData] = useState({
    temperature: '', heartRate: '', respiratoryRate: '',
    bloodPressureSystolic: '', bloodPressureDiastolic: '',
    oxygenSaturation: '', painScale: '', bloodGlucose: '',
  });
  const [taskData, setTaskData] = useState({ title: '', description: '', priority: 'medium' });

  if (patientLoading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!patient) return <div className="p-6 text-red-500">Patient not found</div>;

  const handleAddVital = async (e: React.FormEvent) => {
    e.preventDefault();
    await createVital.mutateAsync({
      patientId: id!,
      temperature: vitalData.temperature ? Number(vitalData.temperature) : undefined,
      heartRate: vitalData.heartRate ? Number(vitalData.heartRate) : undefined,
      respiratoryRate: vitalData.respiratoryRate ? Number(vitalData.respiratoryRate) : undefined,
      bloodPressureSystolic: vitalData.bloodPressureSystolic ? Number(vitalData.bloodPressureSystolic) : undefined,
      bloodPressureDiastolic: vitalData.bloodPressureDiastolic ? Number(vitalData.bloodPressureDiastolic) : undefined,
      oxygenSaturation: vitalData.oxygenSaturation ? Number(vitalData.oxygenSaturation) : undefined,
      painScale: vitalData.painScale ? Number(vitalData.painScale) : undefined,
      bloodGlucose: vitalData.bloodGlucose ? Number(vitalData.bloodGlucose) : undefined,
    });
    setVitalData({ temperature: '', heartRate: '', respiratoryRate: '', bloodPressureSystolic: '', bloodPressureDiastolic: '', oxygenSaturation: '', painScale: '', bloodGlucose: '' });
    setShowVitalForm(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTask.mutateAsync({ patientId: id!, ...taskData });
    setTaskData({ title: '', description: '', priority: 'medium' });
    setShowTaskForm(false);
  };

  const handleCompleteTask = async (taskId: string) => {
    await transitionTask.mutateAsync({ id: taskId, status: 'COMPLETED' });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString();
  const formatDateTime = (d: string) => new Date(d).toLocaleString();

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'vitals', label: 'Vital Signs' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'timeline', label: 'Timeline' },
  ] as const;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/patients" className="hover:text-primary-600">Patients</Link>
        <span>/</span>
        <span className="text-gray-900">{patient.firstName} {patient.lastName}</span>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patient.firstName} {patient.lastName}</h1>
            <p className="text-sm text-gray-500 mt-1">MRN: {patient.mrn} | {patient.gender} | DOB: {formatDate(patient.dateOfBirth)}</p>
            <p className="text-sm text-gray-500">Ward: {patient.ward?.name || '-'} | Bed: {patient.bed?.number || '-'}</p>
            <p className="text-sm text-gray-500">Admitted: {formatDate(patient.admissionDate)}</p>
          </div>
          <div className="flex gap-2">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              patient.status === 'active' ? 'bg-green-100 text-green-800' :
              patient.status === 'discharged' ? 'bg-gray-100 text-gray-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {patient.status}
            </span>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Link to={`/patients/${id}/vitals`} className="text-sm text-primary-600 hover:text-primary-800 font-medium">Full Vital Signs View</Link>
          <Link to={`/patients/${id}/assessments`} className="text-sm text-primary-600 hover:text-primary-800 font-medium">Assessments</Link>
          <Link to={`/patients/${id}/timeline`} className="text-sm text-primary-600 hover:text-primary-800 font-medium">Timeline</Link>
          <Link to={`/patients/${id}/tasks`} className="text-sm text-primary-600 hover:text-primary-800 font-medium">All Tasks</Link>
        </div>
      </div>

      <div className="mt-4 border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 text-sm font-medium border-b-2 ${
                activeTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Latest Vitals</h3>
              {vitals && vitals.length > 0 ? (
                <dl className="space-y-2">
                  {vitals[0].temperature && <div className="flex justify-between"><dt className="text-sm text-gray-500">Temperature</dt><dd className="text-sm font-medium">{vitals[0].temperature}°C</dd></div>}
                  {vitals[0].heartRate && <div className="flex justify-between"><dt className="text-sm text-gray-500">Heart Rate</dt><dd className="text-sm font-medium">{vitals[0].heartRate} bpm</dd></div>}
                  {vitals[0].bloodPressureSystolic && <div className="flex justify-between"><dt className="text-sm text-gray-500">Blood Pressure</dt><dd className="text-sm font-medium">{vitals[0].bloodPressureSystolic}/{vitals[0].bloodPressureDiastolic}</dd></div>}
                  {vitals[0].oxygenSaturation && <div className="flex justify-between"><dt className="text-sm text-gray-500">SpO2</dt><dd className="text-sm font-medium">{vitals[0].oxygenSaturation}%</dd></div>}
                  {vitals[0].painScale != null && <div className="flex justify-between"><dt className="text-sm text-gray-500">Pain Scale</dt><dd className="text-sm font-medium">{vitals[0].painScale}/10</dd></div>}
                  {vitals[0].bloodGlucose && <div className="flex justify-between"><dt className="text-sm text-gray-500">Blood Glucose</dt><dd className="text-sm font-medium">{vitals[0].bloodGlucose} mg/dL</dd></div>}
                  <p className="text-xs text-gray-400 mt-2">Recorded: {formatDateTime(vitals[0].recordedAt)}</p>
                </dl>
              ) : <p className="text-sm text-gray-500">No vital signs recorded</p>}
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Pending Tasks</h3>
              {tasks && tasks.length > 0 ? (
                <ul className="space-y-2">
                  {tasks.slice(0, 5).map((task: Task) => (
                    <li key={task.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                        {task.title}
                      </div>
                      <span className="text-xs text-gray-400">{task.priority}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">No pending tasks</p>}
            </div>
          </div>
        )}

        {activeTab === 'vitals' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Vital Signs History</h3>
              <div className="flex gap-2">
                <Link to={`/patients/${id}/vitals`} className="text-sm text-primary-600 hover:text-primary-800">Full View</Link>
                <button onClick={() => setShowVitalForm(!showVitalForm)}
                  className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700">Add</button>
              </div>
            </div>
            {showVitalForm && (
              <form onSubmit={handleAddVital} className="mb-6 bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <input type="number" step="0.1" placeholder="Temp (°C)" value={vitalData.temperature} onChange={(e) => setVitalData({ ...vitalData, temperature: e.target.value })} className="border rounded px-2 py-1 text-sm" />
                  <input type="number" placeholder="Heart Rate" value={vitalData.heartRate} onChange={(e) => setVitalData({ ...vitalData, heartRate: e.target.value })} className="border rounded px-2 py-1 text-sm" />
                  <input type="number" placeholder="Resp Rate" value={vitalData.respiratoryRate} onChange={(e) => setVitalData({ ...vitalData, respiratoryRate: e.target.value })} className="border rounded px-2 py-1 text-sm" />
                  <input type="number" placeholder="Systolic" value={vitalData.bloodPressureSystolic} onChange={(e) => setVitalData({ ...vitalData, bloodPressureSystolic: e.target.value })} className="border rounded px-2 py-1 text-sm" />
                  <input type="number" placeholder="Diastolic" value={vitalData.bloodPressureDiastolic} onChange={(e) => setVitalData({ ...vitalData, bloodPressureDiastolic: e.target.value })} className="border rounded px-2 py-1 text-sm" />
                  <input type="number" step="0.1" placeholder="SpO2 %" value={vitalData.oxygenSaturation} onChange={(e) => setVitalData({ ...vitalData, oxygenSaturation: e.target.value })} className="border rounded px-2 py-1 text-sm" />
                  <input type="number" min="0" max="10" placeholder="Pain (0-10)" value={vitalData.painScale} onChange={(e) => setVitalData({ ...vitalData, painScale: e.target.value })} className="border rounded px-2 py-1 text-sm" />
                  <input type="number" step="0.1" placeholder="Glucose (mg/dL)" value={vitalData.bloodGlucose} onChange={(e) => setVitalData({ ...vitalData, bloodGlucose: e.target.value })} className="border rounded px-2 py-1 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-primary-600 text-white px-3 py-1 rounded text-sm">Save</button>
                  <button type="button" onClick={() => setShowVitalForm(false)} className="bg-gray-200 px-3 py-1 rounded text-sm">Cancel</button>
                </div>
              </form>
            )}
            <table className="min-w-full text-sm">
              <thead><tr className="border-b">
                <th className="py-2 text-left text-gray-500">Date</th>
                <th className="py-2 text-left text-gray-500">Temp</th>
                <th className="py-2 text-left text-gray-500">HR</th>
                <th className="py-2 text-left text-gray-500">BP</th>
                <th className="py-2 text-left text-gray-500">SpO2</th>
                <th className="py-2 text-left text-gray-500">Pain</th>
                <th className="py-2 text-left text-gray-500">Glucose</th>
              </tr></thead>
              <tbody>
                {vitals?.map((v: VitalSign) => (
                  <tr key={v.id} className="border-b">
                    <td className="py-2">{formatDateTime(v.recordedAt)}</td>
                    <td className="py-2">{v.temperature ?? '-'}</td>
                    <td className="py-2">{v.heartRate ?? '-'}</td>
                    <td className="py-2">{v.bloodPressureSystolic && v.bloodPressureDiastolic ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` : '-'}</td>
                    <td className="py-2">{v.oxygenSaturation ?? '-'}</td>
                    <td className="py-2">{v.painScale != null ? `${v.painScale}/10` : '-'}</td>
                    <td className="py-2">{v.bloodGlucose ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Nursing Tasks</h3>
              <button onClick={() => setShowTaskForm(!showTaskForm)}
                className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700">Add Task</button>
            </div>
            {showTaskForm && (
              <form onSubmit={handleAddTask} className="mb-6 bg-gray-50 p-4 rounded-lg space-y-3">
                <input type="text" placeholder="Title" required value={taskData.title} onChange={(e) => setTaskData({ ...taskData, title: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                <textarea placeholder="Description" value={taskData.description} onChange={(e) => setTaskData({ ...taskData, description: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" rows={2} />
                <select value={taskData.priority} onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })} className="border rounded px-2 py-1 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <div className="flex gap-2">
                  <button type="submit" className="bg-primary-600 text-white px-3 py-1 rounded text-sm">Create</button>
                  <button type="button" onClick={() => setShowTaskForm(false)} className="bg-gray-200 px-3 py-1 rounded text-sm">Cancel</button>
                </div>
              </form>
            )}
            <div className="space-y-3">
              {tasks?.map((task: Task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.description && <p className="text-xs text-gray-500">{task.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{task.priority}</span>
                    {task.status !== 'completed' && (
                      <button onClick={() => handleCompleteTask(task.id)} className="text-xs text-green-600 hover:text-green-500">Complete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Patient Timeline</h3>
              <Link to={`/patients/${id}/timeline`} className="text-sm text-primary-600 hover:text-primary-800">Full Timeline View</Link>
            </div>
            {patient.vitalSigns && patient.vitalSigns.length > 0 || patient.nursingAssessments && patient.nursingAssessments.length > 0 || patient.handovers && patient.handovers.length > 0 ? (
              <div className="space-y-4">
                {patient.vitalSigns?.map((v: VitalSign) => (
                  <div key={v.id} className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Vital Signs recorded</p>
                      <p className="text-xs text-gray-500">{formatDateTime(v.recordedAt)}</p>
                    </div>
                  </div>
                ))}
                {patient.nursingAssessments?.map((a: Assessment) => (
                  <div key={a.id} className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Assessment: {a.assessmentType}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(a.assessedAt)}</p>
                    </div>
                  </div>
                ))}
                {patient.handovers?.map((h: HandoverSummary) => (
                  <div key={h.id} className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Handover: {h.status}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(h.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">No timeline events</p>}
          </div>
        )}
      </div>
    </div>
  );
}
