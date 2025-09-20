export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface DragContext {
  nodeId: string;
  nodeType: 'ai' | 'human';
  startPosition: Point;
  currentPosition: Point;
  offset: Point;
  initialNodePosition: Point;
  preserveConnections: boolean;
}

export interface PanContext {
  startPosition: Point;
  initialTransform: Transform;
}

export interface NodeInteractionContext {
  nodeId: string;
  nodeType: 'ai' | 'human';
  isFromChat: boolean;
  hasTooltip: boolean;
  isEditable: boolean;
}

export type InteractionMode = 'IDLE' | 'DRAGGING_NODE' | 'PANNING' | 'CONNECTING' | 'CREATING_NODE';

export class InteractionManager {
  private mode: InteractionMode = 'IDLE';
  private dragContext: DragContext | null = null;
  private panContext: PanContext | null = null;
  private connectionStart: string | null = null;
  private currentTransform: Transform = { x: 0, y: 0, scale: 1 };
  
  // Event callbacks
  private onNodePositionUpdate?: (nodeId: string, position: Point) => void;
  private onTransformUpdate?: (transform: Transform) => void;
  private onStateChange?: (mode: InteractionMode, data: any) => void;
  private onNodeSelect?: (nodeId: string) => void;
  
  constructor(
    onNodePositionUpdate?: (nodeId: string, position: Point) => void,
    onTransformUpdate?: (transform: Transform) => void,
    onStateChange?: (mode: InteractionMode, data: any) => void,
    onNodeSelect?: (nodeId: string) => void
  ) {
    this.onNodePositionUpdate = onNodePositionUpdate;
    this.onTransformUpdate = onTransformUpdate;
    this.onStateChange = onStateChange;
    this.onNodeSelect = onNodeSelect;
  }
  
  // Update current transform for coordinate calculations
  public updateTransform(transform: Transform): void {
    this.currentTransform = transform;
  }
  
  // Main event handlers
  public handleMouseDown(event: MouseEvent, target: 'canvas' | 'node', nodeId?: string, nodeType?: 'ai' | 'human'): void {
    console.log('🎯 [InteractionManager] handleMouseDown', { 
      target, 
      nodeId, 
      nodeType,
      mode: this.mode,
      clientX: event.clientX,
      clientY: event.clientY
    });
    
    // Priority 1: Check for tooltip interactions
    if (this.isTooltipInteraction(event)) {
      console.log('🎯 [InteractionManager] Tooltip interaction detected - ignoring');
      return;
    }
    
    // Priority 2: Check for node editing interactions
    if (this.isNodeEditingInteraction(event)) {
      console.log('🎯 [InteractionManager] Node editing interaction detected - ignoring');
      return;
    }
    
    // Priority 3: Handle Ctrl+click for connection mode
    if (event.ctrlKey && target === 'node' && nodeId) {
      event.preventDefault();
      event.stopPropagation();
      this.handleConnectionClick(nodeId);
      return;
    }
    
    // Priority 4: Handle based on current mode and target
    switch (this.mode) {
      case 'IDLE':
        if (target === 'canvas') {
          event.preventDefault();
          this.startCanvasPan(event);
        } else if (target === 'node' && nodeId && nodeType) {
          event.preventDefault();
          event.stopPropagation();
          this.startNodeDrag(event, nodeId, nodeType);
        }
        break;
        
      case 'CONNECTING':
        if (target === 'node' && nodeId) {
          event.preventDefault();
          event.stopPropagation();
          this.handleConnectionClick(nodeId);
        }
        break;
        
      case 'CREATING_NODE':
        // During node creation, ignore all interactions
        console.log('🎯 [InteractionManager] Node creation in progress - ignoring interaction');
        break;
        
      default:
        console.log('🎯 [InteractionManager] Ignoring mousedown in mode:', this.mode);
        break;
    }
  }
  
  public handleMouseMove(event: MouseEvent): void {
    const currentPos = { x: event.clientX, y: event.clientY };
    
    switch (this.mode) {
      case 'DRAGGING_NODE':
        this.updateNodeDrag(currentPos);
        break;
        
      case 'PANNING':
        this.updateCanvasPan(currentPos);
        break;
    }
  }
  
  public handleMouseUp(event: MouseEvent): void {
    console.log('🎯 [InteractionManager] handleMouseUp', { mode: this.mode });
    
    switch (this.mode) {
      case 'DRAGGING_NODE':
        this.endNodeDrag();
        break;
        
      case 'PANNING':
        this.endCanvasPan();
        break;
    }
  }
  
  // Interaction detection methods
  private isTooltipInteraction(event: MouseEvent): boolean {
    const target = event.target as HTMLElement;
    return !!(
      target.closest('.tooltip') || 
      target.closest('[data-tooltip]') ||
      target.closest('.node-tooltip') ||
      target.closest('[data-state="open"]') || // Radix UI tooltip
      target.closest('[role="tooltip"]')
    );
  }
  
