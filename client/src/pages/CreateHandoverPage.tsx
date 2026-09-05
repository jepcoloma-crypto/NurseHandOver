import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCreateHandover, useUpdateHandover, useTransitionHandover, usePopulateHandover, usePatients, useShifts, useUsers } from '../hooks/useApi';

const SBAR_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  SITUATION: { label: 'Situation', color: 'border-blue-500 bg-blue-50', description: 'What is happening right now?' },
  BACKGROUND: { label: 'Background', color: 'border-green-500 bg-green-50', description: 'What is the clinical background?' },
  ASSESSMENT: { label: 'Assessment', color: 'border-yellow-500 bg-yellow-50', description: 'What do you think the problem is?' },
  RECOMMENDATION: { label: 'Recommendation', color: 'border-purple-500 bg-purple-50', description: 'What should be done next?' },
};

export function CreateHandoverPage() {
  const navigate = useNavigate();
  const { data: patients } = usePatients();
  const { data: shifts } = useShifts();
  const { data: nurses } = useUsers();
  const createHandover = useCreateHandover();
  const updateHandover = useUpdateHandover();
  const transitionHandover = useTransitionHandover();
  const populateHandover = usePopulateHandover();

  const [patientId, setPatientId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [incomingNurseId, setIncomingNurseId] = useState('');
  const [sections, setSections] = useState<Record<string, string>>({
    SITUATION: '',
    BACKGROUND: '',
    ASSESSMENT: '',
    RECOMMENDATION: '',
  });
  const [handoverId, setHandoverId] = useState<string | null>(null);
  const [isPopulating, setIsPopulating] = useState(false);
  const [populatedFields, setPopulatedFields] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const patientsList = Array.isArray(patients) ? patients : [];
  const shiftsList = Array.isArray(shifts) ? shifts : [];
  const nursesList = Array.isArray(nurses) ? nurses : [];

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!patientId) e.patientId = 'Select a patient';
    if (!shiftId) e.shiftId = 'Select a shift';
    const filledSections = Object.values(sections).filter((v) => v.trim().length > 0);
    if (filledSections.length === 0) e.sections = 'At least one SBAR section is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreateDraft = async () => {
    if (!patientId || !shiftId) {
      setErrors({ patientId: !patientId ? 'Select a patient' : '', shiftId: !shiftId ? 'Select a shift' : '' });
      return;
    }

    const result = await createHandover.mutateAsync({
      patientId,
      shiftId,
      incomingNurseId: incomingNurseId || undefined,
      sections: Object.fromEntries(Object.entries(sections).filter(([, v]) => v.trim().length > 0)),
    });

    if (result?.id) {
      setHandoverId(result.id);
    }
  };

  const handleAutoPopulate = async () => {
    if (!handoverId) return;
    setIsPopulating(true);
    try {
      const populated = await populateHandover.mutateAsync(handoverId);
      if (populated) {
        setSections((prev) => {
          const updated = { ...prev };
          const newPopulated = new Set(populatedFields);
          for (const [key, value] of Object.entries(populated)) {
            if (!prev[key] || prev[key].trim().length === 0) {
              updated[key] = value;
              newPopulated.add(key);
            }
          }
          setPopulatedFields(newPopulated);
          return updated;
        });
      }
    } finally {
      setIsPopulating(false);
    }
  };

  const handleSectionChange = (type: string, value: string) => {
    setSections((prev) => ({ ...prev, [type]: value }));
    setPopulatedFields((prev) => {
      const next = new Set(prev);
      next.delete(type);
      return next;
    });
  };

  const handleSaveDraft = async () => {
    if (!handoverId) return;
    await updateHandover.mutateAsync({ id: handoverId, sections });
  };

  const handleSubmitForReview = async () => {
    if (!handoverId) return;
    if (!validate()) return;
    await transitionHandover.mutateAsync({ id: handoverId, status: 'READY_FOR_REVIEW' });
    navigate('/handovers');
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/handovers" className="hover:text-primary-600">Handovers</Link>
        <span>/</span>
        <span className="text-gray-900">New Handover</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Handover</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-medium">Handover Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700">Patient *</label>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)}
                className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm ${errors.patientId ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="">Select patient</option>
                {patientsList.map((p: { id: string; firstName: string; lastName: string; mrn?: string }) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.mrn})</option>
                ))}
              </select>
              {errors.patientId && <p className="text-xs text-red-500 mt-1">{errors.patientId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Shift *</label>
              <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}
                className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm ${errors.shiftId ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="">Select shift</option>
                {shiftsList.map((s: { id: string; name: string }) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.shiftId && <p className="text-xs text-red-500 mt-1">{errors.shiftId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Incoming Nurse</label>
              <select value={incomingNurseId} onChange={(e) => setIncomingNurseId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Not assigned yet</option>
                {nursesList.map((n: { id: string; firstName: string; lastName: string }) => (
                  <option key={n.id} value={n.id}>{n.firstName} {n.lastName}</option>
                ))}
              </select>
            </div>

            {!handoverId ? (
              <button onClick={handleCreateDraft}
                disabled={createHandover.isPending}
                className="w-full bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700 disabled:opacity-50">
                {createHandover.isPending ? 'Creating...' : 'Create Draft'}
              </button>
            ) : (
              <div className="space-y-2">
                <button onClick={handleAutoPopulate}
                  disabled={isPopulating}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50">
                  {isPopulating ? 'Populating...' : 'Auto-Populate from Patient Data'}
                </button>
                <button onClick={handleSaveDraft}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300">
                  Save Draft
                </button>
                <button onClick={handleSubmitForReview}
                  disabled={!validate()}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50">
                  Submit for Review
                </button>
              </div>
            )}

            {errors.sections && <p className="text-xs text-red-500">{errors.sections}</p>}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {(Object.entries(SBAR_CONFIG) as [string, typeof SBAR_CONFIG[string]][]).map(([type, config]) => (
            <div key={type} className={`bg-white shadow rounded-lg p-6 border-l-4 ${config.color}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{config.label}</h3>
                  <p className="text-xs text-gray-500">{config.description}</p>
                </div>
                {populatedFields.has(type) && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Auto-populated</span>
                )}
              </div>
              <textarea
                value={sections[type]}
                onChange={(e) => handleSectionChange(type, e.target.value)}
                rows={5}
                placeholder={`Enter ${config.label.toLowerCase()} information...`}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-y"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-400">{sections[type].length} characters</p>
                {sections[type].trim().length > 0 && (
                  <span className="text-xs text-green-600">Filled</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
