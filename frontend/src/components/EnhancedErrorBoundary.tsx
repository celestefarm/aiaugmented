import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Copy, CheckCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  showDiagnostics?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  diagnostics: any;
  copied: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      diagnostics: null,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 [ENHANCED ERROR BOUNDARY] Error caught:', error);
    console.error('🚨 [ENHANCED ERROR BOUNDARY] Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Collect diagnostic information
    this.collectDiagnostics();
  }

  collectDiagnostics = async () => {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      localStorage: {
        authToken: !!localStorage.getItem('auth_token'),
        tokenLength: localStorage.getItem('auth_token')?.length || 0
      },
      sessionStorage: Object.keys(sessionStorage),
      networkStatus: navigator.onLine,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      performance: {
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null
      }
    };

    // Test API connectivity
    try {
      const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/healthz`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      diagnostics.apiStatus = {
        baseUrl: API_BASE_URL,
        healthCheck: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (e) {
      diagnostics.apiStatus = {
        error: e instanceof Error ? e.message : 'Unknown API error'
      };
    }

    this.setState({ diagnostics });
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      diagnostics: null,
      copied: false
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  copyErrorInfo = () => {
    const errorReport = {
      error: {
        name: this.state.error?.name,
        message: this.state.error?.message,
        stack: this.state.error?.stack
      },
      errorInfo: this.state.errorInfo,
      diagnostics: this.state.diagnostics,
      timestamp: new Date().toISOString()
    };

    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      })
      .catch(err => {
        console.error('Failed to copy error info:', err);
      });
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle = "Something went wrong", showDiagnostics = true } = this.props;
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full glass-pane border border-red-500/30 rounded-lg p-8">
            <div className="text-center mb-6">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">{fallbackTitle}</h1>
              <p className="text-gray-300">
                The exploration map encountered an unexpected error. This could be due to authentication issues, 
                network connectivity problems, or backend server unavailability.
              </p>
            </div>

            {this.state.error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <h3 className="text-red-300 font-semibold mb-2 flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Error Details
                </h3>
                <p className="text-red-200 text-sm font-mono mb-2">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="text-red-200 text-xs">
                    <summary className="cursor-pointer hover:text-red-100">Stack Trace</summary>
                    <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {showDiagnostics && this.state.diagnostics && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h3 className="text-blue-300 font-semibold mb-2">Diagnostic Information</h3>
                <div className="text-blue-200 text-sm space-y-1">
                  <p><strong>Network:</strong> {this.state.diagnostics.networkStatus ? 'Online' : 'Offline'}</p>
                  <p><strong>Authentication:</strong> {this.state.diagnostics.localStorage.authToken ? 'Token Present' : 'No Token'}</p>
                  {this.state.diagnostics.apiStatus && (
                    <p><strong>API Status:</strong> {
                      this.state.diagnostics.apiStatus.healthCheck 
                        ? `✅ Healthy (${this.state.diagnostics.apiStatus.status})`
                        : `❌ Unhealthy (${this.state.diagnostics.apiStatus.error || this.state.diagnostics.apiStatus.status})`
                    }</p>
                  )}
                  <p><strong>Timestamp:</strong> {this.state.diagnostics.timestamp}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-[#6B6B3A] hover:bg-[#5A5A2F] text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
                
                <button
                  onClick={this.copyErrorInfo}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  {this.state.copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Error Info
                    </>
                  )}
                </button>
              </div>

              <div className="text-center text-sm text-gray-400">
                <p>If the problem persists, please:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Check that the backend server is running</li>
                  <li>• Verify your internet connection</li>
                  <li>• Try logging out and logging back in</li>
                  <li>• Copy the error info above and report the issue</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;