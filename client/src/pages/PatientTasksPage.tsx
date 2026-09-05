import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTasks, usePatient, useCreateTask, useTransitionTask, useUsers } from '../hooks/useApi';
import type { Task } from '../hooks/useApi';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  DEFERRED: { label: 'Deferred', color: 'bg-yellow-100 text-yellow-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', urgent: 'bg-red-500',
};

function formatDT(d: string) { return new Date(d).toLocaleString(); }

export function PatientTasksPage() {
  const { id } = useParams<{ id: string }>();
  const { data: patient } = usePatient(id || '');
  const { data: nurses } = useUsers();
  const { data: tasksResponse, isLoading } = useTasks({ patientId: id || undefined });
  const createTask = useCreateTask();
  const transitionTask = useTransitionTask();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tasks = tasksResponse?.data ?? [];
  const filtered = filterStatus ? tasks.filter((t: Task) => t.status === filterStatus) : tasks;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await createTask.mutateAsync({
      patientId: id!,
      title,
      description: description || undefined,
      priority,
      assignedTo: assignedTo || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    });
    setTitle(''); setDescription(''); setPriority('medium'); setAssignedTo(''); setDueDate('');
    setShowForm(false);
  };

  const handleTransition = async (taskId: string, status: string) => {
    if (status === 'DEFERRED') {
      const reason = window.prompt('Reason for deferral:');
      if (!reason) return;
      await transitionTask.mutateAsync({ id: taskId, status, deferredReason: reason });
    } else {
      await transitionTask.mutateAsync({ id: taskId, status });
    }
  };

  const nursesList = Array.isArray(nurses) ? nurses : [];

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/patients" className="hover:text-primary-600">Patients</Link>
        <span>/</span>
        <Link to={`/patients/${id}`} className="hover:text-primary-600">{patient?.firstName} {patient?.lastName}</Link>
        <span>/</span>
        <span className="text-gray-900">Tasks</span>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Patient Tasks</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">
          New Task
        </button>
      </div>

      {showForm && (
        <div className="mt-4 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Create Task</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm ${errors.title ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign To</label>
                <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Unassigned</option>
                  {nursesList.map((n: { id: string; firstName: string; lastName: string }) => (
                    <option key={n.id} value={n.id}>{n.firstName} {n.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${filterStatus === key ? 'ring-2 ring-primary-500 ' : ''}${cfg.color}`}>
            {cfg.label}
          </button>
        ))}
      </div>

      <div className="mt-4 bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? <div className="p-6 text-gray-500">Loading...</div> : !filtered || filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No tasks found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filtered.map((task: Task) => {
              const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
              const dot = PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium;
              return (
                <div key={task.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                    <div>
                      <Link to={`/tasks/${task.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600">{task.title}</Link>
                      {task.description && <p className="text-xs text-gray-500 truncate max-w-md">{task.description}</p>}
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
                        {task.assignee && <span className="text-xs text-gray-400">{task.assignee.firstName} {task.assignee.lastName}</span>}
                        {task.dueDate && <span className="text-xs text-gray-400">Due: {formatDT(task.dueDate)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {task.status === 'PENDING' && (
                      <button onClick={() => handleTransition(task.id, 'IN_PROGRESS')} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Start</button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <>
                        <button onClick={() => handleTransition(task.id, 'COMPLETED')} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Complete</button>
                        <button onClick={() => handleTransition(task.id, 'DEFERRED')} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Defer</button>
                      </>
                    )}
                    {task.status === 'DEFERRED' && (
                      <button onClick={() => handleTransition(task.id, 'IN_PROGRESS')} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Resume</button>
                    )}
                    {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                      <button onClick={() => handleTransition(task.id, 'CANCELLED')} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Cancel</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
