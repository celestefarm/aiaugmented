import { Node, Edge, NodeCreateRequest, EdgeCreateRequest } from '@/lib/api';

export interface StressTestConfig {
  nodeCount: number;
  edgeCount: number;
  canvasWidth: number;
  canvasHeight: number;
  nodeTypes: Node['type'][];
  edgeTypes: Edge['type'][];
}

export interface StressTestData {
  nodes: NodeCreateRequest[];
  edges: EdgeCreateRequest[];
}

export class StressTestGenerator {
  private static readonly DEFAULT_CONFIG: StressTestConfig = {
    nodeCount: 1000,
    edgeCount: 2000,
    canvasWidth: 10000,
    canvasHeight: 10000,
    nodeTypes: ['human', 'ai', 'risk', 'dependency', 'decision'],
    edgeTypes: ['support', 'contradiction', 'dependency', 'ai-relationship']
  };

  /**
   * Generate stress test data with specified configuration
   */
  static generateStressTestData(config: Partial<StressTestConfig> = {}): StressTestData {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    console.log(`Generating stress test data: ${finalConfig.nodeCount} nodes, ${finalConfig.edgeCount} edges`);
    
    const nodes = this.generateNodes(finalConfig);
    const edges = this.generateEdges(nodes, finalConfig);
    
    return { nodes, edges };
  }

