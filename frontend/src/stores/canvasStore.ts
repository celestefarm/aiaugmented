import { Node, Edge } from '@/lib/api';
import { globalSpatialIndex } from '@/utils/spatialIndex';

export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasNode extends Node {
  // Canvas-specific properties
  isDirty: boolean;
  screenX: number;
  screenY: number;
  isVisible: boolean;
  renderCache?: ImageData;
}

export interface CanvasEdge extends Edge {
  // Canvas-specific properties
  isDirty: boolean;
  isVisible: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface ConnectionPoint {
  id: string;
  nodeId: string;
  x: number;
  y: number;
  type: 'input' | 'output' | 'bidirectional';
  isHighlighted: boolean;
}

export interface SnapTarget {
  connectionPoint: ConnectionPoint;
  distance: number;
}

export interface InteractionState {
  mode: 'IDLE' | 'DRAGGING_NODE' | 'PANNING' | 'CONNECTING' | 'DRAGGING_CONNECTION' | 'MARQUEE_SELECTING';
  draggedNodeId: string | null;
  dragStartPosition: Point | null;
  dragCurrentPosition: Point | null;
  connectionStart: string | null;
  connectionDragContext: {
    startNodeId: string;
    startConnectionPointId: string;
    startPosition: Point;
    currentPosition: Point;
    isActive: boolean;
    snapTarget: SnapTarget | null;
    previewLine: {
      from: Point;
      to: Point;
    } | null;
  } | null;
  hoveredConnectionPoint: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  selectedNodeIds: Set<string>;
  marqueeSelection: {
    startPosition: Point;
    currentPosition: Point;
    isActive: boolean;
  } | null;
  detachingConnection: {
    edgeId: string;
    fromNodeId: string;
    toNodeId: string;
    detachEnd: 'from' | 'to';
  } | null;
}

export interface CanvasState {
  // Core data
  nodes: Map<string, CanvasNode>;
  edges: Map<string, CanvasEdge>;
  
  // Viewport state
  transform: Transform;
  viewport: Viewport;
  
  // Interaction state
  interaction: InteractionState;
  
  // Performance tracking
  lastRenderTime: number;
  frameRate: number;
  isDirty: boolean;
}

export class CanvasStateManager {
  private state: CanvasState;
  private subscribers: Set<(state: CanvasState) => void> = new Set();
  private batchedUpdates: Set<string> = new Set();
  private updateScheduled: boolean = false;
  private animationFrameId: number | null = null;
  
  // Connection point constants
  private readonly SNAP_DISTANCE = 30;
  private readonly CONNECTION_POINT_RADIUS = 8;

  constructor() {
    this.state = {
      nodes: new Map(),
      edges: new Map(),
      transform: { x: 0, y: 0, scale: 1 },
      viewport: { x: 0, y: 0, width: 1920, height: 1080 },
      interaction: {
        mode: 'IDLE',
        draggedNodeId: null,
        dragStartPosition: null,
        dragCurrentPosition: null,
        connectionStart: null,
        connectionDragContext: null,
        hoveredConnectionPoint: null,
        hoveredNodeId: null,
        hoveredEdgeId: null,
        selectedNodeIds: new Set<string>(),
        marqueeSelection: null,
        detachingConnection: null,
      },
      lastRenderTime: 0,
      frameRate: 60,
      isDirty: false,
    };
  }

