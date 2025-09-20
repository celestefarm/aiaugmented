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
  
  // DIAGNOSTIC: Add timing tracking for mouse events
  private lastMouseMoveTime: number = 0;
  private mouseMoveCount: number = 0;
  private dragStartTime: number = 0;
  private coordinateHistory: Array<{timestamp: number, screen: Point, canvas: Point}> = [];
  
  // PERFORMANCE FIX: Add throttling and animation frame management
  private lastThrottledUpdate: number = 0;
  private throttleInterval: number = 16; // ~60fps (1000ms / 60fps = 16.67ms)
  private animationFrameId: number | null = null;
  private pendingUpdate: Point | null = null;
  private lastBackendUpdate: number = 0;
  private backendUpdateInterval: number = 100; // Update backend every 100ms during drag
  
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
    
    // PERFORMANCE FIX: Throttle mouse move processing to ~60fps
    const timeSinceLastUpdate = timestamp - this.lastThrottledUpdate;
    if (timeSinceLastUpdate < this.throttleInterval) {
      // Store the latest position for the next update
      this.pendingUpdate = currentPos;
      return;
    }
    
    // DIAGNOSTIC: Track mouse event frequency and smoothness (reduced logging)
    if (!this.lastMouseMoveTime) {
      this.lastMouseMoveTime = timestamp;
      this.mouseMoveCount = 0;
    }
    
    const timeDelta = timestamp - this.lastMouseMoveTime;
    this.mouseMoveCount++;
    
    // DIAGNOSTIC: Track coordinate transformations (only every 10th event to reduce spam)
    if (this.mouseMoveCount % 10 === 0) {
      const canvasPos = this.screenToCanvas(currentPos.x, currentPos.y);
      console.log('🔍 [DIAGNOSTIC] Throttled mouse move analysis:', {
        currentMode: this.mode,
        currentPos,
        canvasPos,
        timeDelta: `${timeDelta.toFixed(2)}ms`,
        frequency: timeDelta > 0 ? `${(1000 / timeDelta).toFixed(1)}Hz` : 'N/A',
        eventCount: this.mouseMoveCount,
        throttleInterval: this.throttleInterval,
        actualUpdateFrequency: `${(1000 / timeSinceLastUpdate).toFixed(1)}Hz`
      });
    }
    
    this.lastMouseMoveTime = timestamp;
    this.lastThrottledUpdate = timestamp;
    
    switch (this.mode) {
      case 'DRAGGING_NODE':
        this.updateNodeDragSmooth(currentPos);
        break;
        
      case 'PANNING':
        this.updateCanvasPan(currentPos);
        break;
        
      default:
        // Clear any pending updates when not in active mode
        this.pendingUpdate = null;
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
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
    // CRITICAL FIX: Ensure clean state before starting new drag
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Reset all timing and state variables
    this.dragStartTime = performance.now();
    this.mouseMoveCount = 0;
    this.coordinateHistory = [];
    this.lastThrottledUpdate = 0;
    this.lastBackendUpdate = 0;
    this.pendingUpdate = null;
    this.lastMouseMoveTime = 0;
    
    console.log('🔧 [CRITICAL FIX] Clean state initialized for new drag operation');
    
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
    
    // CRITICAL DEBUG: Check all possible node element selectors
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
      })),
      allElementsWithNodeInId: Array.from(document.querySelectorAll('[id*="node"]')).map(el => ({
        id: el.id,
        className: el.className,
        tagName: el.tagName
      })),
      totalElementsInDOM: document.querySelectorAll('*').length,
      bodyChildren: Array.from(document.body.children).map(el => ({
        id: el.id,
        className: el.className,
        tagName: el.tagName
      }))
    });
    
    if (!nodeElement) {
      console.error('🎯 [InteractionManager] CRITICAL: Node element not found:', expectedId);
      console.error('🎯 [InteractionManager] This is likely the root cause of drag failure');
      
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
      
      // Use the found element
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
    
    // CRITICAL FIX: Get the actual canvas coordinates from the node's data attributes or calculate from screen position
    // The node's left/top style properties are already screen coordinates (transformed)
    // We need to get the original canvas coordinates
    const computedStyle = window.getComputedStyle(nodeElement);
    const screenLeft = parseFloat(computedStyle.left) || 0;
    const screenTop = parseFloat(computedStyle.top) || 0;
    
    console.log('🎯 [InteractionManager] Node screen position:', { screenLeft, screenTop });
    console.log('🎯 [InteractionManager] Current transform:', this.currentTransform);
    
    // IMPROVED: Convert screen coordinates back to canvas coordinates
    // The formula used in SimpleNode is: left = node.x * transform.scale + transform.x
    // So to get canvas coordinates: node.x = (left - transform.x) / transform.scale
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
    console.log('🔍 [InteractionManager] State Change Debug:', {
      newMode: this.mode,
      dragContext: this.dragContext,
      hasOnStateChangeCallback: !!this.onStateChange,
      hasOnNodeSelectCallback: !!this.onNodeSelect,
      callbackTypes: {
        onStateChange: typeof this.onStateChange,
        onNodeSelect: typeof this.onNodeSelect
      }
    });
    
    this.onStateChange?.(this.mode, this.dragContext);
    this.onNodeSelect?.(nodeId);
    
    console.log('🎯 [InteractionManager] Callbacks called, drag context:', this.dragContext);
    console.log('🔍 [InteractionManager] Post-callback state verification:', {
      currentMode: this.mode,
      dragContextExists: !!this.dragContext,
      dragContextNodeId: this.dragContext?.nodeId,
      shouldHaveGlobalListeners: this.mode === 'DRAGGING_NODE'
    });
    
    // CRITICAL FIX: Ensure global listeners are attached immediately
    // This is a fallback in case React's useEffect doesn't trigger fast enough
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
  
  private updateNodeDrag(currentPosition: Point): void {
    if (!this.dragContext) return;
    
    const timestamp = performance.now();
    const dragDuration = timestamp - this.dragStartTime;
    
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
    
    // Convert canvas position to screen coordinates for DOM positioning
    // This must match the formula used in SimpleNode: left = node.x * transform.scale + transform.x
    const newScreenPosition = {
      x: newCanvasPosition.x * this.currentTransform.scale + this.currentTransform.x,
      y: newCanvasPosition.y * this.currentTransform.scale + this.currentTransform.y
    };
    
    // DIAGNOSTIC: Detailed coordinate transformation logging
    console.log('🔍 [DIAGNOSTIC] Coordinate transformation analysis:', {
      nodeId: this.dragContext.nodeId,
      dragDuration: `${dragDuration.toFixed(2)}ms`,
      screenDelta: { x: deltaX, y: deltaY },
      scaledDelta: { x: scaledDeltaX, y: scaledDeltaY },
      initialCanvasPos: this.dragContext.initialNodePosition,
      newCanvasPosition,
      newScreenPosition,
      currentTransform: this.currentTransform,
      transformFormula: {
        description: 'screen = canvas * scale + offset',
        verification: {
          expectedScreenX: newCanvasPosition.x * this.currentTransform.scale + this.currentTransform.x,
          expectedScreenY: newCanvasPosition.y * this.currentTransform.scale + this.currentTransform.y,
          actualScreenX: newScreenPosition.x,
          actualScreenY: newScreenPosition.y
        }
      }
    });
    
    // HYBRID APPROACH: Use transform translate for smooth visual feedback during drag
    requestAnimationFrame(() => {
      const nodeElement = document.getElementById(`node-${this.dragContext?.nodeId}`);
      if (nodeElement && this.dragContext) {
        // Calculate the offset from the original position for transform
        const deltaX = currentPosition.x - this.dragContext.startPosition.x;
        const deltaY = currentPosition.y - this.dragContext.startPosition.y;
        
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
    
    // Store the real-time canvas position for final positioning
    this.dragContext.realTimeCanvasPosition = newCanvasPosition;
    
    console.log('🎯 [InteractionManager] Node drag updated smoothly', {
      nodeId: this.dragContext.nodeId,
      newCanvasPosition,
      newScreenPosition
    });
  }
  
  // PERFORMANCE FIX: New smooth drag update method with proper throttling
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
    
    // PERFORMANCE FIX: Use requestAnimationFrame for smooth visual updates
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
    
    // PERFORMANCE FIX: Throttle backend updates to reduce server load
    const timestamp = performance.now();
    const timeSinceLastBackendUpdate = timestamp - this.lastBackendUpdate;
    
    if (timeSinceLastBackendUpdate >= this.backendUpdateInterval) {
      this.lastBackendUpdate = timestamp;
      
      // Only log every few backend updates to reduce console spam
      if (this.mouseMoveCount % 20 === 0) {
        console.log('🔧 [PERFORMANCE] Throttled backend update:', {
          nodeId: this.dragContext.nodeId,
          newCanvasPosition,
          updateInterval: `${timeSinceLastBackendUpdate.toFixed(2)}ms`,
          backendUpdateFrequency: `${(1000 / timeSinceLastBackendUpdate).toFixed(1)}Hz`
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
      coordinateHistory: this.coordinateHistory.slice(-3) // Last 3 coordinate transformations
    });
    
    // POSITIONING FIX: Use the real-time canvas position for accuracy
    const finalCanvasPosition = this.dragContext.realTimeCanvasPosition || {
      // Fallback to delta calculation if real-time position not available
      x: this.dragContext.initialNodePosition.x + (this.dragContext.currentPosition.x - this.dragContext.startPosition.x) / this.currentTransform.scale,
      y: this.dragContext.initialNodePosition.y + (this.dragContext.currentPosition.y - this.dragContext.startPosition.y) / this.currentTransform.scale
    };
    
    // Convert final canvas position to screen coordinates using the same formula as SimpleNode
    const finalScreenPosition = {
      x: finalCanvasPosition.x * this.currentTransform.scale + this.currentTransform.x,
      y: finalCanvasPosition.y * this.currentTransform.scale + this.currentTransform.y
    };
    
    // FINAL POSITIONING FIX: Set the exact final position immediately to prevent jumping
    const nodeElement = document.getElementById(`node-${this.dragContext.nodeId}`);
    if (nodeElement) {
      console.log('🔧 [InteractionManager] Setting final position immediately', {
        nodeId: this.dragContext.nodeId,
        finalCanvasPosition,
        finalScreenPosition,
        currentTransform: this.currentTransform
      });
      
      // CRITICAL: Set final position immediately using the same formula as React
      // This prevents any jumping by ensuring coordinates match exactly
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
    
    // FINAL FIX: Delay React state update to prevent override of our DOM positioning
    const nodeId = this.dragContext.nodeId;
    
    // CRITICAL FIX: Properly reset all drag-related state
    this.dragContext = null;
    this.mode = 'IDLE';
    
    // Reset animation frame and timing state
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Reset timing and throttling state for next drag
    this.lastThrottledUpdate = 0;
    this.lastBackendUpdate = 0;
    this.pendingUpdate = null;
    this.mouseMoveCount = 0;
    this.lastMouseMoveTime = 0;
    this.coordinateHistory = [];
    
    console.log('🔧 [CRITICAL FIX] All drag state reset for next operation');
    
    this.onStateChange?.(this.mode, null);
    
    // CRITICAL: Delay React state update to allow our DOM positioning to stick
    setTimeout(() => {
      console.log('🔧 [InteractionManager] Updating React state after DOM positioning is stable');
      this.onNodePositionUpdate?.(nodeId, finalCanvasPosition);
    }, 100);
    
    // Verify the node is still visible after a short delay
    setTimeout(() => {
      const nodeElement = document.getElementById(`node-${nodeId}`);
      if (nodeElement) {
        const computedStyle = window.getComputedStyle(nodeElement);
        console.log('✅ [InteractionManager] Node verification after drag end', {
          nodeId,
          elementExists: true,
          isVisible: computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden',
          styles: {
            left: nodeElement.style.left,
            top: nodeElement.style.top,
            transform: nodeElement.style.transform,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            position: computedStyle.position
          },
          boundingRect: nodeElement.getBoundingClientRect()
        });
      } else {
        console.error('❌ [InteractionManager] CRITICAL: Node element disappeared!', {
          nodeId,
          allNodeElements: Array.from(document.querySelectorAll('[id^="node-"]')).map(el => el.id)
        });
      }
    }, 100);
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
  
  // Method to check if currently dragging (for preventing auto-arrange interference)
  public isDragging(): boolean {
    return this.mode === 'DRAGGING_NODE';
  }
  
  // Method to get dragged node ID (for conflict prevention)
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
    
    // CRITICAL FIX: Reset visual feedback if dragging - direct DOM manipulation
    if (this.dragContext) {
      const nodeElement = document.getElementById(`node-${this.dragContext.nodeId}`);
      if (nodeElement) {
        nodeElement.style.zIndex = '20';
        nodeElement.style.opacity = '1';
        nodeElement.style.transform = 'scale(1)';
        nodeElement.style.cursor = 'grab';
        nodeElement.style.willChange = 'auto';
        // Reset any transform translate that might have been applied during drag
        const computedStyle = window.getComputedStyle(nodeElement);
        const currentLeft = parseFloat(computedStyle.left) || 0;
        const currentTop = parseFloat(computedStyle.top) || 0;
        nodeElement.style.left = `${currentLeft}px`;
        nodeElement.style.top = `${currentTop}px`;
      }
    }
    
    // CRITICAL FIX: Reset all state completely
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
    this.lastThrottledUpdate = 0;
    this.lastBackendUpdate = 0;
    this.pendingUpdate = null;
    this.mouseMoveCount = 0;
    this.lastMouseMoveTime = 0;
    this.coordinateHistory = [];
    
    console.log('🔧 [CRITICAL FIX] All interaction state completely reset');
    
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
  
  // CRITICAL FIX: Ensure global listeners are attached
  private ensureGlobalListenersAttached(): void {
    console.log('🔧 [InteractionManager] Checking if global listeners need to be attached');
    
    // Check if we're in a state that requires global listeners
    if (this.mode === 'DRAGGING_NODE' || this.mode === 'PANNING') {
      console.log('🔧 [InteractionManager] Mode requires global listeners, ensuring they are attached');
      
      // Remove any existing listeners first to avoid duplicates
      document.removeEventListener('mousemove', this.handleGlobalMouseMove);
      document.removeEventListener('mouseup', this.handleGlobalMouseUp);
      
      // PASSIVE EVENT FIX: Add listeners with explicit non-passive and capture settings
      document.addEventListener('mousemove', this.handleGlobalMouseMove, { passive: false, capture: true });
      document.addEventListener('mouseup', this.handleGlobalMouseUp, { passive: false, capture: true });
      
      console.log('🔧 [InteractionManager] Global listeners attached directly by InteractionManager');
    }
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