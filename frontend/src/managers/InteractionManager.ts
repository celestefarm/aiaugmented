
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
  realTimeCanvasPosition?: Point; // For accurate final positioning
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
  
  // IMMEDIATE RESPONSE: Simplified timing and animation management
  private lastMouseMoveTime: number = 0;
  private mouseMoveCount: number = 0;
  private dragStartTime: number = 0;
  private coordinateHistory: Array<{timestamp: number, screen: Point, canvas: Point}> = [];
  
  // HYBRID SMOOTHNESS: Advanced animation frame management
  private animationFrameId: number | null = null;
  private lastBackendUpdate: number = 0;
  private backendUpdateInterval: number = 100; // Update backend every 100ms during drag
  
  // ULTRA-PREMIUM: Multi-layer velocity system for natural movement
  private velocity: Point = { x: 0, y: 0 };
  private smoothedVelocity: Point = { x: 0, y: 0 };
  private ultraSmoothVelocity: Point = { x: 0, y: 0 };
  private lastPanPosition: Point | null = null;
  private lastPanTime: number = 0;
  private momentumAnimationId: number | null = null;
  private isDecelerating: boolean = false;
  
  // ULTRA-PREMIUM: Multi-stage transform interpolation
  private targetTransform: Transform = { x: 0, y: 0, scale: 1 };
  private smoothTransform: Transform = { x: 0, y: 0, scale: 1 };
  private ultraSmoothTransform: Transform = { x: 0, y: 0, scale: 1 };
  private isSmoothing: boolean = false;
  private smoothingAnimationId: number | null = null;
  
  // ULTRA-PREMIUM: Extended position history for premium interpolation
  private positionHistory: Array<{position: Point, timestamp: number, velocity: Point}> = [];
  private maxHistorySize: number = 8; // Increased for ultra-smooth interpolation
  private baseSmoothingFactor: number = 0.08; // Much lower for ultra-smooth movement
  private adaptiveSmoothingFactor: number = 0.08;
  
  // ULTRA-PREMIUM: Advanced smoothing parameters
  private highFrequencySmoothing: boolean = true;
  private naturalEasing: boolean = true;
  private premiumInterpolation: boolean = true;
  
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
      clientY: event.clientY,
      eventType: event.constructor.name,
      isReactEvent: event.hasOwnProperty('nativeEvent')
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
    const timestamp = performance.now();
    
    // DIRECT CANVAS DRAG: Minimal tracking for performance monitoring only
    this.lastPanPosition = { ...currentPos };
    this.lastPanTime = timestamp;
    
    // Track performance
    if (!this.lastMouseMoveTime) {
      this.lastMouseMoveTime = timestamp;
      this.mouseMoveCount = 0;
    }
    
    const timeDelta = timestamp - this.lastMouseMoveTime;
    this.mouseMoveCount++;
    
    // Log every 100th event for minimal performance impact
    if (this.mouseMoveCount % 100 === 0) {
      console.log('⚡ [DIRECT-CANVAS-DRAG] Mouse move performance:', {
        mode: this.mode,
        frequency: `${(1000 / timeDelta).toFixed(1)}Hz`,
        mouseMoveCount: this.mouseMoveCount
      });
    }
    
    this.lastMouseMoveTime = timestamp;
    
    switch (this.mode) {
      case 'DRAGGING_NODE':
        this.updateNodeDragSmooth(currentPos);
        break;
        
      case 'PANNING':
        this.updateCanvasPanHybridSmooth(currentPos);
        break;
        
      default:
        // Clear any animation frames when not in active mode
        this.clearAnimationFrames();
        break;
    }
  }
  
  public handleMouseUp(event: MouseEvent): void {
    console.log('🎯 [InteractionManager] handleMouseUp', {
      mode: this.mode,
      hasDragContext: !!this.dragContext,
      dragContextNodeId: this.dragContext?.nodeId,
      eventType: event.constructor.name
    });
    
    switch (this.mode) {
      case 'DRAGGING_NODE':
        console.log('🔍 [InteractionManager] Processing DRAGGING_NODE mouse up');
        this.endNodeDrag();
        break;
        
      case 'PANNING':
        console.log('🔍 [InteractionManager] Processing PANNING mouse up');
        this.endCanvasPan();
        break;
        
      default:
        console.log('🔍 [InteractionManager] Mouse up ignored - mode:', this.mode);
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
    // IMMEDIATE RESPONSE: Clean state initialization
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Reset all timing and state variables
    this.dragStartTime = performance.now();
    this.mouseMoveCount = 0;
    this.coordinateHistory = [];
    this.lastBackendUpdate = 0;
    this.lastMouseMoveTime = 0;
    
    console.log('⚡ [IMMEDIATE-RESPONSE] Clean state initialized for immediate drag operation');
    
    console.log('🎯 [DIAGNOSTIC] Starting node drag with full analysis', {
      nodeId,
      nodeType,
      eventClientX: event.clientX,
      eventClientY: event.clientY,
      currentMode: this.mode,
      eventConstructor: event.constructor.name,
      eventType: typeof event,
      hasNativeEvent: event.hasOwnProperty('nativeEvent'),
      dragStartTime: this.dragStartTime,
      currentTransform: this.currentTransform
    });
    
    // Find node element
    const expectedId = `node-${nodeId}`;
    let nodeElement = document.getElementById(expectedId);
    
    console.log('🔍 [InteractionManager] DOM Element Search Debug:', {
      expectedId,
      nodeFound: !!nodeElement,
      allNodeElements: Array.from(document.querySelectorAll('[id^="node-"]')).map(el => ({
        id: el.id,
        className: el.className,
        tagName: el.tagName,
        boundingRect: el.getBoundingClientRect()
      }))
    });
    
    if (!nodeElement) {
      console.error('🎯 [InteractionManager] CRITICAL: Node element not found:', expectedId);
      
      // FALLBACK: Try alternative selectors
      const alternativeSelectors = [
        `[data-node-id="${nodeId}"]`,
        `.node-${nodeId}`,
        `[id*="${nodeId}"]`
      ];
      
      let foundElement = null;
      for (const selector of alternativeSelectors) {
        foundElement = document.querySelector(selector);
        if (foundElement) {
          console.log('🔧 [InteractionManager] Found element with alternative selector:', selector);
          break;
        }
      }
      
      if (!foundElement) {
        console.error('🎯 [InteractionManager] FATAL: No element found with any selector for nodeId:', nodeId);
        return;
      }
      
      nodeElement = foundElement as HTMLElement;
    }
    
    console.log('🎯 [InteractionManager] Node element found:', {
      id: nodeElement.id,
      className: nodeElement.className,
      boundingRect: nodeElement.getBoundingClientRect()
    });
    
    const rect = nodeElement.getBoundingClientRect();
    const startPosition = { x: event.clientX, y: event.clientY };
    const offset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Get the actual canvas coordinates from the node's screen position
    const computedStyle = window.getComputedStyle(nodeElement);
    const screenLeft = parseFloat(computedStyle.left) || 0;
    const screenTop = parseFloat(computedStyle.top) || 0;
    
    console.log('🎯 [InteractionManager] Node screen position:', { screenLeft, screenTop });
    console.log('🎯 [InteractionManager] Current transform:', this.currentTransform);
    
    // Convert screen coordinates back to canvas coordinates
    const initialNodePosition = {
      x: (screenLeft - this.currentTransform.x) / this.currentTransform.scale,
      y: (screenTop - this.currentTransform.y) / this.currentTransform.scale
    };
    
    console.log('🎯 [InteractionManager] Initial node canvas position:', initialNodePosition);
    
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
    console.log('🎯 [InteractionManager] State changed to DRAGGING_NODE, calling onStateChange');
    
    this.onStateChange?.(this.mode, this.dragContext);
    this.onNodeSelect?.(nodeId);
    
    // Ensure global listeners are attached immediately
    console.log('🔧 [InteractionManager] Ensuring global listeners are attached');
    this.ensureGlobalListenersAttached();
    
    // Add visual feedback
    nodeElement.style.zIndex = '1000';
    nodeElement.style.opacity = '0.8';
    nodeElement.style.transform = 'scale(1.05)';
    nodeElement.style.cursor = 'grabbing';
    
    console.log('🎯 [InteractionManager] Node drag started successfully', {
      nodeId,
      nodeType,
      initialNodePosition,
      offset,
      dragContextCreated: !!this.dragContext,
      modeChanged: this.mode === 'DRAGGING_NODE'
    });
  }
  
  // IMMEDIATE RESPONSE: Simplified smooth drag update method
  private updateNodeDragSmooth(currentPosition: Point): void {
    if (!this.dragContext) return;
    
    this.dragContext.currentPosition = currentPosition;
    
    // Calculate movement delta in screen coordinates
    const deltaX = currentPosition.x - this.dragContext.startPosition.x;
    const deltaY = currentPosition.y - this.dragContext.startPosition.y;
    
    // Apply transform scaling to delta to get canvas delta
    const scaledDeltaX = deltaX / this.currentTransform.scale;
    const scaledDeltaY = deltaY / this.currentTransform.scale;
    
    // Calculate new canvas position
    const newCanvasPosition = {
      x: this.dragContext.initialNodePosition.x + scaledDeltaX,
      y: this.dragContext.initialNodePosition.y + scaledDeltaY
    };
    
    // Store the real-time canvas position for final positioning
    this.dragContext.realTimeCanvasPosition = newCanvasPosition;
    
    // IMMEDIATE RESPONSE: Use requestAnimationFrame for smooth visual updates
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.animationFrameId = requestAnimationFrame(() => {
      const nodeElement = document.getElementById(`node-${this.dragContext?.nodeId}`);
      if (nodeElement && this.dragContext) {
        // Use transform translate for smooth visual movement during drag
        nodeElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05)`;
        nodeElement.style.zIndex = '1000';
        nodeElement.style.opacity = '0.9';
        nodeElement.style.cursor = 'grabbing';
        nodeElement.style.willChange = 'transform';
        nodeElement.style.transition = 'none';
        nodeElement.style.pointerEvents = 'none';
        document.body.style.cursor = 'grabbing';
      }
    });
    
    // Throttle backend updates to reduce server load
    const timestamp = performance.now();
    const timeSinceLastBackendUpdate = timestamp - this.lastBackendUpdate;
    
    if (timeSinceLastBackendUpdate >= this.backendUpdateInterval) {
      this.lastBackendUpdate = timestamp;
      
      // Only log every few backend updates to reduce console spam
      if (this.mouseMoveCount % 20 === 0) {
        console.log('⚡ [IMMEDIATE-RESPONSE] Backend update:', {
          nodeId: this.dragContext.nodeId,
          newCanvasPosition,
          updateInterval: `${timeSinceLastBackendUpdate.toFixed(2)}ms`
        });
      }
    }
  }
  
  private endNodeDrag(): void {
    if (!this.dragContext) return;
    
    const dragEndTime = performance.now();
    const totalDragDuration = dragEndTime - this.dragStartTime;
    
    console.log('🎯 [DIAGNOSTIC] Ending node drag with full analysis', {
      nodeId: this.dragContext.nodeId,
      totalDragDuration: `${totalDragDuration.toFixed(2)}ms`,
      totalMouseMoves: this.mouseMoveCount,
      averageFrequency: this.mouseMoveCount > 0 ? `${(this.mouseMoveCount / (totalDragDuration / 1000)).toFixed(1)}Hz` : 'N/A',
      coordinateHistory: this.coordinateHistory.slice(-3)
    });
    
    // Use the real-time canvas position for accuracy
    const finalCanvasPosition = this.dragContext.realTimeCanvasPosition || {
      x: this.dragContext.initialNodePosition.x + (this.dragContext.currentPosition.x - this.dragContext.startPosition.x) / this.currentTransform.scale,
      y: this.dragContext.initialNodePosition.y + (this.dragContext.currentPosition.y - this.dragContext.startPosition.y) / this.currentTransform.scale
    };
    
    // Convert final canvas position to screen coordinates
    const finalScreenPosition = {
      x: finalCanvasPosition.x * this.currentTransform.scale + this.currentTransform.x,
      y: finalCanvasPosition.y * this.currentTransform.scale + this.currentTransform.y
    };
    
    // Set the exact final position immediately to prevent jumping
    const nodeElement = document.getElementById(`node-${this.dragContext.nodeId}`);
    if (nodeElement) {
      console.log('🔧 [InteractionManager] Setting final position immediately', {
        nodeId: this.dragContext.nodeId,
        finalCanvasPosition,
        finalScreenPosition,
        currentTransform: this.currentTransform
      });
      
      // Set final position immediately using the same formula as React
      nodeElement.style.left = `${finalScreenPosition.x}px`;
      nodeElement.style.top = `${finalScreenPosition.y}px`;
      
      // Reset drag-specific styling
      nodeElement.style.transform = '';
      nodeElement.style.transition = '';
      nodeElement.style.zIndex = '20';
      nodeElement.style.opacity = '1';
      nodeElement.style.cursor = 'grab';
      nodeElement.style.pointerEvents = 'auto';
      nodeElement.style.willChange = '';
      nodeElement.style.position = 'absolute';
      nodeElement.style.width = '240px';
      
      // Reset body cursor
      document.body.style.cursor = '';
      
      console.log('✅ [InteractionManager] Final position set immediately to prevent jumping');
    }
    
    console.log('🎯 [InteractionManager] Node drag completed', {
      nodeId: this.dragContext.nodeId,
      finalCanvasPosition,
      finalScreenPosition
    });
    
    const nodeId = this.dragContext.nodeId;
    
    // Reset all drag-related state
    this.dragContext = null;
    this.mode = 'IDLE';
    
    // Reset animation frame and timing state
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Reset timing state for next drag
    this.lastBackendUpdate = 0;
    this.mouseMoveCount = 0;
    this.lastMouseMoveTime = 0;
    this.coordinateHistory = [];
    
    console.log('⚡ [IMMEDIATE-RESPONSE] All drag state reset for next operation');
    
    this.onStateChange?.(this.mode, null);
    
    // Delay React state update to allow our DOM positioning to stick
    setTimeout(() => {
      console.log('🔧 [InteractionManager] Updating React state after DOM positioning is stable');
      this.onNodePositionUpdate?.(nodeId, finalCanvasPosition);
    }, 100);
  }
  
  // Canvas panning methods
  private startCanvasPan(event: MouseEvent): void {
    console.log('🐛 [CANVAS-DRAG-DEBUG] Starting canvas pan');
    console.log('🐛 [CANVAS-DRAG-DEBUG] Pan start details:', {
      clientX: event.clientX,
      clientY: event.clientY,
      currentTransform: this.currentTransform,
      button: event.button,
      timestamp: performance.now()
    });
    
    const startPosition = { x: event.clientX, y: event.clientY };
    
    this.panContext = {
      startPosition,
      initialTransform: { ...this.currentTransform }
    };
    
    this.mode = 'PANNING';
    console.log('🐛 [CANVAS-DRAG-DEBUG] Mode changed to PANNING, calling onStateChange');
    this.onStateChange?.(this.mode, this.panContext);
  }
  
  // DIRECT CANVAS DRAG: Immediate response without any interpolation delay
  private updateCanvasPanHybridSmooth(currentPosition: Point): void {
    if (!this.panContext) return;
    
    const deltaX = currentPosition.x - this.panContext.startPosition.x;
    const deltaY = currentPosition.y - this.panContext.startPosition.y;
    
    // DIRECT CANVAS DRAG: Update transform immediately for instant response
    this.currentTransform = {
      ...this.panContext.initialTransform,
      x: this.panContext.initialTransform.x + deltaX,
      y: this.panContext.initialTransform.y + deltaY
    };
    
    // DIRECT CANVAS DRAG: Update immediately without requestAnimationFrame delay
    this.onTransformUpdate?.(this.currentTransform);
    
    // Log every 60th event for performance monitoring
    if (this.mouseMoveCount % 60 === 0) {
      console.log('⚡ [DIRECT-CANVAS-DRAG] Immediate response:', {
        deltaX: deltaX.toFixed(2),
        deltaY: deltaY.toFixed(2),
        currentTransform: this.currentTransform,
        mouseMoveCount: this.mouseMoveCount
      });
    }
  }
  
  private endCanvasPan(): void {
    console.log('⚡ [DIRECT-CANVAS-DRAG] Ending direct canvas pan');
    console.log('⚡ [DIRECT-CANVAS-DRAG] Final transform:', this.currentTransform);
    
    // DIRECT CANVAS DRAG: No momentum - immediate stop for direct control
    this.panContext = null;
    this.mode = 'IDLE';
    this.onStateChange?.(this.mode, null);
    
    // Clean up position tracking
    this.lastPanPosition = null;
    this.lastPanTime = 0;
    this.velocity = { x: 0, y: 0 };
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
  
  public isDragging(): boolean {
    return this.mode === 'DRAGGING_NODE';
  }
  
  public getDraggedNodeId(): string | null {
    return this.dragContext?.nodeId || null;
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
        nodeElement.style.willChange = 'auto';
        const computedStyle = window.getComputedStyle(nodeElement);
        const currentLeft = parseFloat(computedStyle.left) || 0;
        const currentTop = parseFloat(computedStyle.top) || 0;
        nodeElement.style.left = `${currentLeft}px`;
        nodeElement.style.top = `${currentTop}px`;
      }
    }
    
    // Reset all state completely
    this.mode = 'IDLE';
    this.dragContext = null;
    this.panContext = null;
    this.connectionStart = null;
    
    // Reset animation frame and timing state
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Reset all timing variables
    this.lastBackendUpdate = 0;
    this.mouseMoveCount = 0;
    this.lastMouseMoveTime = 0;
    this.coordinateHistory = [];
    
    console.log('⚡ [IMMEDIATE-RESPONSE] All interaction state completely reset');
    
    this.onStateChange?.(this.mode, null);
  }
  
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
  
  public onNodeAddedFromChat(nodeId: string, nodeType: 'ai' | 'human'): void {
    console.log(`🎯 [InteractionManager] New ${nodeType} node added from chat: ${nodeId}`);
    this.setCreationMode(false);
  }
  
  public getConnectionStart(): string | null {
    return this.connectionStart;
  }
  
  // Ensure global listeners are attached
  private ensureGlobalListenersAttached(): void {
    console.log('🔧 [InteractionManager] Checking if global listeners need to be attached');
    
    if (this.mode === 'DRAGGING_NODE' || this.mode === 'PANNING') {
      console.log('🔧 [InteractionManager] Mode requires global listeners, ensuring they are attached');
      
      // Remove any existing listeners first to avoid duplicates
      document.removeEventListener('mousemove', this.handleGlobalMouseMove);
      document.removeEventListener('mouseup', this.handleGlobalMouseUp);
      
      // Add listeners with explicit non-passive and capture settings
      document.addEventListener('mousemove', this.handleGlobalMouseMove, { passive: false, capture: true });
      document.addEventListener('mouseup', this.handleGlobalMouseUp, { passive: false, capture: true });
      
      console.log('🔧 [InteractionManager] Global listeners attached directly by InteractionManager');
    }
  }
  
  // HYBRID SMOOTHNESS: Helper methods for advanced animations
  private clearAnimationFrames(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.momentumAnimationId) {
      cancelAnimationFrame(this.momentumAnimationId);
      this.momentumAnimationId = null;
    }
    if (this.smoothingAnimationId) {
      cancelAnimationFrame(this.smoothingAnimationId);
      this.smoothingAnimationId = null;
    }
    this.isDecelerating = false;
    this.isSmoothing = false;
  }
  
  // ULTRA-PREMIUM: Revolutionary position interpolation with velocity weighting
  private getPremiumInterpolatedPosition(): Point | null {
    if (this.positionHistory.length === 0) {
      return null;
    }
    
    if (this.positionHistory.length === 1) {
      return this.positionHistory[0].position;
    }
    
    // ULTRA-PREMIUM: Advanced weighted interpolation with velocity consideration
    const weights = [0.05, 0.1, 0.15, 0.2, 0.25, 0.25]; // Gradual weight increase for ultra-smooth
    let totalWeight = 0;
    let smoothX = 0;
    let smoothY = 0;
    
    // Use extended history for premium smoothness
    for (let i = 0; i < Math.min(this.positionHistory.length, weights.length); i++) {
      const point = this.positionHistory[this.positionHistory.length - 1 - i];
      let weight = weights[i] || 0;
      
      // ULTRA-PREMIUM: Velocity-based weight adjustment for natural movement
      const velocityMagnitude = Math.sqrt(point.velocity.x ** 2 + point.velocity.y ** 2);
      const velocityFactor = Math.min(1 + velocityMagnitude / 1000, 2); // Higher velocity = more weight
      weight *= velocityFactor;
      
      smoothX += point.position.x * weight;
      smoothY += point.position.y * weight;
      totalWeight += weight;
    }
    
    return {
      x: smoothX / totalWeight,
      y: smoothY / totalWeight
    };
  }
  
  // Keep original method for backward compatibility
  private getInterpolatedPosition(): Point | null {
    return this.getPremiumInterpolatedPosition();
  }
  
  // ULTRA-PREMIUM: Revolutionary multi-stage smoothing animation system
  private startUltraPremiumSmoothing(): void {
    if (this.isSmoothing) return;
    
    this.isSmoothing = true;
    this.smoothTransform = { ...this.currentTransform };
    this.ultraSmoothTransform = { ...this.currentTransform };
    
    const ultraPremiumSmoothingLoop = () => {
      if (!this.isSmoothing || this.mode !== 'PANNING') {
        this.isSmoothing = false;
        return;
      }
      
      // Stage 1: Calculate differences for multi-stage smoothing
      const targetDeltaX = this.targetTransform.x - this.smoothTransform.x;
      const targetDeltaY = this.targetTransform.y - this.smoothTransform.y;
      
      const smoothDeltaX = this.smoothTransform.x - this.ultraSmoothTransform.x;
      const smoothDeltaY = this.smoothTransform.y - this.ultraSmoothTransform.y;
      
      // Stage 2: Apply ultra-premium easing with velocity-based adjustment
      const velocityMagnitude = Math.sqrt(this.ultraSmoothVelocity.x ** 2 + this.ultraSmoothVelocity.y ** 2);
      const ultraDynamicSmoothingFactor = Math.min(this.adaptiveSmoothingFactor + (velocityMagnitude / 4000), 0.25);
      
      // Stage 3: Multi-layer transform updates for ultimate smoothness
      // Layer 1: Smooth transform (intermediate smoothing)
      this.smoothTransform.x += targetDeltaX * (ultraDynamicSmoothingFactor * 1.5);
      this.smoothTransform.y += targetDeltaY * (ultraDynamicSmoothingFactor * 1.5);
      
      // Layer 2: Ultra-smooth transform (final smoothing)
      this.ultraSmoothTransform.x += smoothDeltaX * ultraDynamicSmoothingFactor;
      this.ultraSmoothTransform.y += smoothDeltaY * ultraDynamicSmoothingFactor;
      
      // Stage 4: Update the current transform with ultra-smooth values
      this.currentTransform = { ...this.ultraSmoothTransform };
      this.onTransformUpdate?.(this.currentTransform);
      
      // Stage 5: Continue the smoothing loop with ultra-precise threshold
      const remainingDistance = Math.sqrt(targetDeltaX * targetDeltaX + targetDeltaY * targetDeltaY);
      const ultraSmoothDistance = Math.sqrt(smoothDeltaX * smoothDeltaX + smoothDeltaY * smoothDeltaY);
      
      if (remainingDistance > 0.05 || ultraSmoothDistance > 0.02) { // Ultra-precise thresholds
        this.smoothingAnimationId = requestAnimationFrame(ultraPremiumSmoothingLoop);
      } else {
        // Snap to final position for precision
        this.smoothTransform = { ...this.targetTransform };
        this.ultraSmoothTransform = { ...this.targetTransform };
        this.currentTransform = { ...this.targetTransform };
        this.onTransformUpdate?.(this.currentTransform);
        this.isSmoothing = false;
      }
    };
    
    this.smoothingAnimationId = requestAnimationFrame(ultraPremiumSmoothingLoop);
  }
  
  // Keep original method for backward compatibility
  private startHybridSmoothing(): void {
    this.startUltraPremiumSmoothing();
  }
  
  private stopHybridSmoothing(): void {
    this.isSmoothing = false;
    if (this.smoothingAnimationId) {
      cancelAnimationFrame(this.smoothingAnimationId);
      this.smoothingAnimationId = null;
    }
    
    // Clean up position history gradually for smooth transition
    setTimeout(() => {
      this.positionHistory = [];
    }, 50);
  }
  
  // SMOOTH CANVAS DRAG: Light momentum for natural feel
  private startLightMomentum(): void {
    const velocityMagnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    
    // Only apply momentum if velocity is significant enough
    if (velocityMagnitude < 50) {
      this.velocity = { x: 0, y: 0 };
      return;
    }
    
    console.log('✨ [SMOOTH-CANVAS-DRAG] Starting light momentum:', velocityMagnitude.toFixed(1), 'px/s');
    
    this.isDecelerating = true;
    const deceleration = 0.88; // Gentle deceleration
    const minVelocity = 10; // Stop when velocity is low
    
    let momentumVelocity = { ...this.velocity };
    
    const animateLightMomentum = () => {
      if (!this.isDecelerating) return;
      
      // Apply velocity to transform
      const deltaTime = 16; // 60fps
      const deltaX = (momentumVelocity.x * deltaTime) / 1000;
      const deltaY = (momentumVelocity.y * deltaTime) / 1000;
      
      // Update transform with momentum
      this.currentTransform = {
        ...this.currentTransform,
        x: this.currentTransform.x + deltaX,
        y: this.currentTransform.y + deltaY
      };
      
      this.onTransformUpdate?.(this.currentTransform);
      
      // Apply deceleration
      momentumVelocity.x *= deceleration;
      momentumVelocity.y *= deceleration;
      
      // Check if we should continue
      const currentVelocityMagnitude = Math.sqrt(momentumVelocity.x ** 2 + momentumVelocity.y ** 2);
      
      if (currentVelocityMagnitude > minVelocity) {
        this.momentumAnimationId = requestAnimationFrame(animateLightMomentum);
      } else {
        console.log('✨ [SMOOTH-CANVAS-DRAG] Light momentum completed');
        this.velocity = { x: 0, y: 0 };
        this.isDecelerating = false;
        this.momentumAnimationId = null;
      }
    };
    
    this.momentumAnimationId = requestAnimationFrame(animateLightMomentum);
  }
  
  // Keep original method for backward compatibility
  private startAdvancedMomentum(): void {
    this.startLightMomentum();
  }

  // Bound methods for global event listeners
  private handleGlobalMouseMove = (event: MouseEvent) => {
    console.log('🔧 [InteractionManager] Global mouse move received');
    this.handleMouseMove(event);
  };
  
  private handleGlobalMouseUp = (event: MouseEvent) => {
    console.log('🔧 [InteractionManager] Global mouse up received');
    this.handleMouseUp(event);
    
    // Clean up global listeners after mouse up
    document.removeEventListener('mousemove', this.handleGlobalMouseMove);
    document.removeEventListener('mouseup', this.handleGlobalMouseUp);
    console.log('🔧 [InteractionManager] Global listeners cleaned up');
  };
}
      