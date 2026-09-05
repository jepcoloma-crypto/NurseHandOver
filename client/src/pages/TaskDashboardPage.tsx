import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTasks, useTransitionTask, useDeleteTask } from '../hooks/useApi';
import type { Task } from '../hooks/useApi';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  DEFERRED: { label: 'Deferred', color: 'bg-yellow-100 text-yellow-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
};

function formatDT(d: string) {
  return new Date(d).toLocaleString();
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function TaskDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const { data, isLoading } = useTasks({ status: statusFilter || undefined, priority: priorityFilter || undefined });
  const transitionTask = useTransitionTask();
  const deleteTask = useDeleteTask();

  const tasks = data?.data ?? [];
  const stats = data?.stats ?? [];

  const statMap: Record<string, number> = {};
  stats.forEach((s: { status: string; _count: { status: number } }) => { statMap[s.status] = s._count.status; });

  const handleTransition = async (taskId: string, status: string) => {
    if (status === 'DEFERRED') {
      const reason = window.prompt('Reason for deferral:');
      if (!reason) return;
      await transitionTask.mutateAsync({ id: taskId, status, deferredReason: reason });
    } else {
      await transitionTask.mutateAsync({ id: taskId, status });
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return;
    await deleteTask.mutateAsync(taskId);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track nursing tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            className={`p-3 rounded-lg text-center transition-all ${statusFilter === key ? 'ring-2 ring-primary-500 shadow-md' : 'bg-white shadow-sm hover:shadow-md'}`}>
            <p className="text-2xl font-bold">{statMap[key] || 0}</p>
            <p className={`text-xs font-medium mt-1 ${config.color} inline-block px-2 py-0.5 rounded-full`}>{config.label}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {statusFilter && (
          <button onClick={() => setStatusFilter('')} className="text-sm text-primary-600 hover:text-primary-800">
            Clear status filter
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-gray-500">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No tasks found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tasks.map((task: Task) => {
              const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
              const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
              const overdue = task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && isOverdue(task.dueDate);

              return (
                <div key={task.id} className={`p-4 hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${priorityCfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <Link to={`/tasks/${task.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600">
                          {task.title}
                        </Link>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${priorityCfg.color}`}>
                            {priorityCfg.label}
                          </span>
                          {task.patient && (
                            <Link to={`/patients/${task.patient.id}`} className="text-xs text-primary-600 hover:text-primary-800">
                              {task.patient.firstName} {task.patient.lastName}
                            </Link>
                          )}
                          {task.assignee && (
                            <span className="text-xs text-gray-400">Assigned: {task.assignee.firstName} {task.assignee.lastName}</span>
                          )}
                          {overdue && (
                            <span className="text-xs text-red-600 font-medium">Overdue</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {task.dueDate && (
                        <span className={`text-xs whitespace-nowrap ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                          Due: {formatDT(task.dueDate)}
                        </span>
                      )}
                      <div className="flex gap-1">
                        {task.status === 'PENDING' && (
                          <button onClick={() => handleTransition(task.id, 'IN_PROGRESS')}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Start</button>
                        )}
                        {task.status === 'IN_PROGRESS' && (
                          <>
                            <button onClick={() => handleTransition(task.id, 'COMPLETED')}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Complete</button>
                            <button onClick={() => handleTransition(task.id, 'DEFERRED')}
                              className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200">Defer</button>
                          </>
                        )}
                        {task.status === 'DEFERRED' && (
                          <button onClick={() => handleTransition(task.id, 'IN_PROGRESS')}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Resume</button>
                        )}
                        {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                          <button onClick={() => handleTransition(task.id, 'CANCELLED')}
                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Cancel</button>
                        )}
                        <button onClick={() => handleDelete(task.id)}
                          className="text-xs text-gray-400 hover:text-red-600 px-2 py-1">Del</button>
                      </div>
                    </div>
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
