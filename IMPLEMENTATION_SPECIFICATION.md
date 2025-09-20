# Implementation Specification: Node Dragging Architecture

## Overview

This document provides detailed implementation instructions for the new unified interaction architecture designed to resolve the persistent node dragging issues.

## Implementation Order

### Phase 1: Create InteractionManager

#### File: `frontend/src/managers/InteractionManager.ts`

```typescript
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
  startPosition: Point;
  currentPosition: Point;
  offset: Point;
  initialNodePosition: Point;
}

export interface PanContext {
  startPosition: Point;
  initialTransform: Transform;
}

export type InteractionMode = 'IDLE' | 'DRAGGING_NODE' | 'PANNING' | 'CONNECTING';

export class InteractionManager {
  private mode: InteractionMode = 'IDLE';
  private dragContext: DragContext | null = null;
  private panContext: PanContext | null = null;
  private connectionStart: string | null = null;
  
  // Event callbacks
  private onNodePositionUpdate?: (nodeId: string, position: Point) => void;
  private onTransformUpdate?: (transform: Transform) => void;
  private onStateChange?: (mode: InteractionMode, data: any) => void;
  
  constructor(
    onNodePositionUpdate?: (nodeId: string, position: Point) => void,
    onTransformUpdate?: (transform: Transform) => void,
    onStateChange?: (mode: InteractionMode, data: any) => void
  ) {
    this.onNodePositionUpdate = onNodePositionUpdate;
    this.onTransformUpdate = onTransformUpdate;
    this.onStateChange = onStateChange;
  }
  
  // Main event handlers
  handleMouseDown(event: MouseEvent, target: 'canvas' | 'node', nodeId?: string): void {
    console.log('🎯 [InteractionManager] handleMouseDown', { target, nodeId, mode: this.mode });
    
    if (event.ctrlKey && target === 'node' && nodeId) {
      this.handleConnectionClick(nodeId);
      return;
    }
    
    switch (this.mode) {
      case 'IDLE':
        if (target === 'canvas') {
          this.startCanvasPan(event);
        } else if (target === 'node' && nodeId) {
          this.startNodeDrag(event, nodeId);
        }
        break;
        
      case 'CONNECTING':
        if (target === 'node' && nodeId) {
          this.handleConnectionClick(nodeId);
        }
        break;
    }
  }
  
  handleMouseMove(event: MouseEvent): void {
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
  
  handleMouseUp(event: MouseEvent): void {
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
  
  // Node dragging methods
  private startNodeDrag(event: MouseEvent, nodeId: string): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const startPosition = { x: event.clientX, y: event.clientY };
    const offset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Get current node position from DOM or props
    const nodeElement = document.getElementById(`node-${nodeId}`);
    const initialNodePosition = nodeElement ? {
      x: parseFloat(nodeElement.style.left) || 0,
      y: parseFloat(nodeElement.style.top) || 0
    } : { x: 0, y: 0 };
    
    this.dragContext = {
      nodeId,
      startPosition,
      currentPosition: startPosition,
      offset,
      initialNodePosition
    };
    
    this.mode = 'DRAGGING_NODE';
    this.onStateChange?.(this.mode, this.dragContext);
    
    console.log('🎯 [InteractionManager] Started node drag', this.dragContext);
  }
  
  private updateNodeDrag(currentPosition: Point): void {
    if (!this.dragContext) return;
    
    this.dragContext.currentPosition = currentPosition;
    
    // Calculate new position
    const deltaX = currentPosition.x - this.dragContext.startPosition.x;
    const deltaY = currentPosition.y - this.dragContext.startPosition.y;
    
    const newPosition = {
      x: this.dragContext.initialNodePosition.x + deltaX,
      y: this.dragContext.initialNodePosition.y + deltaY
    };
    
    // Update node position immediately for visual feedback
    const nodeElement = document.getElementById(`node-${this.dragContext.nodeId}`);
    if (nodeElement) {
      nodeElement.style.left = `${newPosition.x}px`;
      nodeElement.style.top = `${newPosition.y}px`;
    }
    
    console.log('🎯 [InteractionManager] Updated node drag', { nodeId: this.dragContext.nodeId, newPosition });
  }
  
  private endNodeDrag(): void {
    if (!this.dragContext) return;
    
    const finalPosition = {
      x: this.dragContext.currentPosition.x - this.dragContext.startPosition.x + this.dragContext.initialNodePosition.x,
      y: this.dragContext.currentPosition.y - this.dragContext.startPosition.y + this.dragContext.initialNodePosition.y
    };
    
    // Notify parent component to save position
    this.onNodePositionUpdate?.(this.dragContext.nodeId, finalPosition);
    
    console.log('🎯 [InteractionManager] Ended node drag', { nodeId: this.dragContext.nodeId, finalPosition });
    
    this.dragContext = null;
    this.mode = 'IDLE';
    this.onStateChange?.(this.mode, null);
  }
  
  // Canvas panning methods
  private startCanvasPan(event: MouseEvent): void {
    // Implementation for canvas panning
    this.mode = 'PANNING';
    // ... panning logic
  }
  
  private updateCanvasPan(currentPosition: Point): void {
    // Implementation for canvas panning
  }
  
  private endCanvasPan(): void {
    this.mode = 'IDLE';
    this.onStateChange?.(this.mode, null);
  }
  
  // Connection methods
  private handleConnectionClick(nodeId: string): void {
    // Implementation for connection logic
  }
  
  // Public methods
  public getCurrentMode(): InteractionMode {
    return this.mode;
  }
  
  public getDragContext(): DragContext | null {
    return this.dragContext;
  }
  
  public startConnecting(): void {
    this.mode = 'CONNECTING';
    this.onStateChange?.(this.mode, null);
  }
  
  public cancelInteraction(): void {
    this.mode = 'IDLE';
    this.dragContext = null;
    this.panContext = null;
    this.connectionStart = null;
    this.onStateChange?.(this.mode, null);
  }
}
```

