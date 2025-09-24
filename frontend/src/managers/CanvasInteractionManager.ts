import { canvasStateManager, Point, Transform, ConnectionPoint, SnapTarget } from '@/stores/canvasStore';
import { globalSpatialIndex } from '@/utils/spatialIndex';

export interface CanvasInteractionCallbacks {
  onNodePositionUpdate?: (nodeId: string, position: Point) => void;
  onTransformUpdate?: (transform: Transform) => void;
  onNodeSelect?: (nodeId: string) => void;
  onConnectionCreate?: (fromNodeId: string, toNodeId: string) => void;
  onCanvasClick?: (position: Point) => void;
}

export class CanvasInteractionManager {
  private callbacks: CanvasInteractionCallbacks;
  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private isConnecting: boolean = false;
  private dragStartPosition: Point | null = null;
  private draggedNodeId: string | null = null;
  private dragOffset: Point | null = null;
  private panStartPosition: Point | null = null;
  private panStartTransform: Transform | null = null;
  private connectionStartNodeId: string | null = null;
  private connectionStartPointId: string | null = null;
  private lastMousePosition: Point | null = null;
  private currentSnapTarget: SnapTarget | null = null;
  
  // Zoom and pan settings
  private readonly MIN_ZOOM = 0.1;
  private readonly MAX_ZOOM = 5.0;
  private readonly ZOOM_SENSITIVITY = 0.001;
  private readonly ZOOM_STEP = 0.1;
  
  // Key state tracking
  private keysPressed: Set<string> = new Set();
  
  // Marquee selection state
  private isMarqueeSelecting: boolean = false;
  private marqueeStartPosition: Point | null = null;

  constructor(callbacks: CanvasInteractionCallbacks = {}) {
    console.log('🔧 [CANVAS-DEBUG] CanvasInteractionManager initialized');
    this.callbacks = callbacks;
    this.setupKeyboardListeners();
  }

  // Handle mouse down events
  handleMouseDown(event: MouseEvent, nodeId?: string): void {
    console.log('🔧 [CANVAS-DEBUG] handleMouseDown called', { nodeId, button: event.button });
    
    // CRITICAL FIX: Only preventDefault for non-passive events
    try {
      event.preventDefault();
      console.log('🔧 [CANVAS-DEBUG] preventDefault successful');
    } catch (error) {
      console.warn('🔧 [CANVAS-DEBUG] preventDefault failed (passive listener):', error);
    }
    
    const position = { x: event.clientX, y: event.clientY };
    this.lastMousePosition = position;

    if (nodeId) {
      this.handleNodeMouseDown(event, nodeId);
    } else {
      this.handleCanvasMouseDown(event);
    }
  }

  // Handle wheel events for zooming
  handleWheel(event: WheelEvent): void {
    console.log('🔧 [CANVAS-DEBUG] handleWheel called');
    
    // CRITICAL FIX: Only preventDefault for non-passive events
    try {
      event.preventDefault();
      console.log('🔧 [CANVAS-DEBUG] wheel preventDefault successful');
    } catch (error) {
      console.warn('🔧 [CANVAS-DEBUG] wheel preventDefault failed (passive listener):', error);
    }
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const centerX = event.clientX - rect.left;
    const centerY = event.clientY - rect.top;
    
    // Normalize wheel delta for consistent behavior across browsers
    const delta = -event.deltaY * this.ZOOM_SENSITIVITY;
    
    this.handleZoomSmooth(delta, centerX, centerY);
  }

  // Smooth zoom implementation
  private handleZoomSmooth(delta: number, centerX: number, centerY: number): void {
    const state = canvasStateManager.getState();
    const currentScale = state.transform.scale;
    
    // Calculate new scale with smooth increments
    let newScale: number;
    if (delta > 0) {
      newScale = Math.min(this.MAX_ZOOM, currentScale * (1 + Math.abs(delta)));
    } else {
      newScale = Math.max(this.MIN_ZOOM, currentScale * (1 - Math.abs(delta)));
    }
    
    // Only update if scale actually changes
    if (Math.abs(newScale - currentScale) < 0.001) return;
    
    // Calculate zoom center in canvas coordinates
    const canvasX = (centerX - state.transform.x) / currentScale;
    const canvasY = (centerY - state.transform.y) / currentScale;
    
    // Calculate new transform to keep zoom centered on cursor
    const newX = centerX - canvasX * newScale;
    const newY = centerY - canvasY * newScale;
    
    const newTransform: Transform = {
      x: newX,
      y: newY,
      scale: newScale,
    };

    canvasStateManager.updateTransform(newTransform);
    this.callbacks.onTransformUpdate?.(newTransform);
  }