  /**
   * Generate nodes with realistic distribution and positioning
   */
  private static generateNodes(config: StressTestConfig): NodeCreateRequest[] {
    const nodes: NodeCreateRequest[] = [];
    const { nodeCount, canvasWidth, canvasHeight, nodeTypes } = config;
    
    // Create clusters for more realistic distribution
    const clusterCount = Math.ceil(nodeCount / 50); // ~50 nodes per cluster
    const clusters = this.generateClusters(clusterCount, canvasWidth, canvasHeight);
    
    for (let i = 0; i < nodeCount; i++) {
      const cluster = clusters[i % clusters.length];
      const nodeType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
      
      // Position nodes around cluster center with some spread
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * 300; // Cluster radius
      const x = Math.max(0, Math.min(canvasWidth - 240, cluster.x + Math.cos(angle) * distance));
      const y = Math.max(0, Math.min(canvasHeight - 120, cluster.y + Math.sin(angle) * distance));
      
      nodes.push({
        title: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Node ${i + 1}`,
        description: this.generateNodeDescription(nodeType, i),
        type: nodeType,
        x: Math.round(x / 20) * 20, // Snap to grid
        y: Math.round(y / 20) * 20,
        confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
        feasibility: Math.random() < 0.5 ? 'high' : 'medium', // string field
        source_agent: this.getRandomSourceAgent()
      });
    }
    
    return nodes;
  }

  /**
   * Generate cluster centers for node distribution
   */
  private static generateClusters(count: number, width: number, height: number): Array<{x: number, y: number}> {
    const clusters = [];
    const margin = 500;
    
    for (let i = 0; i < count; i++) {
      clusters.push({
        x: margin + Math.random() * (width - 2 * margin),
        y: margin + Math.random() * (height - 2 * margin)
      });
    }
    
    return clusters;
  }

  /**
   * Generate edges with realistic connection patterns
   */
  private static generateEdges(nodes: NodeCreateRequest[], config: StressTestConfig): EdgeCreateRequest[] {
    const edges: EdgeCreateRequest[] = [];
    const { edgeCount, edgeTypes } = config;
    const nodeIds = nodes.map((_, index) => `stress-node-${index}`);
    
    // Track connections to avoid duplicates
    const connections = new Set<string>();
    
    let attempts = 0;
    const maxAttempts = edgeCount * 3;
    
    while (edges.length < edgeCount && attempts < maxAttempts) {
      attempts++;
      
      const fromIndex = Math.floor(Math.random() * nodes.length);
      const toIndex = Math.floor(Math.random() * nodes.length);
      
      // Avoid self-connections
      if (fromIndex === toIndex) continue;
      
      const fromId = nodeIds[fromIndex];
      const toId = nodeIds[toIndex];
      const connectionKey = `${fromId}-${toId}`;
      const reverseKey = `${toId}-${fromId}`;
      
      // Avoid duplicate connections
      if (connections.has(connectionKey) || connections.has(reverseKey)) continue;
      
      // Prefer connections between nearby nodes (80% of the time)
      if (Math.random() < 0.8) {
        const distance = this.calculateDistance(nodes[fromIndex], nodes[toIndex]);
        if (distance > 800) continue; // Skip distant connections
      }
      
      const edgeType = edgeTypes[Math.floor(Math.random() * edgeTypes.length)];
      
      edges.push({
        from_node_id: fromId,
        to_node_id: toId,
        type: edgeType,
        description: `${edgeType} connection between ${nodes[fromIndex].title} and ${nodes[toIndex].title}`
      });
      
      connections.add(connectionKey);
    }
    
    console.log(`Generated ${edges.length} edges out of requested ${edgeCount} (${attempts} attempts)`);
    return edges;
  }

  /**
   * Calculate distance between two nodes
   */
  private static calculateDistance(node1: NodeCreateRequest, node2: NodeCreateRequest): number {
    const dx = node1.x - node2.x;
    const dy = node1.y - node2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Generate realistic node descriptions
   */
  private static generateNodeDescription(type: Node['type'], index: number): string {
    const descriptions = {
      human: [
        'User feedback and requirements analysis',
        'Stakeholder input and decision making',
        'Human oversight and validation',
        'Customer experience considerations'
      ],
      ai: [
        'Machine learning model predictions',
        'Automated analysis and insights',
        'AI-driven recommendations',
        'Intelligent data processing'
      ],
      risk: [
        'Potential security vulnerabilities',
        'Performance bottleneck concerns',
        'Compliance and regulatory risks',
        'Technical debt implications'
      ],
      dependency: [
        'External service integration',
        'Third-party library requirements',
        'Infrastructure dependencies',
        'Cross-team coordination needs'
      ],
      decision: [
        'Strategic architecture choice',
        'Technology stack selection',
        'Implementation approach decision',
        'Resource allocation strategy'
      ]
    };
    
    const typeDescriptions = descriptions[type] || descriptions.human;
    const baseDescription = typeDescriptions[index % typeDescriptions.length];
    
    return `${baseDescription} - Generated for stress testing with realistic content and metadata.`;
  }

  /**
   * Get random source agent for nodes
   */
  private static getRandomSourceAgent(): string | undefined {
    const agents = ['strategist', 'analyst', 'architect', 'reviewer'];
    return Math.random() < 0.7 ? agents[Math.floor(Math.random() * agents.length)] : undefined;
  }

  /**
   * Generate performance test scenarios
   */
  static generatePerformanceScenarios(): StressTestConfig[] {
    return [
      // Small scale - baseline
      {
        nodeCount: 100,
        edgeCount: 150,
        canvasWidth: 3000,
        canvasHeight: 3000,
        nodeTypes: ['human', 'ai', 'risk'],
        edgeTypes: ['support', 'contradiction']
      },
      // Medium scale
      {
        nodeCount: 500,
        edgeCount: 800,
        canvasWidth: 6000,
        canvasHeight: 6000,
        nodeTypes: ['human', 'ai', 'risk', 'dependency'],
        edgeTypes: ['support', 'contradiction', 'dependency']
      },
      // Large scale - main stress test
      {
        nodeCount: 1000,
        edgeCount: 2000,
        canvasWidth: 10000,
        canvasHeight: 10000,
        nodeTypes: ['human', 'ai', 'risk', 'dependency', 'decision'],
        edgeTypes: ['support', 'contradiction', 'dependency', 'ai-relationship']
      },
      // Extreme scale
      {
        nodeCount: 2000,
        edgeCount: 4000,
        canvasWidth: 15000,
        canvasHeight: 15000,
        nodeTypes: ['human', 'ai', 'risk', 'dependency', 'decision'],
        edgeTypes: ['support', 'contradiction', 'dependency', 'ai-relationship']
      }
    ];
  }

  /**
   * Create a performance monitoring utility
   */
  static createPerformanceMonitor() {
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 0;
    let minFps = Infinity;
    let maxFps = 0;
    let totalFrameTime = 0;

    return {
      startFrame: () => {
        return performance.now();
      },
      
      endFrame: (startTime: number) => {
        const now = performance.now();
        const frameTime = now - startTime;
        totalFrameTime += frameTime;
        frameCount++;
        
        if (now - lastTime >= 1000) {
          fps = Math.round((frameCount * 1000) / (now - lastTime));
          minFps = Math.min(minFps, fps);
          maxFps = Math.max(maxFps, fps);
          
          console.log(`FPS: ${fps} (min: ${minFps}, max: ${maxFps}), Avg frame time: ${(totalFrameTime / frameCount).toFixed(2)}ms`);
          
          frameCount = 0;
          lastTime = now;
          totalFrameTime = 0;
        }
        
        return { fps, minFps, maxFps, frameTime };
      },
      
      getStats: () => ({ fps, minFps, maxFps })
    };
  }
}