### Phase 2: Enhanced InteractionContext

#### Update: `frontend/src/contexts/InteractionContext.tsx`

```typescript
// Add new imports
import { InteractionManager, Point, Transform } from '@/managers/InteractionManager';

// Update InteractionData interface
export interface InteractionData {
  // Node dragging context
  draggedNodeId?: string;
  dragStartPosition?: Point;
  dragCurrentPosition?: Point;
  dragOffset?: Point;
  
  // Panning context
  panStart?: Point;
  panCurrentTransform?: Transform;
  
  // Connection context
  connectionStart?: string;
}

// Add InteractionManager to context
interface InteractionContextType {
  interactionState: InteractionContext;
  interactionManager: InteractionManager;
  
  // Existing methods...
  // Add new methods for manager integration
  handleCanvasMouseDown: (event: React.MouseEvent) => void;
  handleNodeMouseDown: (event: React.MouseEvent, nodeId: string) => void;
  handleGlobalMouseMove: (event: MouseEvent) => void;
  handleGlobalMouseUp: (event: MouseEvent) => void;
}

// Update provider to include InteractionManager
export const InteractionProvider: React.FC<InteractionProviderProps> = ({ children }) => {
  const [interactionState, setInteractionState] = useState<InteractionContext>({
    state: 'IDLE',
    data: {}
  });
  
  // Create InteractionManager instance
  const interactionManager = useMemo(() => {
    return new InteractionManager(
      // onNodePositionUpdate callback
      (nodeId: string, position: Point) => {
        // This will be connected to the node update API
        console.log('Node position update needed:', nodeId, position);
      },
      // onTransformUpdate callback
      (transform: Transform) => {
        // This will be connected to canvas transform update
        console.log('Transform update needed:', transform);
      },
      // onStateChange callback
      (mode: InteractionMode, data: any) => {
        setInteractionState({
          state: mode,
          data: data || {}
        });
      }
    );
  }, []);
  
  // Event handlers that delegate to InteractionManager
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent) => {
    interactionManager.handleMouseDown(event.nativeEvent, 'canvas');
  }, [interactionManager]);
  
  const handleNodeMouseDown = useCallback((event: React.MouseEvent, nodeId: string) => {
    event.preventDefault();
    event.stopPropagation();
    interactionManager.handleMouseDown(event.nativeEvent, 'node', nodeId);
  }, [interactionManager]);
  
  const handleGlobalMouseMove = useCallback((event: MouseEvent) => {
    interactionManager.handleMouseMove(event);
  }, [interactionManager]);
  
  const handleGlobalMouseUp = useCallback((event: MouseEvent) => {
    interactionManager.handleMouseUp(event);
  }, [interactionManager]);
  
  // ... rest of existing code
  
  const value: InteractionContextType = {
    interactionState,
    interactionManager,
    handleCanvasMouseDown,
    handleNodeMouseDown,
    handleGlobalMouseMove,
    handleGlobalMouseUp,
    // ... existing methods
  };
  
  return (
    <InteractionStateContext.Provider value={value}>
      {children}
    </InteractionStateContext.Provider>
  );
};
```