  private isNodeEditingInteraction(event: MouseEvent): boolean {
    const target = event.target as HTMLElement;
    return !!(
      target.closest('.node-edit-button') ||
      target.closest('.node-summary-edit') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('button') ||
      target.closest('[contenteditable]')
    );
  }
  
  // Node dragging methods
  private startNodeDrag(event: MouseEvent, nodeId: string, nodeType: 'ai' | 'human'): void {
    console.log('🎯 [InteractionManager] Starting node drag', { nodeId, nodeType });
    
    const nodeElement = document.getElementById(`node-${nodeId}`);
    if (!nodeElement) {
      console.error('🎯 [InteractionManager] Node element not found:', nodeId);
      return;
    }
    
    const rect = nodeElement.getBoundingClientRect();
    const startPosition = { x: event.clientX, y: event.clientY };
    const offset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Get current node position from computed style
    const computedStyle = window.getComputedStyle(nodeElement);
    const currentLeft = parseFloat(computedStyle.left) || 0;
    const currentTop = parseFloat(computedStyle.top) || 0;
    
    // Convert screen coordinates to canvas coordinates
    const initialNodePosition = this.screenToCanvas(currentLeft, currentTop);
    
    this.dragContext = {
      nodeId,
      nodeType,
      startPosition,
      currentPosition: startPosition,
      offset,
      initialNodePosition,
      preserveConnections: true
    };
    
    this.mode = 'DRAGGING_NODE';
    this.onStateChange?.(this.mode, this.dragContext);
    this.onNodeSelect?.(nodeId);
    
    // Add visual feedback
    nodeElement.style.zIndex = '1000';
    nodeElement.style.opacity = '0.8';
    nodeElement.style.transform = 'scale(1.05)';
    nodeElement.style.cursor = 'grabbing';
    
    console.log('🎯 [InteractionManager] Node drag started successfully', {
      nodeId,
      nodeType,
      initialNodePosition,
      offset
    });
  }
  
  private updateNodeDrag(currentPosition: Point): void {
    if (!this.dragContext) return;
    
    this.dragContext.currentPosition = currentPosition;
    
    // Calculate movement delta
    const deltaX = currentPosition.x - this.dragContext.startPosition.x;
    const deltaY = currentPosition.y - this.dragContext.startPosition.y;
    
    // Apply transform scaling to delta
    const scaledDeltaX = deltaX / this.currentTransform.scale;
    const scaledDeltaY = deltaY / this.currentTransform.scale;
    
    // Calculate new canvas position
    const newCanvasPosition = {
      x: this.dragContext.initialNodePosition.x + scaledDeltaX,
      y: this.dragContext.initialNodePosition.y + scaledDeltaY
    };
    
    // Convert back to screen coordinates for DOM update
    const newScreenPosition = this.canvasToScreen(newCanvasPosition.x, newCanvasPosition.y);
    
    // Update DOM element position immediately for smooth visual feedback
    const nodeElement = document.getElementById(`node-${this.dragContext.nodeId}`);
    if (nodeElement) {
      nodeElement.style.left = `${newScreenPosition.x}px`;
      nodeElement.style.top = `${newScreenPosition.y}px`;
    }
    
    console.log('🎯 [InteractionManager] Node drag updated', {
      nodeId: this.dragContext.nodeId,
      canvasPosition: newCanvasPosition,
      screenPosition: newScreenPosition
    });
  }
  
  private endNodeDrag(): void {
    if (!this.dragContext) return;
    
    console.log('🎯 [InteractionManager] Ending node drag', { nodeId: this.dragContext.nodeId });
    
    // Calculate final canvas position
    const deltaX = this.dragContext.currentPosition.x - this.dragContext.startPosition.x;
    const deltaY = this.dragContext.currentPosition.y - this.dragContext.startPosition.y;
    
    const scaledDeltaX = deltaX / this.currentTransform.scale;
    const scaledDeltaY = deltaY / this.currentTransform.scale;
    
    const finalCanvasPosition = {
      x: this.dragContext.initialNodePosition.x + scaledDeltaX,
      y: this.dragContext.initialNodePosition.y + scaledDeltaY
    };
    
    // Reset visual feedback
    const nodeElement = document.getElementById(`node-${this.dragContext.nodeId}`);
    if (nodeElement) {
      nodeElement.style.zIndex = '20';
      nodeElement.style.opacity = '1';
      nodeElement.style.transform = 'scale(1)';
      nodeElement.style.cursor = 'grab';
    }
    
    // Notify parent component to save position
    this.onNodePositionUpdate?.(this.dragContext.nodeId, finalCanvasPosition);
    
    console.log('🎯 [InteractionManager] Node drag completed', {
      nodeId: this.dragContext.nodeId,
      finalPosition: finalCanvasPosition
    });
    
    this.dragContext = null;
    this.mode = 'IDLE';
    this.onStateChange?.(this.mode, null);
  }
  
