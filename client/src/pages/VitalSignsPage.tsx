import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePatientVitals, usePatient, useCreateVitalSign } from '../hooks/useApi';
import type { VitalSign } from '../hooks/useApi';

const PARAM_LABELS: Record<string, string> = {
  temperature: 'Temperature (°C)',
  heartRate: 'Heart Rate (bpm)',
  respiratoryRate: 'Resp Rate (/min)',
  bloodPressureSystolic: 'Systolic (mmHg)',
  bloodPressureDiastolic: 'Diastolic (mmHg)',
  oxygenSaturation: 'SpO2 (%)',
  painScale: 'Pain (0-10)',
  bloodGlucose: 'Glucose (mg/dL)',
};

function getStatusClass(param: string, value: number): string {
  const ranges: Record<string, [number, number, number, number]> = {
    temperature: [36.0, 37.5, 35.0, 38.5],
    heartRate: [60, 100, 40, 130],
    respiratoryRate: [12, 20, 8, 30],
    bloodPressureSystolic: [90, 140, 80, 180],
    bloodPressureDiastolic: [60, 90, 50, 110],
    oxygenSaturation: [95, 100, 90, 100],
    painScale: [0, 3, 0, 7],
    bloodGlucose: [70, 140, 54, 250],
  };
  const r = ranges[param];
  if (!r) return '';
  if (value < r[2] || value > r[3]) return 'text-red-600 font-bold';
  if (value < r[0] || value > r[1]) return 'text-yellow-600 font-medium';
  return 'text-green-600';
}

export function VitalSignsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: patient } = usePatient(id || '');
  const { data: vitals, isLoading } = usePatientVitals(id || '', 50);
  const createVital = useCreateVitalSign();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    temperature: '', heartRate: '', respiratoryRate: '',
    bloodPressureSystolic: '', bloodPressureDiastolic: '',
    oxygenSaturation: '', painScale: '', bloodGlucose: '', notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (formData.temperature && (Number(formData.temperature) < 30 || Number(formData.temperature) > 45))
      e.temperature = 'Must be 30-45°C';
    if (formData.heartRate && (Number(formData.heartRate) < 20 || Number(formData.heartRate) > 300))
      e.heartRate = 'Must be 20-300 bpm';
    if (formData.respiratoryRate && (Number(formData.respiratoryRate) < 4 || Number(formData.respiratoryRate) > 80))
      e.respiratoryRate = 'Must be 4-80 /min';
    if (formData.bloodPressureSystolic && (Number(formData.bloodPressureSystolic) < 40 || Number(formData.bloodPressureSystolic) > 300))
      e.bloodPressureSystolic = 'Must be 40-300 mmHg';
    if (formData.bloodPressureDiastolic && (Number(formData.bloodPressureDiastolic) < 20 || Number(formData.bloodPressureDiastolic) > 200))
      e.bloodPressureDiastolic = 'Must be 20-200 mmHg';
    if (formData.oxygenSaturation && (Number(formData.oxygenSaturation) < 0 || Number(formData.oxygenSaturation) > 100))
      e.oxygenSaturation = 'Must be 0-100%';
    if (formData.painScale && (Number(formData.painScale) < 0 || Number(formData.painScale) > 10))
      e.painScale = 'Must be 0-10';
    if (formData.bloodGlucose && (Number(formData.bloodGlucose) < 0 || Number(formData.bloodGlucose) > 1000))
      e.bloodGlucose = 'Must be 0-1000 mg/dL';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Record<string, number | string> = {};
    if (formData.temperature) payload.temperature = Number(formData.temperature);
    if (formData.heartRate) payload.heartRate = Number(formData.heartRate);
    if (formData.respiratoryRate) payload.respiratoryRate = Number(formData.respiratoryRate);
    if (formData.bloodPressureSystolic) payload.bloodPressureSystolic = Number(formData.bloodPressureSystolic);
    if (formData.bloodPressureDiastolic) payload.bloodPressureDiastolic = Number(formData.bloodPressureDiastolic);
    if (formData.oxygenSaturation) payload.oxygenSaturation = Number(formData.oxygenSaturation);
    if (formData.painScale) payload.painScale = Number(formData.painScale);
    if (formData.bloodGlucose) payload.bloodGlucose = Number(formData.bloodGlucose);
    if (formData.notes) payload.notes = formData.notes;

    await createVital.mutateAsync({ patientId: id!, ...payload });
    setFormData({ temperature: '', heartRate: '', respiratoryRate: '', bloodPressureSystolic: '', bloodPressureDiastolic: '', oxygenSaturation: '', painScale: '', bloodGlucose: '', notes: '' });
    setShowForm(false);
  };

  const formatDT = (d: string) => new Date(d).toLocaleString();

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/patients" className="hover:text-primary-600">Patients</Link>
        <span>/</span>
        <Link to={`/patients/${id}`} className="hover:text-primary-600">{patient?.firstName} {patient?.lastName}</Link>
        <span>/</span>
        <span className="text-gray-900">Vital Signs</span>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Vital Signs</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">
          Record Vital Signs
        </button>
      </div>

      {showForm && (
        <div className="mt-4 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">New Vital Signs Record</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(PARAM_LABELS).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700">{label}</label>
                  <input type="number" step={key === 'temperature' || key === 'oxygenSaturation' || key === 'bloodGlucose' ? '0.1' : '1'}
                    value={formData[key as keyof typeof formData]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm ${errors[key] ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? <div className="p-6 text-gray-500">Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  {Object.entries(PARAM_LABELS).map(([key, label]) => (
                    <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{label.split(' (')[0]}</th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vitals?.map((v: VitalSign) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{formatDT(v.recordedAt)}</td>
                    <td className={`px-4 py-3 text-xs ${getStatusClass('temperature', v.temperature ?? 0)}`}>{v.temperature ?? '-'}</td>
                    <td className={`px-4 py-3 text-xs ${getStatusClass('heartRate', v.heartRate ?? 0)}`}>{v.heartRate ?? '-'}</td>
                    <td className={`px-4 py-3 text-xs ${getStatusClass('respiratoryRate', v.respiratoryRate ?? 0)}`}>{v.respiratoryRate ?? '-'}</td>
                    <td className={`px-4 py-3 text-xs ${getStatusClass('bloodPressureSystolic', v.bloodPressureSystolic ?? 0)}`}>{v.bloodPressureSystolic ?? '-'}</td>
                    <td className={`px-4 py-3 text-xs ${getStatusClass('bloodPressureDiastolic', v.bloodPressureDiastolic ?? 0)}`}>{v.bloodPressureDiastolic ?? '-'}</td>
                    <td className={`px-4 py-3 text-xs ${getStatusClass('oxygenSaturation', v.oxygenSaturation ?? 0)}`}>{v.oxygenSaturation ?? '-'}</td>
                    <td className={`px-4 py-3 text-xs ${getStatusClass('painScale', v.painScale ?? 0)}`}>{v.painScale != null ? `${v.painScale}/10` : '-'}</td>
                    <td className={`px-4 py-3 text-xs ${getStatusClass('bloodGlucose', v.bloodGlucose ?? 0)}`}>{v.bloodGlucose ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{v.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
