import { Node, Edge, EdgeCreateRequest, createEdge, summarizeRelationship, RelationshipSummarizationResponse } from '@/lib/api';

export interface ConnectorAnchor {
  id: string;
  nodeId: string;
  x: number;
  y: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  isHighlighted: boolean;
  isActive: boolean;
}

export interface ConnectorState {
  mode: 'IDLE' | 'CONNECTING' | 'DRAGGING_CONNECTION';
  isEnabled: boolean;
  startNodeId: string | null;
  startAnchor: ConnectorAnchor | null;
  currentPosition: { x: number; y: number } | null;
  targetAnchor: ConnectorAnchor | null;
  previewLine: {
    from: { x: number; y: number };
    to: { x: number; y: number };
  } | null;
  snapDistance: number;
  showAnchors: boolean;
}

export interface ConnectorCallbacks {
  onConnectionCreated?: (edge: Edge) => void;
  onConnectionFailed?: (error: string) => void;
  onModeChanged?: (mode: string) => void;
  onAnchorHighlight?: (anchorId: string | null) => void;
}

export class ConnectorManager {
  private state: ConnectorState;
  private callbacks: ConnectorCallbacks;
  private nodes: Map<string, Node> = new Map();
  private anchors: Map<string, ConnectorAnchor> = new Map();
  private workspaceId: string | null = null;

  // Constants
  private readonly NODE_WIDTH = 240;
  private readonly NODE_HEIGHT = 120;
  private readonly ANCHOR_SIZE = 12;
  private readonly SNAP_DISTANCE = 25;
  private readonly ANCHOR_OFFSET = 8;

  constructor(callbacks: ConnectorCallbacks = {}) {
    this.callbacks = callbacks;
    this.state = {
      mode: 'IDLE',
      isEnabled: true,
      startNodeId: null,
      startAnchor: null,
      currentPosition: null,
      targetAnchor: null,
      previewLine: null,
      snapDistance: this.SNAP_DISTANCE,
      showAnchors: false
    };
  }

  // Initialize with workspace and nodes
  initialize(workspaceId: string, nodes: Node[]): void {
    this.workspaceId = workspaceId;
    this.updateNodes(nodes);
  }

  // Update nodes and regenerate anchors
  updateNodes(nodes: Node[]): void {
    this.nodes.clear();
    this.anchors.clear();

    nodes.forEach(node => {
      this.nodes.set(node.id, node);
      this.generateAnchorsForNode(node);
    });
  }

  // Generate connection anchors for a node
  private generateAnchorsForNode(node: Node): void {
    const anchors: ConnectorAnchor[] = [
      {
        id: `${node.id}-top`,
        nodeId: node.id,
        x: node.x + this.NODE_WIDTH / 2,
        y: node.y - this.ANCHOR_OFFSET,
        side: 'top',
        isHighlighted: false,
        isActive: false
      },
      {
        id: `${node.id}-right`,
        nodeId: node.id,
        x: node.x + this.NODE_WIDTH + this.ANCHOR_OFFSET,
        y: node.y + this.NODE_HEIGHT / 2,
        side: 'right',
        isHighlighted: false,
        isActive: false
      },
      {
        id: `${node.id}-bottom`,
        nodeId: node.id,
        x: node.x + this.NODE_WIDTH / 2,
        y: node.y + this.NODE_HEIGHT + this.ANCHOR_OFFSET,
        side: 'bottom',
        isHighlighted: false,
        isActive: false
      },
      {
        id: `${node.id}-left`,
        nodeId: node.id,
        x: node.x - this.ANCHOR_OFFSET,
        y: node.y + this.NODE_HEIGHT / 2,
        side: 'left',
        isHighlighted: false,
        isActive: false
      }
    ];

    anchors.forEach(anchor => {
      this.anchors.set(anchor.id, anchor);
    });
  }

  // Enable/disable connector system
  setEnabled(enabled: boolean): void {
    this.state.isEnabled = enabled;
    if (!enabled) {
      this.exitConnectMode();
    }
  }

