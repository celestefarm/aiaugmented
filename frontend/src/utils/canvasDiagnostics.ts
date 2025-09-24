/**
 * Canvas Diagnostics Utility
 * Helps identify performance issues, memory leaks, and rendering problems
 */

export interface DiagnosticReport {
  timestamp: number;
  performance: {
    fps: number;
    frameTime: number;
    memoryUsage: number;
    nodeCount: number;
    edgeCount: number;
    visibleNodes: number;
    visibleEdges: number;
  };
  issues: {
    type: 'warning' | 'error' | 'info';
    message: string;
    component: string;
  }[];
  recommendations: string[];
}

export class CanvasDiagnostics {
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private frameTimes: number[] = [];
  private maxFrameHistory = 60; // Keep last 60 frames
  
  // Performance thresholds
  private readonly FPS_WARNING_THRESHOLD = 30;
  private readonly FPS_CRITICAL_THRESHOLD = 15;
  private readonly FRAME_TIME_WARNING = 33; // 33ms = 30fps
  private readonly MEMORY_WARNING_MB = 100;

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.frameTimes = [];
  }

  /**
   * Record frame timing
   */
  recordFrame(): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxFrameHistory) {
      this.frameTimes.shift();
    }
    
    this.frameCount++;
    this.lastFrameTime = now;
  }

  /**
   * Generate comprehensive diagnostic report
   */
  generateReport(nodeCount: number, edgeCount: number, visibleNodes: number, visibleEdges: number): DiagnosticReport {
    const now = performance.now();
    const avgFrameTime = this.frameTimes.length > 0 
      ? this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length 
      : 0;
    
    const fps = avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0;
    const memoryUsage = this.getMemoryUsage();
    
    const issues: DiagnosticReport['issues'] = [];
    const recommendations: string[] = [];

    // Performance analysis
    if (fps < this.FPS_CRITICAL_THRESHOLD) {
      issues.push({
        type: 'error',
        message: `Critical FPS drop: ${fps}fps (target: 60fps)`,
        component: 'CanvasRenderer'
      });
      recommendations.push('Consider reducing node count or implementing more aggressive LOD');
    } else if (fps < this.FPS_WARNING_THRESHOLD) {
      issues.push({
        type: 'warning',
        message: `Low FPS detected: ${fps}fps (target: 60fps)`,
        component: 'CanvasRenderer'
      });
      recommendations.push('Monitor performance with current node count');
    }

    // Frame time analysis
    if (avgFrameTime > this.FRAME_TIME_WARNING) {
      issues.push({
        type: 'warning',
        message: `High frame time: ${avgFrameTime.toFixed(2)}ms (target: <16.67ms)`,
        component: 'CanvasRenderer'
      });
    }

    // Memory analysis
    if (memoryUsage > this.MEMORY_WARNING_MB) {
      issues.push({
        type: 'warning',
        message: `High memory usage: ${memoryUsage.toFixed(1)}MB`,
        component: 'CanvasStateManager'
      });
      recommendations.push('Check for memory leaks in event listeners or cached data');
    }

    // Node/Edge ratio analysis
    const nodeToEdgeRatio = edgeCount / Math.max(nodeCount, 1);
    if (nodeToEdgeRatio > 3) {
      issues.push({
        type: 'warning',
        message: `High edge density: ${nodeToEdgeRatio.toFixed(1)} edges per node`,
        component: 'SpatialIndex'
      });
      recommendations.push('Consider edge bundling or simplified rendering for dense connections');
    }

    // Visibility culling efficiency
    const visibilityRatio = (visibleNodes + visibleEdges) / Math.max(nodeCount + edgeCount, 1);
    if (visibilityRatio > 0.8) {
      issues.push({
        type: 'info',
        message: `High visibility ratio: ${(visibilityRatio * 100).toFixed(1)}% of elements visible`,
        component: 'ViewportCulling'
      });
      recommendations.push('Viewport culling is working but most elements are visible - consider zooming out');
    }

    // Frame time consistency
    if (this.frameTimes.length > 10) {
      const frameTimeVariance = this.calculateVariance(this.frameTimes);
      if (frameTimeVariance > 100) { // High variance in frame times
        issues.push({
          type: 'warning',
          message: `Inconsistent frame times (variance: ${frameTimeVariance.toFixed(1)})`,
          component: 'CanvasRenderer'
        });
        recommendations.push('Frame time inconsistency detected - check for blocking operations');
      }
    }

    return {
      timestamp: now,
      performance: {
        fps,
        frameTime: avgFrameTime,
        memoryUsage,
        nodeCount,
        edgeCount,
        visibleNodes,
        visibleEdges
      },
      issues,
      recommendations
    };
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    const memoryInfo = (performance as any).memory;
    return memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0;
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  /**
   * Check for common canvas issues
   */
  checkCanvasHealth(canvas: HTMLCanvasElement | null): string[] {
    const issues: string[] = [];
    
    if (!canvas) {
      issues.push('Canvas element not found');
      return issues;
    }

    // Check canvas size
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      issues.push('Canvas has zero dimensions');
    }

    // Check DPI scaling
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      issues.push('Canvas DPI scaling mismatch detected');
    }

    // Check context
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      issues.push('Unable to get 2D rendering context');
    }

    return issues;
  }

  /**
   * Validate interaction manager state
   */
  validateInteractionState(interactionManager: any): string[] {
    const issues: string[] = [];
    
    if (!interactionManager) {
      issues.push('Interaction manager not initialized');
      return issues;
    }

    // Check for stuck states
    const mode = interactionManager.getCurrentMode();
    if (mode !== 'IDLE' && mode !== 'CONNECTING') {
      issues.push(`Interaction manager in non-idle state: ${mode}`);
    }

    return issues;
  }

  /**
   * Generate performance summary
   */
  getPerformanceSummary(): string {
    if (this.frameTimes.length === 0) {
      return 'No performance data available';
    }

    const avgFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
    const fps = Math.round(1000 / avgFrameTime);
    const minFrameTime = Math.min(...this.frameTimes);
    const maxFrameTime = Math.max(...this.frameTimes);
    
    return `Performance: ${fps}fps avg, ${(1000/maxFrameTime).toFixed(0)}-${(1000/minFrameTime).toFixed(0)}fps range, ${avgFrameTime.toFixed(1)}ms avg frame time`;
  }
}

// Global diagnostics instance
export const canvasDiagnostics = new CanvasDiagnostics();