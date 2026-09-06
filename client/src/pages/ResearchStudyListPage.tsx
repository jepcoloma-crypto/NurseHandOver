import { useState } from 'react';
import { useResearchStudies, useCreateResearchStudy, useDeleteResearchStudy } from '../hooks/useApi';
import { Link } from 'react-router-dom';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700' },
  archived: { label: 'Archived', className: 'bg-purple-100 text-purple-700' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
}

export function ResearchStudyListPage() {
  const { data: studies, isLoading } = useResearchStudies();
  const createStudy = useCreateResearchStudy();
  const deleteStudy = useDeleteResearchStudy();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createStudy.mutateAsync({ title: title.trim(), description: description.trim() || undefined });
    setTitle(''); setDescription(''); setShowForm(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading studies...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Research Studies</h1>
          <p className="text-sm text-gray-500 mt-1">Manage research evaluation studies</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700">
          {showForm ? 'Cancel' : '+ New Study'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-4 space-y-3">
          <div>
            <label htmlFor="study-title" className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input id="study-title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" placeholder="Study title" />
          </div>
          <div>
            <label htmlFor="study-desc" className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea id="study-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" rows={2} placeholder="Optional description" />
          </div>
          <button onClick={handleCreate} disabled={!title.trim() || createStudy.isPending} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-50">
            {createStudy.isPending ? 'Creating...' : 'Create Study'}
          </button>
        </div>
      )}

      {(!studies || studies.length === 0) ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">No research studies yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studies.map((s) => (
            <div key={s.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <Link to={`/research/${s.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600">{s.title}</Link>
                  <StatusBadge status={s.status} />
                </div>
                {s.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>}
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span>{s._count.participants} participants</span>
                  <span>{s._count.surveys} surveys</span>
                  <span>{s._count.metrics} metrics</span>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                <Link to={`/research/${s.id}`} className="text-xs text-primary-600 hover:text-primary-800 font-medium">View Details</Link>
                <button onClick={() => { if (confirm('Delete this study?')) deleteStudy.mutate(s.id); }} className="text-xs text-red-600 hover:text-red-800">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