  // Handle node mouse down
  private handleNodeMouseDown(event: MouseEvent, nodeId: string): void {
    const state = canvasStateManager.getState();
    const position = { x: event.clientX, y: event.clientY };

    // Check if we're clicking near a connection point for drag-to-connect
    const connectionPoint = this.findConnectionPointNearMouse(position, nodeId);
    
    if (connectionPoint) {
      // Start connection drag from this connection point
      this.startConnectionDragFromPoint(nodeId, connectionPoint.id, position);
    } else if (state.interaction.mode === 'CONNECTING') {
      // Start connection drag from node center
      this.startConnectionDrag(nodeId, position);
    } else {
      // Check if we're near an existing edge endpoint for detachment
      const detachableEdge = canvasStateManager.findDetachableEdge(position.x, position.y);
      if (detachableEdge) {
        this.startConnectionDetachment(detachableEdge, position);
      } else {
        // Start node drag
        this.startNodeDrag(nodeId, position);
      }
    }

    // Handle node selection with multi-select support
    this.handleNodeSelection(nodeId, event);
  }

  // Handle canvas mouse down
  private handleCanvasMouseDown(event: MouseEvent): void {
    const state = canvasStateManager.getState();
    const position = { x: event.clientX, y: event.clientY };

    if (state.interaction.mode === 'CONNECTING') {
      // Cancel connection mode
      this.cancelConnection();
    } else if (this.shouldStartPanning(event)) {
      // Start panning if spacebar is held or middle mouse button
      this.startPanning(position);
    } else if (event.button === 0 && !this.keysPressed.has('Shift')) {
      // Clear selection if clicking on empty canvas without Shift
      canvasStateManager.clearSelection();
      
      // Start marquee selection if not holding any modifier keys
      if (!this.keysPressed.has(' ')) {
        this.startMarqueeSelection(position);
      }
    }
  }

  // Check if panning should start based on input method
  private shouldStartPanning(event: MouseEvent): boolean {
    // Middle mouse button (button 1)
    if (event.button === 1) return true;
    
    // Left mouse button with spacebar held
    if (event.button === 0 && this.keysPressed.has(' ')) return true;
    
    return false;
  }

  // Start node dragging
  private startNodeDrag(nodeId: string, startPosition: Point): void {
    const state = canvasStateManager.getState();
    const node = state.nodes.get(nodeId);
    
    if (!node) return;

    this.isDragging = true;
    this.draggedNodeId = nodeId;
    this.dragStartPosition = startPosition;
    
    // Calculate offset from mouse to node center
    this.dragOffset = {
      x: startPosition.x - (node.screenX + 120), // NODE_WIDTH / 2
      y: startPosition.y - (node.screenY + 60),  // NODE_HEIGHT / 2
    };

    // Update interaction state
    canvasStateManager.updateInteraction({
      mode: 'DRAGGING_NODE',
      draggedNodeId: nodeId,
      dragStartPosition: startPosition,
      dragCurrentPosition: startPosition,
    });

    // Attach global listeners
    this.attachGlobalListeners();
  }

  // Start canvas panning
  private startPanning(startPosition: Point): void {
    const state = canvasStateManager.getState();
    
    this.isPanning = true;
    this.panStartPosition = startPosition;
    this.panStartTransform = { ...state.transform };

    // Update interaction state
    canvasStateManager.updateInteraction({
      mode: 'PANNING',
    });

    // Attach global listeners
    this.attachGlobalListeners();
  }

  // Find connection point near mouse position
  private findConnectionPointNearMouse(mousePosition: Point, nodeId: string): ConnectionPoint | null {
    const connectionPoints = canvasStateManager.generateConnectionPoints(nodeId);
    const threshold = 25; // pixels
    
    for (const point of connectionPoints) {
      // Convert canvas coordinates to screen coordinates
      const state = canvasStateManager.getState();
      const screenX = point.x * state.transform.scale + state.transform.x;
      const screenY = point.y * state.transform.scale + state.transform.y;
      
      const distance = Math.sqrt(
        Math.pow(mousePosition.x - screenX, 2) + Math.pow(mousePosition.y - screenY, 2)
      );
      
      if (distance <= threshold) {
        return point;
      }
    }
    
    return null;
  }

