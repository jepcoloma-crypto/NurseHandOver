import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTask, useTransitionTask, useUpdateTask, useAssignTask, useDeleteTask, useUsers } from '../hooks/useApi';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: 'text-gray-800', bg: 'bg-gray-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-800', bg: 'bg-blue-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-800', bg: 'bg-green-100' },
  DEFERRED: { label: 'Deferred', color: 'text-yellow-800', bg: 'bg-yellow-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-800', bg: 'bg-red-100' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: 'text-green-800', bg: 'bg-green-100' },
  medium: { label: 'Medium', color: 'text-yellow-800', bg: 'bg-yellow-100' },
  high: { label: 'High', color: 'text-orange-800', bg: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-800', bg: 'bg-red-100' },
};

function formatDT(d: string) { return new Date(d).toLocaleString(); }

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading } = useTask(id || '');
  const { data: nurses } = useUsers();
  const transitionTask = useTransitionTask();
  const updateTask = useUpdateTask();
  const assignTask = useAssignTask();
  const deleteTask = useDeleteTask();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [assignee, setAssignee] = useState('');
  const [showDefer, setShowDefer] = useState(false);
  const [deferReason, setDeferReason] = useState('');

  if (isLoading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!task) return <div className="p-6 text-red-500">Task not found</div>;

  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const validTransitions = task.validTransitions || [];
  const nursesList = Array.isArray(nurses) ? nurses : [];

  const handleStartEdit = () => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setDueDate(task.dueDate ? task.dueDate.slice(0, 16) : '');
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    await updateTask.mutateAsync({
      id: id!,
      data: { title, description: description || undefined, priority, dueDate: dueDate ? new Date(dueDate).toISOString() : undefined },
    });
    setEditing(false);
  };

  const handleTransition = async (status: string) => {
    if (status === 'DEFERRED') {
      setShowDefer(true);
      return;
    }
    await transitionTask.mutateAsync({ id: id!, status });
  };

  const handleDefer = async () => {
    if (!deferReason.trim()) return;
    await transitionTask.mutateAsync({ id: id!, status: 'DEFERRED', deferredReason: deferReason });
    setShowDefer(false);
    setDeferReason('');
  };

  const handleAssign = async () => {
    if (!assignee) return;
    await assignTask.mutateAsync({ id: id!, assignedTo: assignee });
    setShowAssign(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    await deleteTask.mutateAsync(id!);
    navigate('/tasks');
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/tasks" className="hover:text-primary-600">Tasks</Link>
        <span>/</span>
        <span className="text-gray-900">Task Detail</span>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg font-bold" />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                <div className="flex gap-4">
                  <select value={priority} onChange={(e) => setPriority(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">Save</button>
                  <button onClick={() => setEditing(false)} className="bg-gray-200 px-4 py-2 rounded-md text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
                {task.description && <p className="text-gray-600 mt-2 whitespace-pre-wrap">{task.description}</p>}
              </>
            )}
          </div>
          {!editing && (
            <div className="flex gap-2 flex-shrink-0 ml-4">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${priorityCfg.bg} ${priorityCfg.color}`}>{priorityCfg.label}</span>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Details</h3>
            <dl className="space-y-2">
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Patient</dt><dd className="text-sm font-medium"><Link to={`/patients/${task.patient?.id}`} className="text-primary-600 hover:text-primary-800">{task.patient?.firstName} {task.patient?.lastName}</Link></dd></div>
              {task.patient?.mrn && <div className="flex justify-between"><dt className="text-sm text-gray-500">MRN</dt><dd className="text-sm font-medium">{task.patient.mrn}</dd></div>}
              {task.patient?.ward && <div className="flex justify-between"><dt className="text-sm text-gray-500">Ward</dt><dd className="text-sm font-medium">{task.patient.ward.name}</dd></div>}
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Assigned To</dt><dd className="text-sm font-medium">{task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}</dd></div>
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Created</dt><dd className="text-sm font-medium">{formatDT(task.createdAt)}</dd></div>
              {task.dueDate && <div className="flex justify-between"><dt className="text-sm text-gray-500">Due Date</dt><dd className="text-sm font-medium">{formatDT(task.dueDate)}</dd></div>}
              {task.completedAt && <div className="flex justify-between"><dt className="text-sm text-gray-500">Completed</dt><dd className="text-sm font-medium">{formatDT(task.completedAt)}</dd></div>}
              {task.deferredReason && (
                <>
                  <div className="flex justify-between"><dt className="text-sm text-gray-500">Deferred By</dt><dd className="text-sm font-medium">{task.deferrer?.firstName} {task.deferrer?.lastName}</dd></div>
                  <div className="flex justify-between"><dt className="text-sm text-gray-500">Deferral Reason</dt><dd className="text-sm font-medium text-yellow-700">{task.deferredReason}</dd></div>
                </>
              )}
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Actions</h3>
            <div className="space-y-2">
              {!editing && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                <button onClick={handleStartEdit} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Edit Task</button>
              )}
              {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                <button onClick={() => setShowAssign(!showAssign)} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Assign Task</button>
              )}
              {validTransitions.includes('IN_PROGRESS') && (
                <button onClick={() => handleTransition('IN_PROGRESS')} className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded-md">Start Task</button>
              )}
              {validTransitions.includes('COMPLETED') && (
                <button onClick={() => handleTransition('COMPLETED')} className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 rounded-md">Mark Complete</button>
              )}
              {validTransitions.includes('DEFERRED') && (
                <button onClick={() => handleTransition('DEFERRED')} className="w-full text-left px-3 py-2 text-sm text-yellow-700 hover:bg-yellow-50 rounded-md">Defer Task</button>
              )}
              {validTransitions.includes('CANCELLED') && (
                <button onClick={() => handleTransition('CANCELLED')} className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-md">Cancel Task</button>
              )}
              <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">Delete Task</button>
            </div>
          </div>
        </div>
      </div>

      {showAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Assign Task</h3>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4">
              <option value="">Select nurse</option>
              {nursesList.map((n: { id: string; firstName: string; lastName: string }) => (
                <option key={n.id} value={n.id}>{n.firstName} {n.lastName}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={handleAssign} className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">Assign</button>
              <button onClick={() => setShowAssign(false)} className="bg-gray-200 px-4 py-2 rounded-md text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDefer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Defer Task</h3>
            <textarea value={deferReason} onChange={(e) => setDeferReason(e.target.value)} rows={3} placeholder="Reason for deferral (required)"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4" />
            <div className="flex gap-2">
              <button onClick={handleDefer} disabled={!deferReason.trim()}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm hover:bg-yellow-700 disabled:opacity-50">Defer</button>
              <button onClick={() => { setShowDefer(false); setDeferReason(''); }} className="bg-gray-200 px-4 py-2 rounded-md text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
