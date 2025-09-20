import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo, useRef } from 'react';
import { InteractionManager, Point, Transform, InteractionMode, DragContext } from '@/managers/InteractionManager';

// Legacy interaction state types for backward compatibility
export type InteractionState = 'IDLE' | 'PANNING' | 'DRAGGING_NODE' | 'CONNECTING';

// Enhanced interaction context data
export interface InteractionData {
  // Node dragging context
  draggedNodeId?: string;
  dragStartPosition?: Point;
  dragCurrentPosition?: Point;
  dragOffset?: Point;
  nodeType?: 'ai' | 'human';
  
  // Panning context
  panStart?: Point;
  panCurrentTransform?: Transform;
  
  // Connection context
  connectionStart?: string;
}

// Complete interaction context
export interface InteractionContext {
  state: InteractionState;
  data: InteractionData;
}

// Enhanced context type definition
interface InteractionContextType {
  interactionState: InteractionContext;
  interactionManager: InteractionManager;
  
  // New unified event handlers
  handleCanvasMouseDown: (event: React.MouseEvent) => void;
  handleNodeMouseDown: (event: React.MouseEvent, nodeId: string, nodeType: 'ai' | 'human') => void;
  handleGlobalMouseMove: (event: MouseEvent) => void;
  handleGlobalMouseUp: (event: MouseEvent) => void;
  
  // Legacy state transition functions (for backward compatibility)
  transitionToPanning: (panStart: { x: number; y: number }) => void;
  transitionToNodeDragging: (nodeId: string, dragStartPosition: { x: number; y: number }, dragOffset: { x: number; y: number }) => void;
  transitionToConnecting: (connectionStart?: string) => void;
  transitionToIdle: () => void;
  
  // Legacy state update functions (for backward compatibility)
  updatePanStart: (panStart: { x: number; y: number }) => void;
  updateDraggedNodePosition: (position: { x: number; y: number }) => void;
  
  // New manager control methods
  updateTransform: (transform: Transform) => void;
  startConnecting: () => void;
  cancelInteraction: () => void;
  setCreationMode: (isCreating: boolean) => void;
  onNodeAddedFromChat: (nodeId: string, nodeType: 'ai' | 'human') => void;
  
  // Callback registration methods
  registerNodePositionUpdateCallback: (callback: (nodeId: string, position: Point) => void) => void;
  registerTransformUpdateCallback: (callback: (transform: Transform) => void) => void;
  registerNodeSelectCallback: (callback: (nodeId: string) => void) => void;
}

// Create context
const InteractionStateContext = createContext<InteractionContextType | undefined>(undefined);

// Provider props
interface InteractionProviderProps {
  children: ReactNode;
}