  // Enter connect mode
  enterConnectMode(): void {
    if (!this.state.isEnabled) return;

    this.state.mode = 'CONNECTING';
    this.state.showAnchors = true;
    this.callbacks.onModeChanged?.('CONNECTING');
  }

  // Exit connect mode
  exitConnectMode(): void {
    this.state.mode = 'IDLE';
    this.state.showAnchors = false;
    this.state.startNodeId = null;
    this.state.startAnchor = null;
    this.state.currentPosition = null;
    this.state.targetAnchor = null;
    this.state.previewLine = null;
    this.clearAnchorHighlights();
    this.callbacks.onModeChanged?.('IDLE');
  }

  // Toggle connect mode
  toggleConnectMode(): void {
    if (this.state.mode === 'CONNECTING') {
      this.exitConnectMode();
    } else {
      this.enterConnectMode();
    }
  }

  // Handle mouse down on node (start connection)
  handleNodeMouseDown(nodeId: string, position: { x: number; y: number }): boolean {
    if (!this.state.isEnabled || this.state.mode !== 'CONNECTING') return false;

    const nearestAnchor = this.findNearestAnchor(position, nodeId);
    if (!nearestAnchor) return false;

    this.state.mode = 'DRAGGING_CONNECTION';
    this.state.startNodeId = nodeId;
    this.state.startAnchor = nearestAnchor;
    this.state.currentPosition = position;
    this.state.previewLine = {
      from: { x: nearestAnchor.x, y: nearestAnchor.y },
      to: position
    };

    // Highlight start anchor
    this.setAnchorActive(nearestAnchor.id, true);
    
    return true;
  }

  // Handle mouse move during connection drag
  handleMouseMove(position: { x: number; y: number }): void {
    if (this.state.mode !== 'DRAGGING_CONNECTION' || !this.state.startAnchor) return;

    this.state.currentPosition = position;

    // Find target anchor for snapping
    const targetAnchor = this.findNearestAnchor(position, this.state.startNodeId);
    
    // Update target anchor highlighting
    if (this.state.targetAnchor?.id !== targetAnchor?.id) {
      if (this.state.targetAnchor) {
        this.setAnchorHighlighted(this.state.targetAnchor.id, false);
      }
      if (targetAnchor) {
        this.setAnchorHighlighted(targetAnchor.id, true);
      }
      this.state.targetAnchor = targetAnchor;
      this.callbacks.onAnchorHighlight?.(targetAnchor?.id || null);
    }

    // Update preview line
    const endPosition = targetAnchor ? 
      { x: targetAnchor.x, y: targetAnchor.y } : 
      position;

    this.state.previewLine = {
      from: { x: this.state.startAnchor.x, y: this.state.startAnchor.y },
      to: endPosition
    };
  }

  // Handle mouse up (complete connection)
  async handleMouseUp(): Promise<void> {
    if (this.state.mode !== 'DRAGGING_CONNECTION') return;

    try {
      if (this.state.targetAnchor && this.state.startNodeId && this.workspaceId) {
        const targetNodeId = this.state.targetAnchor.nodeId;
        
        // Prevent self-connections
        if (targetNodeId === this.state.startNodeId) {
          this.callbacks.onConnectionFailed?.('Cannot connect node to itself');
          return;
        }

        // Create the connection
        const edgeData: EdgeCreateRequest = {
          from_node_id: this.state.startNodeId,
          to_node_id: targetNodeId,
          type: 'support', // Default type, can be changed later
          description: `Connection from ${this.nodes.get(this.state.startNodeId)?.title} to ${this.nodes.get(targetNodeId)?.title}`
        };

        const newEdge = await createEdge(this.workspaceId, edgeData);
        
        // Generate AI summary for the new connection
        this.generateAISummaryForEdge(newEdge);
        
        this.callbacks.onConnectionCreated?.(newEdge);
      }
    } catch (error) {
      console.error('Failed to create connection:', error);
      this.callbacks.onConnectionFailed?.(error instanceof Error ? error.message : 'Failed to create connection');
    } finally {
      // Reset state but stay in connecting mode
      this.state.mode = 'CONNECTING';
      this.state.startNodeId = null;
      this.state.startAnchor = null;
      this.state.currentPosition = null;
      this.state.targetAnchor = null;
      this.state.previewLine = null;
      this.clearAnchorHighlights();
      this.clearAnchorActive();
    }
  }