  // Subscribe to state changes
  subscribe(callback: (state: CanvasState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Get current state
  getState(): CanvasState {
    return this.state;
  }

  // Update nodes from API data with spatial indexing
  updateNodes(apiNodes: Node[]): void {
    const newNodes = new Map<string, CanvasNode>();
    
    // Clear and rebuild spatial index for nodes
    globalSpatialIndex.clear();
    
    apiNodes.forEach(node => {
      const existingNode = this.state.nodes.get(node.id);
      const canvasNode: CanvasNode = {
        ...node,
        isDirty: !existingNode ||
                 existingNode.x !== node.x ||
                 existingNode.y !== node.y ||
                 existingNode.title !== node.title,
        screenX: node.x * this.state.transform.scale + this.state.transform.x,
        screenY: node.y * this.state.transform.scale + this.state.transform.y,
        isVisible: this.isNodeVisible(node),
        renderCache: existingNode?.renderCache,
      };
      
      newNodes.set(node.id, canvasNode);
      
      // Add to spatial index
      globalSpatialIndex.addNode(node, 240, 120);
    });

    this.state.nodes = newNodes;
    this.markDirty();
    this.scheduleUpdate();
  }

  // Update edges from API data with spatial indexing
  updateEdges(apiEdges: Edge[]): void {
    const newEdges = new Map<string, CanvasEdge>();
    
    apiEdges.forEach(edge => {
      const fromNode = this.state.nodes.get(edge.from_node_id);
      const toNode = this.state.nodes.get(edge.to_node_id);
      
      if (fromNode && toNode) {
        const existingEdge = this.state.edges.get(edge.id);
        const canvasEdge: CanvasEdge = {
          ...edge,
          isDirty: !existingEdge ||
                   existingEdge.from_node_id !== edge.from_node_id ||
                   existingEdge.to_node_id !== edge.to_node_id,
          isVisible: this.isEdgeVisible({ ...edge, fromX: 0, fromY: 0, toX: 0, toY: 0, isDirty: false } as CanvasEdge),
          fromX: fromNode.screenX + 120, // NODE_WIDTH / 2
          fromY: fromNode.screenY + 60,  // NODE_HEIGHT / 2
          toX: toNode.screenX + 120,
          toY: toNode.screenY + 60,
        };
        
        newEdges.set(edge.id, canvasEdge);
        
        // Add to spatial index
        globalSpatialIndex.addEdge(edge, fromNode, toNode);
      }
    });

    this.state.edges = newEdges;
    this.markDirty();
    this.scheduleUpdate();
  }

  // Update transform (pan/zoom)
  updateTransform(transform: Transform): void {
    this.state.transform = transform;
    
    // Update screen positions for all nodes
    this.state.nodes.forEach(node => {
      node.screenX = node.x * transform.scale + transform.x;
      node.screenY = node.y * transform.scale + transform.y;
      node.isVisible = this.isNodeVisible(node);
      node.isDirty = true; // Mark for re-render due to position change
    });

    // Update edge positions and visibility
    this.state.edges.forEach(edge => {
      const fromNode = this.state.nodes.get(edge.from_node_id);
      const toNode = this.state.nodes.get(edge.to_node_id);
      
      if (fromNode && toNode) {
        edge.fromX = fromNode.screenX + 120;
        edge.fromY = fromNode.screenY + 60;
        edge.toX = toNode.screenX + 120;
        edge.toY = toNode.screenY + 60;
        edge.isVisible = this.isEdgeVisible(edge);
        edge.isDirty = true;
      }
    });

    this.markDirty();
    this.scheduleUpdate();
  }

  // Update viewport
  updateViewport(viewport: Viewport): void {
    this.state.viewport = viewport;
    
    // Update visibility for all nodes
    this.state.nodes.forEach(node => {
      const wasVisible = node.isVisible;
      node.isVisible = this.isNodeVisible(node);
      if (wasVisible !== node.isVisible) {
        node.isDirty = true;
      }
    });

    this.markDirty();
    this.scheduleUpdate();
  }

  // Update interaction state
  updateInteraction(interaction: Partial<InteractionState>): void {
    this.state.interaction = { ...this.state.interaction, ...interaction };
    
    // If dragging a node, update its position in real-time
    if (interaction.mode === 'DRAGGING_NODE' && 
        interaction.draggedNodeId && 
        interaction.dragCurrentPosition && 
        interaction.dragStartPosition) {
      
      const node = this.state.nodes.get(interaction.draggedNodeId);
      if (node) {
        const deltaX = interaction.dragCurrentPosition.x - interaction.dragStartPosition.x;
        const deltaY = interaction.dragCurrentPosition.y - interaction.dragStartPosition.y;
        
        // Update screen position for immediate visual feedback
        node.screenX = node.x * this.state.transform.scale + this.state.transform.x + deltaX;
        node.screenY = node.y * this.state.transform.scale + this.state.transform.y + deltaY;
        node.isDirty = true;
        
        // Update connected edges
        this.state.edges.forEach(edge => {
          if (edge.from_node_id === node.id || edge.to_node_id === node.id) {
            const fromNode = this.state.nodes.get(edge.from_node_id);
            const toNode = this.state.nodes.get(edge.to_node_id);
            
            if (fromNode && toNode) {
              edge.fromX = fromNode.screenX + 120;
              edge.fromY = fromNode.screenY + 60;
              edge.toX = toNode.screenX + 120;
              edge.toY = toNode.screenY + 60;
              edge.isDirty = true;
            }
          }
        });
      }
    }

    this.markDirty();
    this.scheduleUpdate();
  }

  // Enhanced viewport culling with proper node dimensions
  private isNodeVisible(node: Node | CanvasNode): boolean {
    const nodeScreenX = 'screenX' in node ? node.screenX : node.x * this.state.transform.scale + this.state.transform.x;
    const nodeScreenY = 'screenY' in node ? node.screenY : node.y * this.state.transform.scale + this.state.transform.y;
    
    // Node dimensions in screen space
    const nodeWidth = 240 * this.state.transform.scale;
    const nodeHeight = 120 * this.state.transform.scale;
    
    // Adaptive buffer based on zoom level - smaller buffer when zoomed out
    const buffer = Math.max(50, 200 * this.state.transform.scale);
    
    // Check if node rectangle intersects with viewport (with buffer)
    return !(nodeScreenX + nodeWidth < -buffer ||
             nodeScreenX > this.state.viewport.width + buffer ||
             nodeScreenY + nodeHeight < -buffer ||
             nodeScreenY > this.state.viewport.height + buffer);
  }

  // Check if edge is visible (both endpoints or line crosses viewport)
  private isEdgeVisible(edge: CanvasEdge): boolean {
    const fromNode = this.state.nodes.get(edge.from_node_id);
    const toNode = this.state.nodes.get(edge.to_node_id);
    
    if (!fromNode || !toNode) return false;
    
    // If either node is visible, edge might be visible
    if (fromNode.isVisible || toNode.isVisible) return true;
    
    // Check if edge line crosses viewport (for long edges between off-screen nodes)
    const buffer = 100;
    const viewLeft = -buffer;
    const viewRight = this.state.viewport.width + buffer;
    const viewTop = -buffer;
    const viewBottom = this.state.viewport.height + buffer;
    
    // Simple line-rectangle intersection check
    const x1 = fromNode.screenX + 120; // center
    const y1 = fromNode.screenY + 60;
    const x2 = toNode.screenX + 120;
    const y2 = toNode.screenY + 60;
    
    // Check if line intersects viewport rectangle
    return this.lineIntersectsRect(x1, y1, x2, y2, viewLeft, viewTop, viewRight, viewBottom);
  }

  // Line-rectangle intersection helper
  private lineIntersectsRect(x1: number, y1: number, x2: number, y2: number,
                           left: number, top: number, right: number, bottom: number): boolean {
    // Check if either endpoint is inside rectangle
    if ((x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) ||
        (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom)) {
      return true;
    }
    
    // Check line intersection with rectangle edges
    return this.lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||    // top
           this.lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) || // right
           this.lineIntersectsLine(x1, y1, x2, y2, right, bottom, left, bottom) || // bottom
           this.lineIntersectsLine(x1, y1, x2, y2, left, bottom, left, top);     // left
  }

  // Line-line intersection helper
  private lineIntersectsLine(x1: number, y1: number, x2: number, y2: number,
                           x3: number, y3: number, x4: number, y4: number): boolean {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return false; // parallel lines
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  // Mark state as dirty for re-render
  private markDirty(): void {
    this.state.isDirty = true;
  }

  // Schedule batched update
  private scheduleUpdate(): void {
    if (this.updateScheduled) return;
    
    this.updateScheduled = true;
    this.animationFrameId = requestAnimationFrame(() => {
      this.flushUpdates();
      this.updateScheduled = false;
      this.animationFrameId = null;
    });
  }

  // Flush updates to subscribers
  private flushUpdates(): void {
    if (this.state.isDirty) {
      this.state.isDirty = false;
      this.state.lastRenderTime = performance.now();
      
      this.subscribers.forEach(callback => {
        callback(this.state);
      });
    }
  }

  // Generate connection points for a node
  generateConnectionPoints(nodeId: string): ConnectionPoint[] {
    const node = this.state.nodes.get(nodeId);
    if (!node) return [];

    const points: ConnectionPoint[] = [];
    const nodeWidth = 240;
    const nodeHeight = 120;
    
    // Create connection points on all four sides
    const positions = [
      { x: node.x + nodeWidth / 2, y: node.y, type: 'input' as const, id: 'top' },
      { x: node.x + nodeWidth, y: node.y + nodeHeight / 2, type: 'output' as const, id: 'right' },
      { x: node.x + nodeWidth / 2, y: node.y + nodeHeight, type: 'output' as const, id: 'bottom' },
      { x: node.x, y: node.y + nodeHeight / 2, type: 'input' as const, id: 'left' },
    ];

    positions.forEach((pos, index) => {
      points.push({
        id: `${nodeId}-${pos.id}`,
        nodeId,
        x: pos.x,
        y: pos.y,
        type: 'bidirectional',
        isHighlighted: this.state.interaction.hoveredConnectionPoint === `${nodeId}-${pos.id}`,
      });
    });

    return points;
  }

  // Find nearest connection point to a screen position
  findNearestConnectionPoint(screenX: number, screenY: number, excludeNodeId?: string): SnapTarget | null {
    let nearestTarget: SnapTarget | null = null;
    let minDistance = this.SNAP_DISTANCE;

    // Convert screen coordinates to canvas coordinates
    const canvasX = (screenX - this.state.transform.x) / this.state.transform.scale;
    const canvasY = (screenY - this.state.transform.y) / this.state.transform.scale;

    this.state.nodes.forEach((node) => {
      if (excludeNodeId && node.id === excludeNodeId) return;
      
      const connectionPoints = this.generateConnectionPoints(node.id);
      
      connectionPoints.forEach((point) => {
        const distance = Math.sqrt(
          Math.pow(point.x - canvasX, 2) + Math.pow(point.y - canvasY, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestTarget = { connectionPoint: point, distance };
        }
      });
    });

    return nearestTarget;
  }

  // Update connection point hover state
  updateConnectionPointHover(connectionPointId: string | null): void {
    if (this.state.interaction.hoveredConnectionPoint !== connectionPointId) {
      this.state.interaction.hoveredConnectionPoint = connectionPointId;
      this.markDirty();
      this.scheduleUpdate();
    }
  }

  // Update node hover state
  updateNodeHover(nodeId: string | null): void {
    if (this.state.interaction.hoveredNodeId !== nodeId) {
      this.state.interaction.hoveredNodeId = nodeId;
      this.markDirty();
      this.scheduleUpdate();
    }
  }

  // Update edge hover state
  updateEdgeHover(edgeId: string | null): void {
    if (this.state.interaction.hoveredEdgeId !== edgeId) {
      this.state.interaction.hoveredEdgeId = edgeId;
      this.markDirty();
      this.scheduleUpdate();
    }
  }

  // Update node selection
  updateNodeSelection(nodeIds: string[] | Set<string>, replace: boolean = true): void {
    const newSelection = nodeIds instanceof Set ? nodeIds : new Set(nodeIds);
    
    if (replace) {
      this.state.interaction.selectedNodeIds = newSelection;
    } else {
      // Add to existing selection
      nodeIds.forEach(id => this.state.interaction.selectedNodeIds.add(id));
    }
    
    this.markDirty();
    this.scheduleUpdate();
  }

  // Toggle node selection
  toggleNodeSelection(nodeId: string): void {
    if (this.state.interaction.selectedNodeIds.has(nodeId)) {
      this.state.interaction.selectedNodeIds.delete(nodeId);
    } else {
      this.state.interaction.selectedNodeIds.add(nodeId);
    }
    
    this.markDirty();
    this.scheduleUpdate();
  }

  // Clear selection
  clearSelection(): void {
    if (this.state.interaction.selectedNodeIds.size > 0) {
      this.state.interaction.selectedNodeIds.clear();
      this.markDirty();
      this.scheduleUpdate();
    }
  }

  // Start marquee selection
  startMarqueeSelection(startPosition: Point): void {
    this.state.interaction.mode = 'MARQUEE_SELECTING';
    this.state.interaction.marqueeSelection = {
      startPosition,
      currentPosition: startPosition,
      isActive: true,
    };
    this.markDirty();
    this.scheduleUpdate();
  }

  // Update marquee selection
  updateMarqueeSelection(currentPosition: Point): void {
    if (this.state.interaction.marqueeSelection) {
      this.state.interaction.marqueeSelection.currentPosition = currentPosition;
      
      // Find nodes within marquee bounds
      const marquee = this.state.interaction.marqueeSelection;
      const minX = Math.min(marquee.startPosition.x, marquee.currentPosition.x);
      const maxX = Math.max(marquee.startPosition.x, marquee.currentPosition.x);
      const minY = Math.min(marquee.startPosition.y, marquee.currentPosition.y);
      const maxY = Math.max(marquee.startPosition.y, marquee.currentPosition.y);
      
      // Convert screen coordinates to canvas coordinates
      const canvasMinX = (minX - this.state.transform.x) / this.state.transform.scale;
      const canvasMaxX = (maxX - this.state.transform.x) / this.state.transform.scale;
      const canvasMinY = (minY - this.state.transform.y) / this.state.transform.scale;
      const canvasMaxY = (maxY - this.state.transform.y) / this.state.transform.scale;
      
      const selectedNodes = new Set<string>();
      this.state.nodes.forEach((node) => {
        const nodeRight = node.x + 240; // NODE_WIDTH
        const nodeBottom = node.y + 120; // NODE_HEIGHT
        
        // Check if node intersects with marquee
        if (node.x < canvasMaxX && nodeRight > canvasMinX &&
            node.y < canvasMaxY && nodeBottom > canvasMinY) {
          selectedNodes.add(node.id);
        }
      });
      
      this.state.interaction.selectedNodeIds = selectedNodes;
      this.markDirty();
      this.scheduleUpdate();
    }
  }

  // End marquee selection
  endMarqueeSelection(): void {
    this.state.interaction.mode = 'IDLE';
    this.state.interaction.marqueeSelection = null;
    this.markDirty();
    this.scheduleUpdate();
  }

  // Get all connection points for visible nodes
  getAllConnectionPoints(): ConnectionPoint[] {
    const points: ConnectionPoint[] = [];
    
    this.state.nodes.forEach((node) => {
      if (node.isVisible) {
        points.push(...this.generateConnectionPoints(node.id));
      }
    });
    
    return points;
  }

  // Check if a point is near an existing edge endpoint (for detachment)
  findDetachableEdge(screenX: number, screenY: number): { edgeId: string; end: 'from' | 'to' } | null {
    const canvasX = (screenX - this.state.transform.x) / this.state.transform.scale;
    const canvasY = (screenY - this.state.transform.y) / this.state.transform.scale;
    const detachDistance = 20;

    for (const edge of this.state.edges.values()) {
      const fromNode = this.state.nodes.get(edge.from_node_id);
      const toNode = this.state.nodes.get(edge.to_node_id);
      
      if (!fromNode || !toNode) continue;

      // Check distance to 'from' endpoint
      const fromX = fromNode.x + 120; // NODE_WIDTH / 2
      const fromY = fromNode.y + 60;  // NODE_HEIGHT / 2
      const fromDistance = Math.sqrt(Math.pow(fromX - canvasX, 2) + Math.pow(fromY - canvasY, 2));
      
      if (fromDistance < detachDistance) {
        return { edgeId: edge.id, end: 'from' };
      }

      // Check distance to 'to' endpoint
      const toX = toNode.x + 120;
      const toY = toNode.y + 60;
      const toDistance = Math.sqrt(Math.pow(toX - canvasX, 2) + Math.pow(toY - canvasY, 2));
      
      if (toDistance < detachDistance) {
        return { edgeId: edge.id, end: 'to' };
      }
    }

    return null;
  }

  // Cleanup
  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.subscribers.clear();
    this.batchedUpdates.clear();
    this.updateScheduled = false;
    
    // Clear all state
    this.state.nodes.clear();
    this.state.edges.clear();
    this.state.interaction = {
      mode: 'IDLE',
      draggedNodeId: null,
      dragStartPosition: null,
      dragCurrentPosition: null,
      connectionStart: null,
      connectionDragContext: null,
      hoveredConnectionPoint: null,
      hoveredNodeId: null,
      hoveredEdgeId: null,
      selectedNodeIds: new Set<string>(),
      marqueeSelection: null,
      detachingConnection: null,
    };
  }
}

// Global instance
export const canvasStateManager = new CanvasStateManager();