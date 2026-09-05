import { useState } from 'react';
import { useAssignments, useUsers, useWards, useShifts, useCreateAssignment, useDeleteAssignment } from '../../hooks/useApi';

export function AssignmentsPage() {
  const { data: assignments, isLoading } = useAssignments();
  const { data: users } = useUsers();
  const { data: wards } = useWards();
  const { data: shifts } = useShifts();
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const [showForm, setShowForm] = useState(false);
  const [nurseId, setNurseId] = useState('');
  const [wardId, setWardId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [assignedDate, setAssignedDate] = useState('');
  const [searchNurse, setSearchNurse] = useState('');

  const nurses = users?.filter((u) =>
    u.roles?.some((r) => r.name === 'NURSE') &&
    (!searchNurse || `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchNurse.toLowerCase()) || u.email.toLowerCase().includes(searchNurse.toLowerCase()))
  ) || [];

  const resetForm = () => {
    setNurseId('');
    setWardId('');
    setShiftId('');
    setAssignedDate('');
    setSearchNurse('');
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAssignment.mutateAsync({
      nurseId,
      wardId,
      shiftId,
      assignedDate: new Date(assignedDate).toISOString(),
    });
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remove this assignment?')) {
      await deleteAssignment.mutateAsync(id);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Nurse Assignments</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
        >
          Add Assignment
        </button>
      </div>

      {showForm && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">New Assignment</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Search Nurse</label>
              <input type="text" placeholder="Search by name or email..." value={searchNurse}
                onChange={(e) => setSearchNurse(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nurse</label>
              <select required value={nurseId} onChange={(e) => setNurseId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Select nurse</option>
                {nurses.map((n) => <option key={n.id} value={n.id}>{n.firstName} {n.lastName} ({n.email})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ward</label>
                <select required value={wardId} onChange={(e) => setWardId(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Select ward</option>
                  {wards?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Shift</label>
                <select required value={shiftId} onChange={(e) => setShiftId(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Select shift</option>
                  {shifts?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Assignment Date</label>
              <input type="date" required value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">
                Create
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nurse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignments?.map((a) => (
                <tr key={a.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.nurse?.firstName} {a.nurse?.lastName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{a.ward?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{a.shift?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(a.assignedDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-500">Remove</button>
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
