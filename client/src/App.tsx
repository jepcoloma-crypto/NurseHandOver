import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-primary-700">NurseHandOver</h1>
          <p className="text-sm text-gray-500">Nursing Shift Handover System</p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route
            path="/"
            element={
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-700">System Ready</h2>
                <p className="mt-2 text-gray-500">NurseHandOver foundation is configured.</p>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