  // Canvas panning methods
  private startCanvasPan(event: MouseEvent): void {
    console.log('🎯 [InteractionManager] Starting canvas pan');
    
    const startPosition = { x: event.clientX, y: event.clientY };
    
    this.panContext = {
      startPosition,
      initialTransform: { ...this.currentTransform }
    };
    
    this.mode = 'PANNING';
    this.onStateChange?.(this.mode, this.panContext);
  }
  
  private updateCanvasPan(currentPosition: Point): void {
    if (!this.panContext) return;
    
    const deltaX = currentPosition.x - this.panContext.startPosition.x;
    const deltaY = currentPosition.y - this.panContext.startPosition.y;
    
    const newTransform = {
      ...this.panContext.initialTransform,
      x: this.panContext.initialTransform.x + deltaX,
      y: this.panContext.initialTransform.y + deltaY
    };
    
    this.currentTransform = newTransform;
    this.onTransformUpdate?.(newTransform);
  }
  
  private endCanvasPan(): void {
    console.log('🎯 [InteractionManager] Ending canvas pan');
    
    this.panContext = null;
    this.mode = 'IDLE';
    this.onStateChange?.(this.mode, null);
  }
  
  // Connection methods
  private handleConnectionClick(nodeId: string): void {
    console.log('🎯 [InteractionManager] Connection click', { nodeId, connectionStart: this.connectionStart });
    
    if (this.connectionStart && this.connectionStart !== nodeId) {
      // Complete connection
      console.log('🎯 [InteractionManager] Completing connection', {
        from: this.connectionStart,
        to: nodeId
      });
      // This would trigger connection creation in the parent component
      this.connectionStart = null;
      this.mode = 'IDLE';
      this.onStateChange?.(this.mode, null);
    } else if (!this.connectionStart) {
      // Start connection
      this.connectionStart = nodeId;
      this.mode = 'CONNECTING';
      this.onStateChange?.(this.mode, { connectionStart: nodeId });
    }
  }
  
  // Coordinate conversion helpers
  private screenToCanvas(screenX: number, screenY: number): Point {
    return {
      x: (screenX - this.currentTransform.x) / this.currentTransform.scale,
      y: (screenY - this.currentTransform.y) / this.currentTransform.scale
    };
  }
  
  private canvasToScreen(canvasX: number, canvasY: number): Point {
    return {
      x: canvasX * this.currentTransform.scale + this.currentTransform.x,
      y: canvasY * this.currentTransform.scale + this.currentTransform.y
    };
  }
  
  // Public methods for external control
  public getCurrentMode(): InteractionMode {
    return this.mode;
  }
  
  public getDragContext(): DragContext | null {
    return this.dragContext;
  }
  
  public startConnecting(): void {
    this.mode = 'CONNECTING';
    this.connectionStart = null;
    this.onStateChange?.(this.mode, null);
  }
  
  public cancelInteraction(): void {
    console.log('🎯 [InteractionManager] Cancelling interaction');
    
    // Reset visual feedback if dragging
    if (this.dragContext) {
      const nodeElement = document.getElementById(`node-${this.dragContext.nodeId}`);
      if (nodeElement) {
        nodeElement.style.zIndex = '20';
        nodeElement.style.opacity = '1';
        nodeElement.style.transform = 'scale(1)';
        nodeElement.style.cursor = 'grab';
      }
    }
    
    this.mode = 'IDLE';
    this.dragContext = null;
    this.panContext = null;
    this.connectionStart = null;
    this.onStateChange?.(this.mode, null);
  }
  
  // Method to temporarily disable interactions during node creation
  public setCreationMode(isCreating: boolean): void {
    if (isCreating) {
      this.mode = 'CREATING_NODE';
      console.log('🎯 [InteractionManager] Entering creation mode');
    } else {
      this.mode = 'IDLE';
      console.log('🎯 [InteractionManager] Exiting creation mode');
    }
    this.onStateChange?.(this.mode, null);
  }
  
  // Method to handle new nodes added from chat
  public onNodeAddedFromChat(nodeId: string, nodeType: 'ai' | 'human'): void {
    console.log(`🎯 [InteractionManager] New ${nodeType} node added from chat: ${nodeId}`);
    // Ensure the new node is immediately available for interaction
    this.setCreationMode(false);
  }
  
  // Method to get connection start for UI feedback
  public getConnectionStart(): string | null {
    return this.connectionStart;
  }
}