  // Generate AI summary for a new edge
  private async generateAISummaryForEdge(edge: Edge): Promise<void> {
    if (!this.workspaceId) return;

    try {
      const fromNode = this.nodes.get(edge.from_node_id);
      const toNode = this.nodes.get(edge.to_node_id);
      
      if (!fromNode || !toNode) return;

      await summarizeRelationship(this.workspaceId, {
        from_node_id: edge.from_node_id,
        to_node_id: edge.to_node_id,
        context: {
          from_node: fromNode,
          to_node: toNode,
          edge_description: edge.description
        }
      });
    } catch (error) {
      console.warn('Failed to generate AI summary for edge:', error);
    }
  }

  // Find nearest anchor to a position
  private findNearestAnchor(position: { x: number; y: number }, excludeNodeId?: string): ConnectorAnchor | null {
    let nearestAnchor: ConnectorAnchor | null = null;
    let minDistance = this.state.snapDistance;

    for (const anchor of this.anchors.values()) {
      if (excludeNodeId && anchor.nodeId === excludeNodeId) continue;

      const distance = Math.sqrt(
        Math.pow(anchor.x - position.x, 2) + Math.pow(anchor.y - position.y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestAnchor = anchor;
      }
    }

    return nearestAnchor;
  }

  // Set anchor highlighted state
  private setAnchorHighlighted(anchorId: string, highlighted: boolean): void {
    const anchor = this.anchors.get(anchorId);
    if (anchor) {
      anchor.isHighlighted = highlighted;
    }
  }

  // Set anchor active state
  private setAnchorActive(anchorId: string, active: boolean): void {
    const anchor = this.anchors.get(anchorId);
    if (anchor) {
      anchor.isActive = active;
    }
  }

  // Clear all anchor highlights
  private clearAnchorHighlights(): void {
    for (const anchor of this.anchors.values()) {
      anchor.isHighlighted = false;
    }
  }

  // Clear all anchor active states
  private clearAnchorActive(): void {
    for (const anchor of this.anchors.values()) {
      anchor.isActive = false;
    }
  }

  // Get current state
  getState(): ConnectorState {
    return { ...this.state };
  }

  // Get all anchors
  getAnchors(): ConnectorAnchor[] {
    return Array.from(this.anchors.values());
  }

  // Get anchors for a specific node
  getNodeAnchors(nodeId: string): ConnectorAnchor[] {
    return Array.from(this.anchors.values()).filter(anchor => anchor.nodeId === nodeId);
  }

  // Check if connector is disabled when fewer than 2 nodes
  shouldDisable(): boolean {
    return this.nodes.size < 2;
  }

  // Handle keyboard shortcuts
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.state.isEnabled) return false;

    switch (event.key) {
      case 'c':
      case 'C':
        if (!event.ctrlKey && !event.metaKey) {
          this.toggleConnectMode();
          return true;
        }
        break;
      case 'Escape':
        if (this.state.mode !== 'IDLE') {
          this.exitConnectMode();
          return true;
        }
        break;
    }

    return false;
  }

  // Update transform for coordinate conversion
  updateTransform(transform: { x: number; y: number; scale: number }): void {
    // Update anchor positions based on transform
    for (const [nodeId, node] of this.nodes.entries()) {
      this.generateAnchorsForNode(node);
    }
  }

  // Cleanup
  dispose(): void {
    this.exitConnectMode();
    this.nodes.clear();
    this.anchors.clear();
    this.workspaceId = null;
  }
}

export default ConnectorManager;