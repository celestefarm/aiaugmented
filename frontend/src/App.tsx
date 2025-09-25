import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { MapProvider } from './contexts/MapContext';
import { AgentChatProvider } from './contexts/AgentChatContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { InteractionProvider } from './contexts/InteractionContext';
import { MessageMapStatusProvider } from './contexts/MessageMapStatusContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import AIAgentPage from './pages/AIAgentPage';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';

// Global error fallback component
const GlobalErrorFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Application Error</h1>
      <p className="text-gray-600 mb-6">
        Something went wrong with the application. Please refresh the page or contact support if the problem persists.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        Refresh Application
      </button>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary context="App Root" fallback={<GlobalErrorFallback />}>
      <ErrorBoundary context="Authentication Provider">
        <AuthProvider>
          <ErrorBoundary context="Workspace Provider">
            <WorkspaceProvider>
              <ErrorBoundary context="Map Provider">
                <MapProvider>
                  <ErrorBoundary context="Agent Chat Provider">
                    <AgentChatProvider>
                      <MessageMapStatusProvider>
                        <ErrorBoundary context="Document Provider">
                          <DocumentProvider>
                            <ErrorBoundary context="Interaction Provider">
                              <InteractionProvider>
                                <ErrorBoundary context="Router">
                                  <Router>
                                    <ScrollToTop />
                                    <Routes>
                                      <Route path="/auth" element={
                                        <ErrorBoundary context="Auth Page">
                                          <Auth />
                                        </ErrorBoundary>
                                      } />
                                      <Route path="/" element={
                                        <ErrorBoundary context="Landing Page">
                                          <LandingPage />
                                        </ErrorBoundary>
                                      } />
                                      <Route path="/about" element={
                                        <ErrorBoundary context="About Page">
                                          <AboutPage />
                                        </ErrorBoundary>
                                      } />
                                      <Route path="/ai-agent" element={
                                        <ErrorBoundary context="AI Agent Page">
                                          <AIAgentPage />
                                        </ErrorBoundary>
                                      } />
                                      <Route path="/workspace" element={
                                        <ErrorBoundary context="Workspace Page">
                                          <ProtectedRoute>
                                            <Index />
                                          </ProtectedRoute>
                                        </ErrorBoundary>
                                      } />
                                      <Route path="/dashboard" element={
                                        <ErrorBoundary context="Dashboard Page">
                                          <ProtectedRoute>
                                            <Dashboard />
                                          </ProtectedRoute>
                                        </ErrorBoundary>
                                      } />
                                    </Routes>
                                  </Router>
                                </ErrorBoundary>
                              </InteractionProvider>
                            </ErrorBoundary>
                          </DocumentProvider>
                        </ErrorBoundary>
                      </MessageMapStatusProvider>
                    </AgentChatProvider>
                  </ErrorBoundary>
                </MapProvider>
              </ErrorBoundary>
            </WorkspaceProvider>
          </ErrorBoundary>
        </AuthProvider>
      </ErrorBoundary>
    </ErrorBoundary>
  );
}

export default App;