### Phase 3: Refactor ExplorationMap

#### Key Changes to `frontend/src/components/ExplorationMap.tsx`

1. **Remove duplicate event handlers**:
   - Remove `handleMouseDown`, `handleCanvasMouseDown`, `handleNodeMouseDown`
   - Remove global event listener setup
   - Remove interaction state management

2. **Use InteractionContext handlers**:
```typescript
const {
  interactionState,
  interactionManager,
  handleCanvasMouseDown,
  handleNodeMouseDown,
  handleGlobalMouseMove,
  handleGlobalMouseUp
} = useInteraction();

// Replace canvas event handlers
<div
  ref={canvasRef}
  onMouseDown={handleCanvasMouseDown}
  // Remove onMouseMove, onMouseUp - handled globally
  // ... other props
>
```

3. **Setup global event listeners in useEffect**:
```typescript
useEffect(() => {
  if (interactionState.state !== 'IDLE') {
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }
}, [interactionState.state, handleGlobalMouseMove, handleGlobalMouseUp]);
```

### Phase 4: Simplify DraggableNode

#### Replace DraggableNode component in ExplorationMap.tsx

```typescript
interface SimpleNodeProps {
  node: Node;
  transform: Transform;
  isSelected: boolean;
  isDragging: boolean;
  onMouseDown: (event: React.MouseEvent, nodeId: string) => void;
  onSelect: () => void;
}

const SimpleNode: React.FC<SimpleNodeProps> = ({
  node,
  transform,
  isSelected,
  isDragging,
  onMouseDown,
  onSelect
}) => {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    console.log(`🎯 [SimpleNode] Node ${node.id} mousedown`);
    onMouseDown(e, node.id);
    onSelect();
  }, [node.id, onMouseDown, onSelect]);

  return (
    <div
      id={`node-${node.id}`}
      className={`absolute glass-pane p-4 w-60 cursor-grab active:cursor-grabbing hover:scale-105 transition-all duration-200 group pointer-events-auto select-none ${
        isSelected ? 'ring-2 ring-[#6B6B3A] ring-opacity-70 shadow-lg shadow-[#6B6B3A]/20' : ''
      }`}
      style={{
        left: node.x * transform.scale + transform.x,
        top: node.y * transform.scale + transform.y,
        zIndex: isDragging ? 1000 : 20,
        opacity: isDragging ? 0.8 : 1,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        pointerEvents: 'auto',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Existing node content */}
    </div>
  );
};

// Replace DraggableNode usage with SimpleNode
{nodes.map(node => (
  <SimpleNode
    key={node.id}
    node={node}
    transform={transform}
    isSelected={selectedNode === node.id}
    isDragging={interactionState.state === 'DRAGGING_NODE' && interactionState.data.draggedNodeId === node.id}
    onMouseDown={handleNodeMouseDown}
    onSelect={() => {
      setSelectedNode(node.id);
      setFocusedNode(node.id);
    }}
  />
))}
```

## Testing Strategy

### Unit Tests
1. Test InteractionManager state transitions
2. Test event handling logic
3. Test coordinate calculations

### Integration Tests
1. Test node dragging end-to-end
2. Test canvas panning functionality
3. Test connection mode
4. Test keyboard shortcuts

### Manual Testing Checklist
- [ ] All nodes are clickable and draggable
- [ ] Nodes don't "clip to center" when clicked
- [ ] Multiple nodes can be dragged independently
- [ ] Canvas panning still works
- [ ] Connection mode still works
- [ ] Keyboard shortcuts still work
- [ ] No performance degradation

## Success Criteria

1. **Functional**: Every node in the canvas can be dragged smoothly without interference
2. **Consistent**: Dragging behavior is identical across all nodes
3. **Performance**: No noticeable lag or performance issues
4. **Maintainable**: Code is cleaner and easier to understand
5. **Extensible**: Easy to add new interaction types

## Implementation Notes

- Implement changes incrementally, testing after each phase
- Keep extensive logging during development for debugging
- Use feature flags if needed to switch between old/new systems
- Maintain backward compatibility where possible
- Document any breaking changes

This specification provides a complete roadmap for implementing the new architecture that will resolve the persistent node dragging issues.