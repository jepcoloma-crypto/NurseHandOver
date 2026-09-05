import { useState } from 'react';
import { useRooms, useWards, useCreateRoom, useUpdateRoom, useDeleteRoom, Room } from '../../hooks/useApi';

export function RoomsPage() {
  const { data: rooms, isLoading } = useRooms();
  const { data: wards } = useWards();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [number, setNumber] = useState('');
  const [wardId, setWardId] = useState('');
  const [filterWardId, setFilterWardId] = useState('');

  const resetForm = () => {
    setNumber('');
    setWardId('');
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await updateRoom.mutateAsync({ id: editing.id, number, wardId });
    } else {
      await createRoom.mutateAsync({ number, wardId });
    }
    resetForm();
  };

  const handleEdit = (room: Room) => {
    setEditing(room);
    setNumber(room.number);
    setWardId(room.wardId);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this room?')) {
      await deleteRoom.mutateAsync(id);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
        >
          Add Room
        </button>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Filter by Ward</label>
        <select value={filterWardId} onChange={(e) => setFilterWardId(e.target.value)}
          className="mt-1 block w-64 border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option value="">All wards</option>
          {wards?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">{editing ? 'Edit Room' : 'New Room'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Room Number</label>
              <input type="text" required value={number} onChange={(e) => setNumber(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ward</label>
              <select required value={wardId} onChange={(e) => setWardId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Select ward</option>
                {wards?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beds</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rooms?.filter((r) => !filterWardId || r.wardId === filterWardId).map((room) => (
                <tr key={room.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{room.number}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{room.ward?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{room.bedCount}</td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <button onClick={() => handleEdit(room)} className="text-primary-600 hover:text-primary-500">Edit</button>
                    <button onClick={() => handleDelete(room.id)} className="text-red-600 hover:text-red-500">Delete</button>
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