  // Start connection drag from a specific connection point
  private startConnectionDragFromPoint(nodeId: string, connectionPointId: string, startPosition: Point): void {
    this.isConnecting = true;
    this.connectionStartNodeId = nodeId;
    this.connectionStartPointId = connectionPointId;

    // Update interaction state
    canvasStateManager.updateInteraction({
      mode: 'DRAGGING_CONNECTION',
      connectionDragContext: {
        startNodeId: nodeId,
        startConnectionPointId: connectionPointId,
        startPosition,
        currentPosition: startPosition,
        isActive: true,
        snapTarget: null,
        previewLine: {
          from: startPosition,
          to: startPosition,
        },
      },
    });

    // Attach global listeners
    this.attachGlobalListeners();
  }

  // Start connection drag (legacy method for backward compatibility)
  private startConnectionDrag(nodeId: string, startPosition: Point): void {
    // Find the nearest connection point to the mouse
    const connectionPoint = this.findConnectionPointNearMouse(startPosition, nodeId);
    const connectionPointId = connectionPoint?.id || `${nodeId}-center`;
    
    this.startConnectionDragFromPoint(nodeId, connectionPointId, startPosition);
  }

  // Start connection detachment
  private startConnectionDetachment(detachableEdge: { edgeId: string; end: 'from' | 'to' }, startPosition: Point): void {
    const state = canvasStateManager.getState();
    const edge = state.edges.get(detachableEdge.edgeId);
    
    if (!edge) return;

    this.isConnecting = true;
    
    // Set up detachment context
    canvasStateManager.updateInteraction({
      mode: 'DRAGGING_CONNECTION',
      detachingConnection: {
        edgeId: detachableEdge.edgeId,
        fromNodeId: edge.from_node_id,
        toNodeId: edge.to_node_id,
        detachEnd: detachableEdge.end,
      },
      connectionDragContext: {
        startNodeId: detachableEdge.end === 'from' ? edge.to_node_id : edge.from_node_id,
        startConnectionPointId: `${detachableEdge.end === 'from' ? edge.to_node_id : edge.from_node_id}-center`,
        startPosition,
        currentPosition: startPosition,
        isActive: true,
        snapTarget: null,
        previewLine: {
          from: startPosition,
          to: startPosition,
        },
      },
    });

    // Attach global listeners
    this.attachGlobalListeners();
  }

  // Handle mouse move
  private handleMouseMove = (event: MouseEvent): void => {
    const position = { x: event.clientX, y: event.clientY };
    this.lastMousePosition = position;

    if (this.isDragging && this.draggedNodeId && this.dragStartPosition && this.dragOffset) {
      this.updateNodeDrag(position);
    } else if (this.isPanning && this.panStartPosition && this.panStartTransform) {
      this.updatePanning(position);
    } else if (this.isConnecting) {
      this.updateConnectionDrag(position);
    } else if (this.isMarqueeSelecting && this.marqueeStartPosition) {
      this.updateMarqueeSelection(position);
    } else {
      // Handle hover effects when not actively interacting
      this.updateHoverStates(position);
    }
  };

