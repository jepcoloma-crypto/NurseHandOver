import { useState } from 'react';
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift, Shift } from '../../hooks/useApi';

export function ShiftsPage() {
  const { data: shifts, isLoading } = useShifts();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const resetForm = () => {
    setName('');
    setStartTime('');
    setEndTime('');
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    };
    if (editing) {
      await updateShift.mutateAsync({ id: editing.id, ...data });
    } else {
      await createShift.mutateAsync(data);
    }
    resetForm();
  };

  const handleEdit = (shift: Shift) => {
    setEditing(shift);
    setName(shift.name);
    setStartTime(shift.startTime.slice(0, 16));
    setEndTime(shift.endTime.slice(0, 16));
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this shift?')) {
      await deleteShift.mutateAsync(id);
    }
  };

  const formatTime = (t: string) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Shifts</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
        >
          Add Shift
        </button>
      </div>

      {showForm && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">{editing ? 'Edit Shift' : 'New Shift'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input type="datetime-local" required value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input type="datetime-local" required value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nurses</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shifts?.map((shift) => (
                <tr key={shift.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{shift.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatTime(shift.startTime)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatTime(shift.endTime)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{shift.nurseCount}</td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <button onClick={() => handleEdit(shift)} className="text-primary-600 hover:text-primary-500">Edit</button>
                    <button onClick={() => handleDelete(shift.id)} className="text-red-600 hover:text-red-500">Delete</button>
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
