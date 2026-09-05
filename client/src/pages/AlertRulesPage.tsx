import { useState } from 'react';
import { useAlertRules, useCreateAlertRule, useDeleteAlertRule } from '../hooks/useApi';
import type { AlertRule } from '../hooks/useApi';

const PARAMETERS = [
  { value: 'temperature', label: 'Temperature', unit: '°C' },
  { value: 'heartRate', label: 'Heart Rate', unit: 'bpm' },
  { value: 'respiratoryRate', label: 'Resp Rate', unit: '/min' },
  { value: 'bloodPressureSystolic', label: 'Systolic BP', unit: 'mmHg' },
  { value: 'bloodPressureDiastolic', label: 'Diastolic BP', unit: 'mmHg' },
  { value: 'oxygenSaturation', label: 'SpO2', unit: '%' },
  { value: 'painScale', label: 'Pain Scale', unit: '0-10' },
  { value: 'bloodGlucose', label: 'Blood Glucose', unit: 'mg/dL' },
];

const OPERATORS = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' },
];

const SEVERITIES = [
  { value: 'info', label: 'Info', color: 'bg-blue-100 text-blue-800' },
  { value: 'warning', label: 'Warning', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

export function AlertRulesPage() {
  const { data: rules, isLoading } = useAlertRules();
  const createRule = useCreateAlertRule();
  const deleteRule = useDeleteAlertRule();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [parameter, setParameter] = useState('');
  const [operator, setOperator] = useState('');
  const [threshold, setThreshold] = useState('');
  const [severity, setSeverity] = useState('warning');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!parameter) e.parameter = 'Select a parameter';
    if (!operator) e.operator = 'Select an operator';
    if (!threshold) e.threshold = 'Threshold is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await createRule.mutateAsync({ name, parameter, operator, threshold: Number(threshold), severity });
    setName('');
    setParameter('');
    setOperator('');
    setThreshold('');
    setSeverity('warning');
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this alert rule?')) return;
    await deleteRule.mutateAsync(id);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert Rules</h1>
          <p className="text-sm text-gray-500 mt-1">Configure vital sign thresholds that trigger automated alerts</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">
          New Alert Rule
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Create Alert Rule</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Rule Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., High Fever Alert"
                  className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Parameter</label>
                <select value={parameter} onChange={(e) => setParameter(e.target.value)}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm ${errors.parameter ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="">Select parameter</option>
                  {PARAMETERS.map((p) => <option key={p.value} value={p.value}>{p.label} ({p.unit})</option>)}
                </select>
                {errors.parameter && <p className="text-xs text-red-500 mt-1">{errors.parameter}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Operator</label>
                <select value={operator} onChange={(e) => setOperator(e.target.value)}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm ${errors.operator ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="">Select operator</option>
                  {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {errors.operator && <p className="text-xs text-red-500 mt-1">{errors.operator}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Threshold</label>
                <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm ${errors.threshold ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.threshold && <p className="text-xs text-red-500 mt-1">{errors.threshold}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Severity</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-gray-500">Loading...</div>
        ) : !rules || rules.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No alert rules configured</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rules.map((rule: AlertRule) => {
                const param = PARAMETERS.find((p) => p.value === rule.parameter);
                const op = OPERATORS.find((o) => o.value === rule.operator);
                const sev = SEVERITIES.find((s) => s.value === rule.severity);
                return (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{rule.name}</td>
                    <td className="px-4 py-3 text-gray-600">{param?.label || rule.parameter}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {op?.label || rule.operator} {rule.threshold} {param?.unit || ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${sev?.color || 'bg-gray-100'}`}>
                        {sev?.label || rule.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(rule.id)}
                        className="text-red-600 hover:text-red-800 text-xs">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
