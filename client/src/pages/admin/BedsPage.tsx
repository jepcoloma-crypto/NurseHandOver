import { useState } from 'react';
import { useBeds, useRooms, useWards, useCreateBed, useUpdateBed, useDeleteBed, Bed } from '../../hooks/useApi';

export function BedsPage() {
  const { data: beds, isLoading } = useBeds();
  const { data: wards } = useWards();
  const { data: rooms } = useRooms();
  const createBed = useCreateBed();
  const updateBed = useUpdateBed();
  const deleteBed = useDeleteBed();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Bed | null>(null);
  const [number, setNumber] = useState('');
  const [roomId, setRoomId] = useState('');
  const [filterWardId, setFilterWardId] = useState('');

  const filteredRooms = rooms?.filter((r) => !filterWardId || r.wardId === filterWardId) || [];
  const resetForm = () => {
    setNumber('');
    setRoomId('');
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await updateBed.mutateAsync({ id: editing.id, number, roomId });
    } else {
      await createBed.mutateAsync({ number, roomId });
    }
    resetForm();
  };

  const handleEdit = (bed: Bed) => {
    setEditing(bed);
    setNumber(bed.number);
    setRoomId(bed.roomId);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this bed?')) {
      await deleteBed.mutateAsync(id);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Beds</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
        >
          Add Bed
        </button>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Filter by Ward</label>
        <select value={filterWardId} onChange={(e) => { setFilterWardId(e.target.value); setRoomId(''); }}
          className="mt-1 block w-64 border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option value="">All wards</option>
          {wards?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">{editing ? 'Edit Bed' : 'New Bed'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Bed Number</label>
              <input type="text" required value={number} onChange={(e) => setNumber(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Room</label>
              <select required value={roomId} onChange={(e) => setRoomId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Select room</option>
                {filteredRooms.map((r) => <option key={r.id} value={r.id}>{r.number}</option>)}
              </select>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patients</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {beds?.map((bed) => (
                <tr key={bed.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{bed.number}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{bed.room?.number || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{bed.room?.ward?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{bed.patientCount}</td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <button onClick={() => handleEdit(bed)} className="text-primary-600 hover:text-primary-500">Edit</button>
                    <button onClick={() => handleDelete(bed.id)} className="text-red-600 hover:text-red-500">Delete</button>
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
