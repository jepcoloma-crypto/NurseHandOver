import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePatients, useWards, useCreatePatient } from '../hooks/useApi';
import type { Patient, PatientFilters } from '../hooks/useApi';

export function PatientsPage() {
  const [filters, setFilters] = useState<PatientFilters>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const { data, isLoading } = usePatients(filters);
  const { data: wards } = useWards();
  const createPatient = useCreatePatient();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    mrn: '', firstName: '', lastName: '', dateOfBirth: '', gender: '',
    admissionDate: '', wardId: '', bedId: '',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchInput, page: 1 });
  };

  const handleWardFilter = (wardId: string) => {
    setFilters({ ...filters, wardId: wardId || undefined, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPatient.mutateAsync({
      ...formData,
      dateOfBirth: new Date(formData.dateOfBirth).toISOString(),
      admissionDate: new Date(formData.admissionDate).toISOString(),
    });
    setFormData({ mrn: '', firstName: '', lastName: '', dateOfBirth: '', gender: '', admissionDate: '', wardId: '', bedId: '' });
    setShowForm(false);
  };

  const pagination = data?.pagination;

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
        >
          Add Patient
        </button>
      </div>

      <div className="mt-4 flex gap-4 items-end">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by name or MRN..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button type="submit" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300">
            Search
          </button>
        </form>
        <div>
          <label className="block text-sm font-medium text-gray-700">Ward</label>
          <select value={filters.wardId || ''} onChange={(e) => handleWardFilter(e.target.value)}
            className="mt-1 block w-48 border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="">All wards</option>
            {wards?.map((w: { id: string; name: string }) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      {showForm && (
        <div className="mt-4 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">New Patient</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">MRN</label>
                <input type="text" required value={formData.mrn} onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select required value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input type="date" required value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Admission Date</label>
                <input type="date" required value={formData.admissionDate} onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ward</label>
                <select required value={formData.wardId} onChange={(e) => setFormData({ ...formData, wardId: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Select ward</option>
                  {wards?.map((w: { id: string; name: string }) => <option key={w.id} value={w.id}>{w.name}</option>)}
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

      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-gray-500">Loading...</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admitted</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.data.map((patient: Patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{patient.mrn}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{patient.firstName} {patient.lastName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{patient.ward?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{patient.bed?.number || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        patient.status === 'active' ? 'bg-green-100 text-green-800' :
                        patient.status === 'discharged' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(patient.admissionDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <Link to={`/patients/${patient.id}`} className="text-primary-600 hover:text-primary-500">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && pagination.totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} patients
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-100">Previous</button>
                  <span className="px-3 py-1 text-sm text-gray-700">Page {pagination.page} of {pagination.totalPages}</span>
                  <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-100">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
