import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { MapProvider } from './contexts/MapContext';
import { AgentChatProvider } from './contexts/AgentChatContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { InteractionProvider } from './contexts/InteractionContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <MapProvider>
          <AgentChatProvider>
            <DocumentProvider>
              <InteractionProvider>
                <Router>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/workspace" element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </Router>
              </InteractionProvider>
            </DocumentProvider>
          </AgentChatProvider>
        </MapProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default App;