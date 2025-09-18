import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { MapProvider } from './contexts/MapContext';
import { AgentChatProvider } from './contexts/AgentChatContext';
import { DocumentProvider } from './contexts/DocumentContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
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
              <Router>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  {/* TEMPORARY: Direct access to canvas without authentication */}
                  <Route path="/" element={<Index />} />
                  <Route path="/workspace" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                </Routes>
              </Router>
            </DocumentProvider>
          </AgentChatProvider>
        </MapProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default App;