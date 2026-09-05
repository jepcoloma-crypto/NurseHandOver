import { useState } from 'react';
import type { HandoverClarification } from '../hooks/useApi';
import { useRequestClarification, useRespondClarification } from '../hooks/useApi';

interface ClarificationPanelProps {
  handoverId: string;
  clarifications: HandoverClarification[];
  canRequest: boolean;
  canRespond: boolean;
}

export function ClarificationPanel({ handoverId, clarifications, canRequest, canRespond }: ClarificationPanelProps) {
  const [newQuestion, setNewQuestion] = useState('');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const requestClarification = useRequestClarification();
  const respondClarification = useRespondClarification();

  const handleRequest = async () => {
    if (!newQuestion.trim()) return;
    await requestClarification.mutateAsync({ handoverId, question: newQuestion.trim() });
    setNewQuestion('');
  };

  const handleRespond = async (clarificationId: string) => {
    if (!responseText.trim()) return;
    await respondClarification.mutateAsync({ handoverId, clarificationId, response: responseText.trim() });
    setResponseText('');
    setRespondingTo(null);
  };

  const pendingCount = clarifications.filter((c) => c.status === 'pending').length;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Clarifications
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </h3>
      </div>

      {canRequest && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">Request Clarification</label>
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            rows={3}
            placeholder="What do you need clarified about this handover?"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-y"
          />
          <button
            onClick={handleRequest}
            disabled={!newQuestion.trim() || requestClarification.isPending}
            className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded-md text-sm hover:bg-yellow-700 disabled:opacity-50"
          >
            {requestClarification.isPending ? 'Sending...' : 'Send Question'}
          </button>
        </div>
      )}

      {clarifications.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">No clarifications yet.</p>
      ) : (
        <div className="space-y-4">
          {clarifications.map((c) => (
            <div key={c.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-bold">Q</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-600">Question</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {c.status === 'pending' ? 'Pending' : 'Answered'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.question}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {c.response ? (
                <div className="mt-3 ml-11 flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">A</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-medium text-green-600">Response</span>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.response}</p>
                  </div>
                </div>
              ) : (
                canRespond && respondingTo === c.id ? (
                  <div className="mt-3 ml-11">
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={3}
                      placeholder="Write your response..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-y"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleRespond(c.id)}
                        disabled={!responseText.trim() || respondClarification.isPending}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-green-700 disabled:opacity-50"
                      >
                        {respondClarification.isPending ? 'Sending...' : 'Send Response'}
                      </button>
                      <button
                        onClick={() => { setRespondingTo(null); setResponseText(''); }}
                        className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : canRespond && c.status === 'pending' ? (
                  <div className="mt-3 ml-11">
                    <button
                      onClick={() => setRespondingTo(c.id)}
                      className="text-sm text-green-600 hover:text-green-800 font-medium"
                    >
                      + Respond
                    </button>
                  </div>
                ) : null
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
