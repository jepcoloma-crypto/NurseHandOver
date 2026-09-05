import { useState } from 'react';
import { useWards, useDepartments, useCreateWard, useUpdateWard, useDeleteWard, Ward } from '../../hooks/useApi';

export function WardsPage() {
  const { data: wards, isLoading } = useWards();
  const { data: departments } = useDepartments();
  const createWard = useCreateWard();
  const updateWard = useUpdateWard();
  const deleteWard = useDeleteWard();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ward | null>(null);
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [capacity, setCapacity] = useState(0);

  const resetForm = () => {
    setName('');
    setDepartmentId('');
    setCapacity(0);
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await updateWard.mutateAsync({ id: editing.id, name, departmentId, capacity });
    } else {
      await createWard.mutateAsync({ name, departmentId, capacity });
    }
    resetForm();
  };

  const handleEdit = (ward: Ward) => {
    setEditing(ward);
    setName(ward.name);
    setDepartmentId(ward.departmentId);
    setCapacity(ward.capacity);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this ward?')) {
      await deleteWard.mutateAsync(id);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Wards</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
        >
          Add Ward
        </button>
      </div>

      {showForm && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">{editing ? 'Edit Ward' : 'New Ward'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <select required value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Select department</option>
                {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Capacity</label>
              <input type="number" min="0" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">
                {editing ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-gray-500">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rooms</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patients</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {wards?.map((ward) => (
                <tr key={ward.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{ward.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{ward.department?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{ward.capacity}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{ward.roomCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{ward.patientCount}</td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <button onClick={() => handleEdit(ward)} className="text-primary-600 hover:text-primary-500">Edit</button>
                    <button onClick={() => handleDelete(ward.id)} className="text-red-600 hover:text-red-500">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