  // Update hover states for nodes, edges, and connection points
  private updateHoverStates(position: Point): void {
    const state = canvasStateManager.getState();
    
    // Check for hovered nodes
    let hoveredNodeId: string | null = null;
    let hoveredEdgeId: string | null = null;
    let hoveredPointId: string | null = null;
    
    // Check nodes first
    for (const node of state.nodes.values()) {
      if (node.isVisible) {
        const canvasX = (position.x - state.transform.x) / state.transform.scale;
        const canvasY = (position.y - state.transform.y) / state.transform.scale;
        
        if (canvasX >= node.x && canvasX <= node.x + 240 &&
            canvasY >= node.y && canvasY <= node.y + 120) {
          hoveredNodeId = node.id;
          break;
        }
        
        // Check connection points if not hovering over node body
        const connectionPoint = this.findConnectionPointNearMouse(position, node.id);
        if (connectionPoint) {
          hoveredPointId = connectionPoint.id;
        }
      }
    }
    
    // Check edges if not hovering over a node
    if (!hoveredNodeId) {
      hoveredEdgeId = this.findHoveredEdge(position);
    }
    
    // Update hover states
    canvasStateManager.updateNodeHover(hoveredNodeId);
    canvasStateManager.updateEdgeHover(hoveredEdgeId);
    canvasStateManager.updateConnectionPointHover(hoveredPointId);
    
    // Update cursor based on hover state
    if (hoveredPointId) {
      document.body.style.cursor = 'crosshair';
    } else if (hoveredNodeId) {
      document.body.style.cursor = 'pointer';
    } else if (hoveredEdgeId) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = '';
    }
  }

  // Update node drag
  private updateNodeDrag(currentPosition: Point): void {
    if (!this.draggedNodeId || !this.dragStartPosition) return;

    // Update interaction state with current position
    canvasStateManager.updateInteraction({
      dragCurrentPosition: currentPosition,
    });

    // The canvas state manager will automatically update node positions
    // and connected edges in real-time
  }

  // Update panning
  private updatePanning(currentPosition: Point): void {
    if (!this.panStartPosition || !this.panStartTransform) return;

    const deltaX = currentPosition.x - this.panStartPosition.x;
    const deltaY = currentPosition.y - this.panStartPosition.y;

    const newTransform: Transform = {
      x: this.panStartTransform.x + deltaX,
      y: this.panStartTransform.y + deltaY,
      scale: this.panStartTransform.scale,
    };

    // Update transform immediately
    canvasStateManager.updateTransform(newTransform);
    this.callbacks.onTransformUpdate?.(newTransform);
  }

  // Update connection drag
  private updateConnectionDrag(currentPosition: Point): void {
    const state = canvasStateManager.getState();
    const dragContext = state.interaction.connectionDragContext;
    
    if (!dragContext) return;

    // Find nearest snap target
    const snapTarget = canvasStateManager.findNearestConnectionPoint(
      currentPosition.x,
      currentPosition.y,
      dragContext.startNodeId
    );

    // Update hover state for connection points
    const hoveredPointId = snapTarget?.connectionPoint.id || null;
    canvasStateManager.updateConnectionPointHover(hoveredPointId);

    // Update current snap target
    this.currentSnapTarget = snapTarget;

    // Calculate preview line end position
    let previewEndPosition = currentPosition;
    if (snapTarget) {
      // Snap to the connection point
      const snapPoint = snapTarget.connectionPoint;
      previewEndPosition = {
        x: snapPoint.x * state.transform.scale + state.transform.x,
        y: snapPoint.y * state.transform.scale + state.transform.y,
      };
    }

    // Update connection drag context
    canvasStateManager.updateInteraction({
      connectionDragContext: {
        ...dragContext,
        currentPosition,
        snapTarget,
        previewLine: {
          from: dragContext.startPosition,
          to: previewEndPosition,
        },
      },
    });

    // Update cursor based on snap state
    document.body.style.cursor = snapTarget ? 'crosshair' : 'grabbing';
  }

  // Handle mouse up
  private handleMouseUp = (event: MouseEvent): void => {
    const position = { x: event.clientX, y: event.clientY };

    if (this.isDragging) {
      this.endNodeDrag(position);
    } else if (this.isPanning) {
      this.endPanning();
    } else if (this.isConnecting) {
      this.endConnectionDrag(event);
    } else if (this.isMarqueeSelecting) {
      this.endMarqueeSelection();
    }

    this.detachGlobalListeners();
  };

  // End node drag
  private endNodeDrag(endPosition: Point): void {
    if (!this.draggedNodeId || !this.dragStartPosition) return;

    const state = canvasStateManager.getState();
    const node = state.nodes.get(this.draggedNodeId);
    
    if (node) {
      // Calculate final canvas position
      const deltaX = endPosition.x - this.dragStartPosition.x;
      const deltaY = endPosition.y - this.dragStartPosition.y;
      
      const finalCanvasPosition = {
        x: node.x + (deltaX / state.transform.scale),
        y: node.y + (deltaY / state.transform.scale),
      };

      // Notify callback for persistence
      this.callbacks.onNodePositionUpdate?.(this.draggedNodeId, finalCanvasPosition);
    }

    // Reset drag state
    this.isDragging = false;
    this.draggedNodeId = null;
    this.dragStartPosition = null;
    this.dragOffset = null;

    // Update interaction state
    canvasStateManager.updateInteraction({
      mode: 'IDLE',
      draggedNodeId: null,
      dragStartPosition: null,
      dragCurrentPosition: null,
    });
  }

  // End panning
  private endPanning(): void {
    this.isPanning = false;
    this.panStartPosition = null;
    this.panStartTransform = null;

    // Update interaction state
    canvasStateManager.updateInteraction({
      mode: 'IDLE',
    });
  }

  // End connection drag
  private endConnectionDrag(event: MouseEvent): void {
    const state = canvasStateManager.getState();
    const dragContext = state.interaction.connectionDragContext;
    const detachingConnection = state.interaction.detachingConnection;
    
    if (!dragContext) return;

    // Check if we have a valid snap target
    if (this.currentSnapTarget) {
      const targetNodeId = this.currentSnapTarget.connectionPoint.nodeId;
      
      if (targetNodeId !== dragContext.startNodeId) {
        if (detachingConnection) {
          // Handle connection detachment and reattachment
          this.handleConnectionDetachmentEnd(detachingConnection, targetNodeId);
        } else {
          // Create new connection
          this.callbacks.onConnectionCreate?.(dragContext.startNodeId, targetNodeId);
        }
      }
    } else if (detachingConnection) {
      // If detaching and no snap target, delete the connection
      this.handleConnectionDeletion(detachingConnection.edgeId);
    }

    // Reset connection state
    this.isConnecting = false;
    this.connectionStartNodeId = null;
    this.connectionStartPointId = null;
    this.currentSnapTarget = null;

    // Clear hover state
    canvasStateManager.updateConnectionPointHover(null);

    // Reset cursor
    document.body.style.cursor = '';

    // Update interaction state
    canvasStateManager.updateInteraction({
      mode: 'IDLE',
      connectionDragContext: null,
      detachingConnection: null,
    });
  }

  // Handle connection detachment end
  private handleConnectionDetachmentEnd(detachingConnection: any, newTargetNodeId: string): void {
    // This would typically involve API calls to update the edge
    // For now, we'll use the callback system
    if (detachingConnection.detachEnd === 'from') {
      // Reattach the 'from' end to the new target
      this.callbacks.onConnectionCreate?.(newTargetNodeId, detachingConnection.toNodeId);
    } else {
      // Reattach the 'to' end to the new target
      this.callbacks.onConnectionCreate?.(detachingConnection.fromNodeId, newTargetNodeId);
    }
    
    // Delete the old connection
    this.handleConnectionDeletion(detachingConnection.edgeId);
  }

  // Handle connection deletion
  private handleConnectionDeletion(edgeId: string): void {
    // This would typically involve an API call to delete the edge
    // For now, we'll emit a custom event or use a callback if available
    console.log('Connection deleted:', edgeId);
    // TODO: Add callback for edge deletion
  }

  // Find node under mouse position using spatial index
  private findNodeUnderMouse(event: MouseEvent): string | null {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    
    const state = canvasStateManager.getState();
    const canvasX = (screenX - state.transform.x) / state.transform.scale;
    const canvasY = (screenY - state.transform.y) / state.transform.scale;
    
    const nearbyNodes = globalSpatialIndex.findNodesNearPoint(canvasX, canvasY, 10);
    return nearbyNodes.length > 0 ? nearbyNodes[0].id : null;
  }

  // Start connecting mode
  startConnecting(): void {
    canvasStateManager.updateInteraction({
      mode: 'CONNECTING',
      connectionStart: null,
    });
  }

  // Cancel connection
  cancelConnection(): void {
    this.isConnecting = false;
    this.connectionStartNodeId = null;

    canvasStateManager.updateInteraction({
      mode: 'IDLE',
      connectionStart: null,
      connectionDragContext: null,
    });
  }

  // Handle zoom (legacy method for button-based zoom)
  handleZoom(delta: number, centerX: number, centerY: number): void {
    const zoomDelta = delta > 0 ? this.ZOOM_STEP : -this.ZOOM_STEP;
    this.handleZoomSmooth(zoomDelta, centerX, centerY);
  }

  // Setup keyboard event listeners
  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown, { passive: true });
    document.addEventListener('keyup', this.handleKeyUp, { passive: true });
  }

  // Handle key down events
  private handleKeyDown = (event: KeyboardEvent): void => {
    this.keysPressed.add(event.key);
    
    // Change cursor when spacebar is held
    if (event.key === ' ') {
      document.body.style.cursor = 'grab';
    }
    
    // Cancel connection on Escape
    if (event.key === 'Escape' && this.isConnecting) {
      this.cancelConnection();
    }
  };

  // Handle key up events
  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keysPressed.delete(event.key);
    
    // Reset cursor when spacebar is released
    if (event.key === ' ') {
      document.body.style.cursor = '';
    }
  };

  // Attach global event listeners
  private attachGlobalListeners(): void {
    console.log('🔧 [CANVAS-DEBUG] Attaching global listeners');
    
    // CRITICAL FIX: Use proper event listener options to avoid passive conflicts
    try {
      document.addEventListener('mousemove', this.handleMouseMove, {
        passive: false,
        capture: false
      });
      document.addEventListener('mouseup', this.handleMouseUp, {
        passive: false,
        capture: false
      });
      console.log('🔧 [CANVAS-DEBUG] Global listeners attached successfully');
    } catch (error) {
      console.error('🔧 [CANVAS-DEBUG] Failed to attach global listeners:', error);
      // Fallback to passive listeners if non-passive fails
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    }
  }

  // Detach global event listeners
  private detachGlobalListeners(): void {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  // Get current interaction mode
  getCurrentMode(): string {
    return canvasStateManager.getState().interaction.mode;
  }

  // Check if currently dragging
  isDraggingNode(): boolean {
    return this.isDragging;
  }

  // Get dragged node ID
  getDraggedNodeId(): string | null {
    return this.draggedNodeId;
  }

  // Handle node selection with multi-select support
  private handleNodeSelection(nodeId: string, event: MouseEvent): void {
    const state = canvasStateManager.getState();
    
    if (event.shiftKey) {
      // Multi-select: toggle node selection
      canvasStateManager.toggleNodeSelection(nodeId);
    } else {
      // Single select: replace selection
      canvasStateManager.updateNodeSelection([nodeId], true);
    }
    
    // Call the callback for the primary selected node
    this.callbacks.onNodeSelect?.(nodeId);
  }

  // Start marquee selection
  private startMarqueeSelection(position: Point): void {
    this.isMarqueeSelecting = true;
    this.marqueeStartPosition = position;
    canvasStateManager.startMarqueeSelection(position);
    this.attachGlobalListeners();
  }

  // Update marquee selection
  private updateMarqueeSelection(position: Point): void {
    if (this.marqueeStartPosition) {
      canvasStateManager.updateMarqueeSelection(position);
    }
  }

  // End marquee selection
  private endMarqueeSelection(): void {
    this.isMarqueeSelecting = false;
    this.marqueeStartPosition = null;
    canvasStateManager.endMarqueeSelection();
  }

  // Find hovered edge using spatial index
  private findHoveredEdge(position: Point): string | null {
    const state = canvasStateManager.getState();
    const canvasX = (position.x - state.transform.x) / state.transform.scale;
    const canvasY = (position.y - state.transform.y) / state.transform.scale;
    const threshold = 8; // pixels in canvas coordinates
    
    const nearbyEdges = globalSpatialIndex.findEdgesNearPoint(canvasX, canvasY, threshold);
    return nearbyEdges.length > 0 ? nearbyEdges[0].id : null;
  }

  // Calculate distance from point to line segment
  private distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) {
      return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
  }

  // Cleanup
  dispose(): void {
    // Ensure all listeners are removed
    this.detachGlobalListeners();
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    
    // Reset cursor
    document.body.style.cursor = '';
    
    // Clear all state
    this.isDragging = false;
    this.isPanning = false;
    this.isConnecting = false;
    this.isMarqueeSelecting = false;
    this.draggedNodeId = null;
    this.connectionStartNodeId = null;
    this.connectionStartPointId = null;
    this.dragStartPosition = null;
    this.dragOffset = null;
    this.panStartPosition = null;
    this.panStartTransform = null;
    this.marqueeStartPosition = null;
    this.currentSnapTarget = null;
    this.lastMousePosition = null;
    this.keysPressed.clear();
    
    // Clear canvas state
    canvasStateManager.updateConnectionPointHover(null);
    canvasStateManager.updateNodeHover(null);
    canvasStateManager.updateEdgeHover(null);
    canvasStateManager.clearSelection();
    
    // Reset interaction state to idle
    canvasStateManager.updateInteraction({
      mode: 'IDLE',
      draggedNodeId: null,
      dragStartPosition: null,
      dragCurrentPosition: null,
      connectionStart: null,
      connectionDragContext: null,
      hoveredConnectionPoint: null,
      hoveredNodeId: null,
      hoveredEdgeId: null,
      marqueeSelection: null,
      detachingConnection: null,
    });
  }
}