// Interaction provider component
export const InteractionProvider: React.FC<InteractionProviderProps> = ({ children }) => {
  const [interactionState, setInteractionState] = useState<InteractionContext>({
    state: 'IDLE',
    data: {}
  });

  // Callback refs for external handlers
  const nodePositionUpdateRef = useRef<((nodeId: string, position: Point) => void) | null>(null);
  const transformUpdateRef = useRef<((transform: Transform) => void) | null>(null);
  const nodeSelectRef = useRef<((nodeId: string) => void) | null>(null);

  // Create InteractionManager instance with callbacks
  const interactionManager = useMemo(() => {
    return new InteractionManager(
      // onNodePositionUpdate callback
      (nodeId: string, position: Point) => {
        console.log('🔄 [InteractionContext] Node position update needed:', nodeId, position);
        if (nodePositionUpdateRef.current) {
          nodePositionUpdateRef.current(nodeId, position);
        }
      },
      // onTransformUpdate callback
      (transform: Transform) => {
        console.log('🔄 [InteractionContext] Transform update needed:', transform);
        if (transformUpdateRef.current) {
          transformUpdateRef.current(transform);
        }
      },
      // onStateChange callback - updates React state
      (mode: InteractionMode, data: any) => {
        console.log('🔄 [InteractionContext] State change:', mode, data);
        
        // Convert InteractionManager mode to legacy state
        let legacyState: InteractionState;
        switch (mode) {
          case 'DRAGGING_NODE':
            legacyState = 'DRAGGING_NODE';
            break;
          case 'PANNING':
            legacyState = 'PANNING';
            break;
          case 'CONNECTING':
            legacyState = 'CONNECTING';
            break;
          default:
            legacyState = 'IDLE';
            break;
        }
        
        // Convert data to legacy format
        let legacyData: InteractionData = {};
        if (data && mode === 'DRAGGING_NODE') {
          const dragContext = data as DragContext;
          legacyData = {
            draggedNodeId: dragContext.nodeId,
            dragStartPosition: dragContext.startPosition,
            dragCurrentPosition: dragContext.currentPosition,
            dragOffset: dragContext.offset,
            nodeType: dragContext.nodeType
          };
        } else if (data && mode === 'CONNECTING') {
          legacyData = {
            connectionStart: data.connectionStart
          };
        }
        
        setInteractionState({
          state: legacyState,
          data: legacyData
        });
      },
      // onNodeSelect callback
      (nodeId: string) => {
        console.log('🔄 [InteractionContext] Node selected:', nodeId);
        if (nodeSelectRef.current) {
          nodeSelectRef.current(nodeId);
        }
      }
    );
  }, []);

  // Methods to register external callbacks
  const registerNodePositionUpdateCallback = useCallback((callback: (nodeId: string, position: Point) => void) => {
    nodePositionUpdateRef.current = callback;
  }, []);

  const registerTransformUpdateCallback = useCallback((callback: (transform: Transform) => void) => {
    transformUpdateRef.current = callback;
  }, []);

  const registerNodeSelectCallback = useCallback((callback: (nodeId: string) => void) => {
    nodeSelectRef.current = callback;
  }, []);

  // New unified event handlers that delegate to InteractionManager
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent) => {
    console.log('🔄 [InteractionContext] Canvas mouse down');
    interactionManager.handleMouseDown(event.nativeEvent, 'canvas');
  }, [interactionManager]);

  const handleNodeMouseDown = useCallback((event: React.MouseEvent, nodeId: string, nodeType: 'ai' | 'human') => {
    console.log('🔄 [InteractionContext] Node mouse down', { nodeId, nodeType });
    event.preventDefault();
    event.stopPropagation();
    interactionManager.handleMouseDown(event.nativeEvent, 'node', nodeId, nodeType);
  }, [interactionManager]);

  const handleGlobalMouseMove = useCallback((event: MouseEvent) => {
    interactionManager.handleMouseMove(event);
  }, [interactionManager]);

  const handleGlobalMouseUp = useCallback((event: MouseEvent) => {
    interactionManager.handleMouseUp(event);
  }, [interactionManager]);

  // New manager control methods
  const updateTransform = useCallback((transform: Transform) => {
    interactionManager.updateTransform(transform);
  }, [interactionManager]);

  const startConnecting = useCallback(() => {
    interactionManager.startConnecting();
  }, [interactionManager]);

  const cancelInteraction = useCallback(() => {
    interactionManager.cancelInteraction();
  }, [interactionManager]);

  const setCreationMode = useCallback((isCreating: boolean) => {
    interactionManager.setCreationMode(isCreating);
  }, [interactionManager]);

  const onNodeAddedFromChat = useCallback((nodeId: string, nodeType: 'ai' | 'human') => {
    interactionManager.onNodeAddedFromChat(nodeId, nodeType);
  }, [interactionManager]);

  // Legacy transition functions (for backward compatibility)
  const transitionToPanning = useCallback((panStart: { x: number; y: number }) => {
    console.log('🔄 [InteractionContext] Legacy: IDLE -> PANNING', { panStart });
    // For backward compatibility, update state directly
    setInteractionState({
      state: 'PANNING',
      data: { panStart }
    });
  }, []);

  const transitionToNodeDragging = useCallback((
    nodeId: string,
    dragStartPosition: { x: number; y: number },
    dragOffset: { x: number; y: number }
  ) => {
    console.log('🔄 [InteractionContext] Legacy: IDLE -> DRAGGING_NODE', {
      nodeId,
      dragStartPosition,
      dragOffset
    });
    // For backward compatibility, update state directly
    setInteractionState({
      state: 'DRAGGING_NODE',
      data: {
        draggedNodeId: nodeId,
        dragStartPosition,
        dragOffset
      }
    });
  }, []);

  const transitionToConnecting = useCallback((connectionStart?: string) => {
    console.log('🔄 [InteractionContext] Legacy: -> CONNECTING', { connectionStart });
    // Use the new manager method
    if (connectionStart) {
      // This is a legacy call, just update state
      setInteractionState({
        state: 'CONNECTING',
        data: { connectionStart }
      });
    } else {
      interactionManager.startConnecting();
    }
  }, [interactionManager]);

  const transitionToIdle = useCallback(() => {
    console.log('🔄 [InteractionContext] Legacy: -> IDLE');
    interactionManager.cancelInteraction();
  }, [interactionManager]);

  // Legacy update functions (for backward compatibility)
  const updatePanStart = useCallback((panStart: { x: number; y: number }) => {
    setInteractionState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        panStart
      }
    }));
  }, []);

  const updateDraggedNodePosition = useCallback((position: { x: number; y: number }) => {
    setInteractionState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        dragStartPosition: position
      }
    }));
  }, []);

  // Complete context value
  const value: InteractionContextType = {
    interactionState,
    interactionManager,
    
    // New unified event handlers
    handleCanvasMouseDown,
    handleNodeMouseDown,
    handleGlobalMouseMove,
    handleGlobalMouseUp,
    
    // Legacy state transition functions
    transitionToPanning,
    transitionToNodeDragging,
    transitionToConnecting,
    transitionToIdle,
    
    // Legacy state update functions
    updatePanStart,
    updateDraggedNodePosition,
    
    // New manager control methods
    updateTransform,
    startConnecting,
    cancelInteraction,
    setCreationMode,
    onNodeAddedFromChat,
    
    // Callback registration methods
    registerNodePositionUpdateCallback,
    registerTransformUpdateCallback,
    registerNodeSelectCallback,
  };

  return (
    <InteractionStateContext.Provider value={value}>
      {children}
    </InteractionStateContext.Provider>
  );
};

// Custom hook to use interaction context
export const useInteraction = (): InteractionContextType => {
  const context = useContext(InteractionStateContext);
  if (context === undefined) {
    throw new Error('useInteraction must be used within an InteractionProvider');
  }
  return context;
};

// Export context for advanced usage
export { InteractionStateContext };