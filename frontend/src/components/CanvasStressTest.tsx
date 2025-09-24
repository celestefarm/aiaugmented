import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Square, BarChart3, Trash2, Settings, Download } from 'lucide-react';
import { StressTestGenerator, StressTestConfig, StressTestData } from '@/utils/stressTestGenerator';
import { useMap } from '@/contexts/MapContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { NodeCreateRequest, EdgeCreateRequest, clearAllNodes } from '@/lib/api';

interface PerformanceMetrics {
  fps: number;
  minFps: number;
  maxFps: number;
  avgFrameTime: number;
  memoryUsage: number;
  nodeCount: number;
  edgeCount: number;
  timestamp: number;
}

interface StressTestResults {
  testName: string;
  config: StressTestConfig;
  metrics: PerformanceMetrics[];
  duration: number;
  completed: boolean;
}

export const CanvasStressTest: React.FC = () => {
  const { createNode: createNodeAPI, createEdge: createEdgeAPI } = useMap();
  const { currentWorkspace } = useWorkspace();
  
  // Test state
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<StressTestConfig | null>(null);
  const [testResults, setTestResults] = useState<StressTestResults[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [testProgress, setTestProgress] = useState(0);
  
  // Configuration state
  const [customConfig, setCustomConfig] = useState<StressTestConfig>({
    nodeCount: 1000,
    edgeCount: 2000,
    canvasWidth: 10000,
    canvasHeight: 10000,
    nodeTypes: ['human', 'ai', 'risk', 'dependency', 'decision'],
    edgeTypes: ['support', 'contradiction', 'dependency', 'ai-relationship']
  });
  
  // Performance monitoring
  const performanceMonitorRef = useRef<ReturnType<typeof StressTestGenerator.createPerformanceMonitor> | null>(null);
  const testStartTimeRef = useRef<number>(0);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const testTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize performance monitor
  useEffect(() => {
    performanceMonitorRef.current = StressTestGenerator.createPerformanceMonitor();
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      if (testTimeoutRef.current) {
        clearTimeout(testTimeoutRef.current);
      }
    };
  }, []);

  // Collect performance metrics
  const collectMetrics = useCallback(() => {
    if (!performanceMonitorRef.current) return null;

    const stats = performanceMonitorRef.current.getStats();
    const memoryInfo = (performance as any).memory;
    
    return {
      fps: stats.fps,
      minFps: stats.minFps,
      maxFps: stats.maxFps,
      avgFrameTime: 0, // Will be calculated by monitor
      memoryUsage: memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0, // MB
      nodeCount: currentTest?.nodeCount || 0,
      edgeCount: currentTest?.edgeCount || 0,
      timestamp: Date.now()
    };
  }, [currentTest]);

  // Create nodes and edges for stress test
  const createStressTestData = useCallback(async (config: StressTestConfig): Promise<boolean> => {
    if (!currentWorkspace) {
      console.error('No workspace selected');
      return false;
    }

    try {
      console.log('Generating stress test data...');
      const stressData = StressTestGenerator.generateStressTestData(config);
      
      console.log(`Creating ${stressData.nodes.length} nodes...`);
      const createdNodes: string[] = [];
      
      // Create nodes in batches to avoid overwhelming the API
      const batchSize = 50;
      for (let i = 0; i < stressData.nodes.length; i += batchSize) {
        const batch = stressData.nodes.slice(i, i + batchSize);
        const batchPromises = batch.map(async (nodeData, index) => {
          try {
            const node = await createNodeAPI(nodeData);
            if (node) {
              createdNodes.push(node.id);
            }
            return node;
          } catch (error) {
            console.error(`Failed to create node ${i + index}:`, error);
            return null;
          }
        });
        
        await Promise.all(batchPromises);
        setTestProgress((i + batch.length) / stressData.nodes.length * 0.7); // 70% for nodes
        
        // Small delay to prevent API overload
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Creating ${stressData.edges.length} edges...`);
      
      // Create edges in batches
      let edgesCreated = 0;
      for (let i = 0; i < stressData.edges.length; i += batchSize) {
        const batch = stressData.edges.slice(i, i + batchSize);
        const batchPromises = batch.map(async (edgeData) => {
          try {
            // Map the generated node IDs to actual created node IDs
            const fromIndex = parseInt(edgeData.from_node_id.replace('stress-node-', ''));
            const toIndex = parseInt(edgeData.to_node_id.replace('stress-node-', ''));
            
            if (fromIndex < createdNodes.length && toIndex < createdNodes.length) {
              const actualEdgeData: EdgeCreateRequest = {
                ...edgeData,
                from_node_id: createdNodes[fromIndex],
                to_node_id: createdNodes[toIndex]
              };
              
              const edge = await createEdgeAPI(actualEdgeData);
              if (edge) edgesCreated++;
              return edge;
            }
            return null;
          } catch (error) {
            console.error(`Failed to create edge ${i}:`, error);
            return null;
          }
        });
        
        await Promise.all(batchPromises);
        setTestProgress(0.7 + (i + batch.length) / stressData.edges.length * 0.3); // 30% for edges
        
        // Small delay to prevent API overload
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Stress test data created: ${createdNodes.length} nodes, ${edgesCreated} edges`);
      return true;
    } catch (error) {
      console.error('Failed to create stress test data:', error);
      return false;
    }
  }, [currentWorkspace, createNodeAPI, createEdgeAPI]);

  // Run stress test
  const runStressTest = useCallback(async (config: StressTestConfig, testName: string) => {
    if (isRunning || !currentWorkspace) return;

    setIsRunning(true);
    setCurrentTest(config);
    setTestProgress(0);
    testStartTimeRef.current = Date.now();

    const testResult: StressTestResults = {
      testName,
      config,
      metrics: [],
      duration: 0,
      completed: false
    };

    try {
      // Clear existing nodes first
      console.log('Clearing existing nodes...');
      await clearAllNodes(currentWorkspace.id);
      
      // Create stress test data
      const success = await createStressTestData(config);
      if (!success) {
        throw new Error('Failed to create stress test data');
      }

      setTestProgress(1);

      // Start performance monitoring
      const metricsCollection: PerformanceMetrics[] = [];
      metricsIntervalRef.current = setInterval(() => {
        const metrics = collectMetrics();
        if (metrics) {
          metricsCollection.push(metrics);
          setCurrentMetrics(metrics);
          console.log(`Performance: ${metrics.fps}fps, Memory: ${metrics.memoryUsage.toFixed(1)}MB`);
        }
      }, 1000);

      // Run test for 30 seconds
      testTimeoutRef.current = setTimeout(() => {
        if (metricsIntervalRef.current) {
          clearInterval(metricsIntervalRef.current);
        }

        testResult.metrics = metricsCollection;
        testResult.duration = Date.now() - testStartTimeRef.current;
        testResult.completed = true;

        setTestResults(prev => [...prev, testResult]);
        setIsRunning(false);
        setCurrentTest(null);
        setCurrentMetrics(null);
        setTestProgress(0);

        console.log('Stress test completed:', testResult);
      }, 30000); // 30 seconds

    } catch (error) {
      console.error('Stress test failed:', error);
      setIsRunning(false);
      setCurrentTest(null);
      setCurrentMetrics(null);
      setTestProgress(0);
    }
  }, [isRunning, currentWorkspace, createStressTestData, collectMetrics, clearAllNodes]);

  // Stop current test
  const stopTest = useCallback(() => {
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
    }
    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current);
    }
    setIsRunning(false);
    setCurrentTest(null);
    setCurrentMetrics(null);
    setTestProgress(0);
  }, []);

  // Run predefined test scenarios
  const runPredefinedTests = useCallback(async () => {
    const scenarios = StressTestGenerator.generatePerformanceScenarios();
    
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      const testName = `Scenario ${i + 1} (${scenario.nodeCount} nodes)`;
      
      await runStressTest(scenario, testName);
      
      // Wait for test to complete before starting next one
      await new Promise(resolve => {
        const checkComplete = () => {
          if (!isRunning) {
            resolve(void 0);
          } else {
            setTimeout(checkComplete, 1000);
          }
        };
        checkComplete();
      });
      
      // Wait 5 seconds between tests
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }, [runStressTest, isRunning]);

  // Export test results
  const exportResults = useCallback(() => {
    const data = {
      testResults,
      exportedAt: new Date().toISOString(),
      browser: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `canvas-performance-test-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [testResults]);

  // Clear all test results
  const clearResults = useCallback(() => {
    setTestResults([]);
  }, []);

  if (!currentWorkspace) {
    return (
      <div className="p-4 text-center text-gray-400">
        <p>Please select a workspace to run stress tests</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 bg-[#0A0A0A] text-[#E5E7EB] min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#6B6B3A]">Canvas Performance Stress Test</h1>
        <div className="flex space-x-2">
          <button
            onClick={exportResults}
            disabled={testResults.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Results</span>
          </button>
          <button
            onClick={clearResults}
            disabled={testResults.length === 0}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Results</span>
          </button>
        </div>
      </div>

      {/* Current Test Status */}
      {isRunning && (
        <div className="bg-[#1A1A1A] border border-[#6B6B3A]/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Running Test</h2>
            <button
              onClick={stopTest}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2"
            >
              <Square className="w-4 h-4" />
              <span>Stop</span>
            </button>
          </div>
          
          {currentTest && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-400">Configuration</p>
                <p>Nodes: {currentTest.nodeCount}</p>
                <p>Edges: {currentTest.edgeCount}</p>
                <p>Canvas: {currentTest.canvasWidth}x{currentTest.canvasHeight}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Progress</p>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div 
                    className="bg-[#6B6B3A] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${testProgress * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm">{Math.round(testProgress * 100)}% Complete</p>
              </div>
            </div>
          )}

          {currentMetrics && (
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-[#2A2A2A] p-3 rounded">
                <p className="text-2xl font-bold text-[#6B6B3A]">{currentMetrics.fps}</p>
                <p className="text-sm text-gray-400">FPS</p>
              </div>
              <div className="bg-[#2A2A2A] p-3 rounded">
                <p className="text-2xl font-bold text-blue-400">{currentMetrics.minFps}</p>
                <p className="text-sm text-gray-400">Min FPS</p>
              </div>
              <div className="bg-[#2A2A2A] p-3 rounded">
                <p className="text-2xl font-bold text-green-400">{currentMetrics.maxFps}</p>
                <p className="text-sm text-gray-400">Max FPS</p>
              </div>
              <div className="bg-[#2A2A2A] p-3 rounded">
                <p className="text-2xl font-bold text-purple-400">{currentMetrics.memoryUsage.toFixed(1)}</p>
                <p className="text-sm text-gray-400">Memory (MB)</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Tests */}
        <div className="bg-[#1A1A1A] border border-[#6B6B3A]/30 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Quick Tests</h2>
          <div className="space-y-3">
            <button
              onClick={() => runStressTest(
                { nodeCount: 100, edgeCount: 150, canvasWidth: 3000, canvasHeight: 3000, nodeTypes: ['human', 'ai'], edgeTypes: ['support'] },
                'Small Scale (100 nodes)'
              )}
              disabled={isRunning}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Small Scale (100 nodes)</span>
            </button>
            
            <button
              onClick={() => runStressTest(
                { nodeCount: 500, edgeCount: 800, canvasWidth: 6000, canvasHeight: 6000, nodeTypes: ['human', 'ai', 'risk'], edgeTypes: ['support', 'contradiction'] },
                'Medium Scale (500 nodes)'
              )}
              disabled={isRunning}
              className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Medium Scale (500 nodes)</span>
            </button>
            
            <button
              onClick={() => runStressTest(customConfig, 'Large Scale (1000 nodes)')}
              disabled={isRunning}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Large Scale (1000 nodes)</span>
            </button>
            
            <button
              onClick={runPredefinedTests}
              disabled={isRunning}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center space-x-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Run All Scenarios</span>
            </button>
          </div>
        </div>

        {/* Custom Configuration */}
        <div className="bg-[#1A1A1A] border border-[#6B6B3A]/30 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Custom Configuration</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Node Count</label>
                <input
                  type="number"
                  value={customConfig.nodeCount}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, nodeCount: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-gray-600 rounded text-white"
                  min="1"
                  max="5000"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Edge Count</label>
                <input
                  type="number"
                  value={customConfig.edgeCount}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, edgeCount: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-gray-600 rounded text-white"
                  min="0"
                  max="10000"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Canvas Width</label>
                <input
                  type="number"
                  value={customConfig.canvasWidth}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, canvasWidth: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-gray-600 rounded text-white"
                  min="1000"
                  max="50000"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Canvas Height</label>
                <input
                  type="number"
                  value={customConfig.canvasHeight}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, canvasHeight: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-gray-600 rounded text-white"
                  min="1000"
                  max="50000"
                />
              </div>
            </div>

            <button
              onClick={() => runStressTest(customConfig, 'Custom Test')}
              disabled={isRunning}
              className="w-full px-4 py-2 bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Run Custom Test</span>
            </button>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-[#1A1A1A] border border-[#6B6B3A]/30 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Test Results</h2>
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div key={index} className="bg-[#2A2A2A] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{result.testName}</h3>
                  <span className="text-sm text-gray-400">
                    {(result.duration / 1000).toFixed(1)}s
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Avg FPS</p>
                    <p className="font-semibold">
                      {result.metrics.length > 0 
                        ? (result.metrics.reduce((sum, m) => sum + m.fps, 0) / result.metrics.length).toFixed(1)
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Min FPS</p>
                    <p className="font-semibold">
                      {result.metrics.length > 0 
                        ? Math.min(...result.metrics.map(m => m.minFps))
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Max Memory</p>
                    <p className="font-semibold">
                      {result.metrics.length > 0 
                        ? Math.max(...result.metrics.map(m => m.memoryUsage)).toFixed(1) + 'MB'
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Elements</p>
                    <p className="font-semibold">
                      {result.config.nodeCount}N / {result.config.edgeCount}E
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasStressTest;