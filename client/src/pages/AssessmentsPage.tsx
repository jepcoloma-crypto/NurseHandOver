import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePatientAssessments, usePatient, useCreateAssessment } from '../hooks/useApi';
import type { Assessment } from '../hooks/useApi';

const ASSESSMENT_CATEGORIES = [
  { value: 'General', label: 'General Assessment' },
  { value: 'Pain', label: 'Pain Assessment' },
  { value: 'Neurological', label: 'Neurological' },
  { value: 'Cardiovascular', label: 'Cardiovascular' },
  { value: 'Respiratory', label: 'Respiratory' },
  { value: 'Gastrointestinal', label: 'Gastrointestinal' },
  { value: 'Integumentary', label: 'Skin/Integumentary' },
  { value: 'Musculoskeletal', label: 'Musculoskeletal' },
  { value: 'Elimination', label: 'Elimination' },
  { value: 'Cultural/Spiritual', label: 'Cultural/Spiritual' },
  { value: 'Activity/Rest', label: 'Activity/Rest' },
  { value: 'Coping/Stress', label: 'Coping/Stress' },
  { value: 'Safety', label: 'Safety' },
];

const CATEGORY_COLORS: Record<string, string> = {
  General: 'bg-blue-100 text-blue-800',
  Pain: 'bg-red-100 text-red-800',
  Neurological: 'bg-purple-100 text-purple-800',
  Cardiovascular: 'bg-pink-100 text-pink-800',
  Respiratory: 'bg-cyan-100 text-cyan-800',
  Gastrointestinal: 'bg-yellow-100 text-yellow-800',
  Integumentary: 'bg-orange-100 text-orange-800',
  Musculoskeletal: 'bg-gray-100 text-gray-800',
  Elimination: 'bg-amber-100 text-amber-800',
  'Cultural/Spiritual': 'bg-indigo-100 text-indigo-800',
  'Activity/Rest': 'bg-teal-100 text-teal-800',
  'Coping/Stress': 'bg-violet-100 text-violet-800',
  Safety: 'bg-lime-100 text-lime-800',
};

export function AssessmentsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: patient } = usePatient(id || '');
  const { data: assessments, isLoading } = usePatientAssessments(id || '', 50);
  const createAssessment = useCreateAssessment();

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('');
  const [findings, setFindings] = useState('');
  const [painScale, setPainScale] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!category) e.category = 'Select a category';
    if (!findings.trim()) e.findings = 'Findings are required';
    if (findings.length > 2000) e.findings = 'Max 2000 characters';
    if (painScale && (Number(painScale) < 0 || Number(painScale) > 10)) e.painScale = 'Must be 0-10';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await createAssessment.mutateAsync({
      patientId: id!,
      assessmentType: category,
      findings,
      painScale: painScale ? Number(painScale) : undefined,
      notes: notes || undefined,
    });
    setCategory('');
    setFindings('');
    setPainScale('');
    setNotes('');
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
        <span className="text-gray-900">Assessments</span>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Nursing Assessments</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">
          New Assessment
        </button>
      </div>

      {showForm && (
        <div className="mt-4 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Record Assessment</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select required value={category} onChange={(e) => setCategory(e.target.value)}
                className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm ${errors.category ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="">Select category</option>
                {ASSESSMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Findings</label>
              <textarea required value={findings} onChange={(e) => setFindings(e.target.value)} rows={4}
                className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm ${errors.findings ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Describe your assessment findings..." />
              <div className="flex justify-between mt-1">
                {errors.findings && <p className="text-xs text-red-500">{errors.findings}</p>}
                <p className="text-xs text-gray-400 ml-auto">{findings.length}/2000</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Pain Scale (0-10)</label>
                <input type="number" min="0" max="10" value={painScale} onChange={(e) => setPainScale(e.target.value)}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm ${errors.painScale ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.painScale && <p className="text-xs text-red-500 mt-1">{errors.painScale}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {isLoading ? <div className="text-gray-500">Loading...</div> : (
          assessments?.map((a: Assessment) => (
            <div key={a.id} className="bg-white shadow rounded-lg p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${CATEGORY_COLORS[a.assessmentType] || 'bg-gray-100 text-gray-800'}`}>
                    {a.assessmentType}
                  </span>
                  {a.painScale != null && (
                    <span className={`text-xs font-medium ${a.painScale >= 7 ? 'text-red-600' : a.painScale >= 4 ? 'text-yellow-600' : 'text-green-600'}`}>
                      Pain: {a.painScale}/10
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{formatDT(a.assessedAt)}</span>
              </div>
              <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{a.findings}</p>
              {a.notes && <p className="mt-2 text-xs text-gray-500 italic">{a.notes}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
