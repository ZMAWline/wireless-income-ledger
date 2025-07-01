
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Dashboard from '@/pages/Dashboard';
import AllLines from '@/pages/AllLines';
import LineDetail from '@/pages/LineDetail';
import Auth from '@/pages/Auth';
import Navigation from '@/components/Navigation';
import AuthGuard from '@/components/AuthGuard';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthGuard>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/*" element={
                <>
                  <Navigation />
                  <main className="container mx-auto px-4 py-8">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/lines" element={<AllLines />} />
                      <Route path="/lines/:id" element={<LineDetail />} />
                    </Routes>
                  </main>
                </>
              } />
            </Routes>
            <Toaster />
          </div>
        </AuthGuard>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
