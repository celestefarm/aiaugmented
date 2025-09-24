import React, { useEffect, useRef, useState } from 'react';
import { Node, Edge } from '@/lib/api';
import { InteractionContext, InteractionState } from '@/contexts/InteractionContext';

interface SVGEdgesProps {
  nodes: Node[];
  edges: Edge[];
  getEdgeStyle: (type: string, strength?: number) => {
    stroke: string;
    strokeWidth: number;
    strokeDasharray: string;
    filter: string;
  };
  onDeleteEdge: (edgeId: string) => void;
  NODE_WIDTH: number;
  NODE_HEIGHT: number;
  interactionState: InteractionContext;
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
}

const SVGEdges: React.FC<SVGEdgesProps> = React.memo(({
  nodes,
  edges,
  getEdgeStyle,
  onDeleteEdge,
  NODE_WIDTH,
  NODE_HEIGHT,
  interactionState,
  screenToCanvas
}) => {
  // REAL-TIME SYNC: State for forcing re-renders synchronized with animation frames
  const [animationTick, setAnimationTick] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const lastDraggedNodeRef = useRef<string | null>(null);
  const dragEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // CLICK-STABILITY FIX: Add timing thresholds to prevent animation on brief clicks
  const dragStartTimeRef = useRef<number | null>(null);
  const dragConfirmedRef = useRef(false);
  const MIN_DRAG_TIME = 100; // Minimum time in ms before considering it a real drag
  const MIN_DRAG_DISTANCE = 5; // Minimum distance in pixels before considering it a real drag
  const initialMousePosRef = useRef<{ x: number; y: number } | null>(null);
  
  // SMOOTH INTERPOLATION: Position smoothing for natural movement
  const smoothPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const targetPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const smoothingFactor = 0.15; // Lower = smoother but more lag, Higher = more responsive but less smooth

  console.log('🔄 [SVGEdges] Component rendering with:', {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    interactionState: interactionState.state,
    draggedNodeId: interactionState.data.draggedNodeId,
    animationTick,
    timestamp: new Date().toISOString()
  });

  // CLICK-STABILITY FIX: Only start animation loop for confirmed drag operations with timing/distance thresholds
  useEffect(() => {
    const isDragging = interactionState.state === 'DRAGGING_NODE';
    const draggedNodeId = interactionState.data.draggedNodeId;
    const currentTime = Date.now();
    
    isDraggingRef.current = isDragging;

    // CLICK-STABILITY FIX: Enhanced drag detection with timing and distance thresholds
    if (isDragging && draggedNodeId) {
      // Initialize drag tracking if this is a new drag
      if (!dragStartTimeRef.current || lastDraggedNodeRef.current !== draggedNodeId) {
        console.log('🎬 [SVGEdges] Drag initiated - starting validation period');
        dragStartTimeRef.current = currentTime;
        dragConfirmedRef.current = false;
        lastDraggedNodeRef.current = draggedNodeId;
        
        // Get initial mouse position for distance calculation
        const nodeElement = document.getElementById(`node-${draggedNodeId}`);
        if (nodeElement) {
          const rect = nodeElement.getBoundingClientRect();
          initialMousePosRef.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
        }
        
        // Clear any existing drag end timeout
        if (dragEndTimeoutRef.current) {
          clearTimeout(dragEndTimeoutRef.current);
          dragEndTimeoutRef.current = null;
        }
      }
      
      // CLICK-STABILITY FIX: Only start animation loop after confirming it's a real drag
      const dragDuration = currentTime - (dragStartTimeRef.current || 0);
      let dragDistance = 0;
      
      // Calculate drag distance if we have initial position
      if (initialMousePosRef.current) {
        const nodeElement = document.getElementById(`node-${draggedNodeId}`);
        if (nodeElement) {
          const rect = nodeElement.getBoundingClientRect();
          const currentX = rect.left + rect.width / 2;
          const currentY = rect.top + rect.height / 2;
          dragDistance = Math.sqrt(
            Math.pow(currentX - initialMousePosRef.current.x, 2) +
            Math.pow(currentY - initialMousePosRef.current.y, 2)
          );
        }
      }
      
      // CLICK-STABILITY FIX: Only confirm drag if time OR distance threshold is met
      const isDragConfirmed = dragDuration >= MIN_DRAG_TIME || dragDistance >= MIN_DRAG_DISTANCE;
      
      if (isDragConfirmed && !dragConfirmedRef.current) {
        console.log('🎬 [SVGEdges] ✅ DRAG CONFIRMED - Starting animation frame sync', {
          dragDuration,
          dragDistance,
          thresholds: { time: MIN_DRAG_TIME, distance: MIN_DRAG_DISTANCE }
        });
        dragConfirmedRef.current = true;
        
        const animationLoop = () => {
          // CLICK-STABILITY FIX: Animation frame restricted to confirmed drags
          if (isDraggingRef.current &&
              interactionState.state === 'DRAGGING_NODE' &&
              dragConfirmedRef.current) {
            setAnimationTick(prev => prev + 1);
            animationFrameRef.current = requestAnimationFrame(animationLoop);
          } else {
            // Stop animation if conditions are no longer met
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
          }
        };
        
        animationFrameRef.current = requestAnimationFrame(animationLoop);
      } else if (!isDragConfirmed) {
        console.log('🎬 [SVGEdges] Drag not yet confirmed - waiting...', {
          dragDuration,
          dragDistance,
          needed: { time: MIN_DRAG_TIME, distance: MIN_DRAG_DISTANCE }
        });
      }
      
      // REAL-TIME FIX: Start animation immediately for any drag, but only read DOM for confirmed drags
      if (!animationFrameRef.current && isDragging && draggedNodeId) {
        console.log('🎬 [SVGEdges] Starting immediate animation for potential drag');
        const animationLoop = () => {
          if (isDraggingRef.current && interactionState.state === 'DRAGGING_NODE') {
            setAnimationTick(prev => prev + 1);
            animationFrameRef.current = requestAnimationFrame(animationLoop);
          } else {
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
          }
        };
        animationFrameRef.current = requestAnimationFrame(animationLoop);
      }
      
    } else if (!isDragging && lastDraggedNodeRef.current) {
      console.log('🚨 [FLICKER-DEBUG] DRAG ENDED - POTENTIAL FLICKER POINT', {
        wasConfirmed: dragConfirmedRef.current,
        dragDuration: dragStartTimeRef.current ? currentTime - dragStartTimeRef.current : 0,
        animationFrameActive: !!animationFrameRef.current,
        timestamp: new Date().toISOString()
      });
      
      // FLICKER FIX: Immediate cleanup without nested animation frames
      console.log('🚨 [FLICKER-DEBUG] Implementing immediate cleanup to prevent flicker');
      
      // Cancel any existing animation frame immediately
      if (animationFrameRef.current) {
        console.log('🚨 [FLICKER-DEBUG] Cancelling existing animation frame:', animationFrameRef.current);
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clear timeout immediately
      if (dragEndTimeoutRef.current) {
        console.log('🚨 [FLICKER-DEBUG] Clearing drag end timeout');
        clearTimeout(dragEndTimeoutRef.current);
        dragEndTimeoutRef.current = null;
      }
      
      // FLICKER FIX: Single synchronous cleanup without animation frame delays
      console.log('🚨 [FLICKER-DEBUG] Performing immediate synchronous cleanup');
      lastDraggedNodeRef.current = null;
      dragStartTimeRef.current = null;
      dragConfirmedRef.current = false;
      initialMousePosRef.current = null;
      
      // FLICKER FIX: Force one final render immediately to capture final state
      console.log('🚨 [FLICKER-DEBUG] Forcing final render to capture end state');
      setAnimationTick(prev => prev + 1);
      
      console.log('🚨 [FLICKER-DEBUG] Immediate cleanup completed - no nested frames');
    } else {
      // CLICK-STABILITY FIX: Immediately clean up if not dragging
      if (lastDraggedNodeRef.current) {
        console.log('🎬 [SVGEdges] Immediate cleanup - not a drag operation');
        lastDraggedNodeRef.current = null;
        dragStartTimeRef.current = null;
        dragConfirmedRef.current = false;
        initialMousePosRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (dragEndTimeoutRef.current) {
        clearTimeout(dragEndTimeoutRef.current);
        dragEndTimeoutRef.current = null;
      }
    };
  }, [interactionState.state, interactionState.data.draggedNodeId]);

  return (
    <>
      {edges.map(edge => {
        const fromNode = nodes.find(n => n.id === edge.from_node_id);
        const toNode = nodes.find(n => n.id === edge.to_node_id);
        
        if (!fromNode || !toNode) {
          console.warn(`[SVGEdges] Missing node for edge ${edge.id}:`, {
            fromNodeId: edge.from_node_id,
            toNodeId: edge.to_node_id,
            fromNodeFound: !!fromNode,
            toNodeFound: !!toNode
          });
          return null;
        }

        const style = getEdgeStyle(edge.type);
        
        // REAL-TIME DOM SYNC: Get positions directly from DOM during drag for zero-delay updates
        let fromX = fromNode.x;
        let fromY = fromNode.y;
        let toX = toNode.x;
        let toY = toNode.y;
        
        // JUMP DIAGNOSTIC: Log initial positions
        const edgeId = edge.id;
        const isFromNodeDragged = interactionState.data.draggedNodeId === fromNode.id;
        const isToNodeDragged = interactionState.data.draggedNodeId === toNode.id;
        
        if (isFromNodeDragged || isToNodeDragged) {
          console.log(`🔍 [JUMP-DEBUG] Edge ${edgeId} initial positions:`, {
            fromNode: { id: fromNode.id, x: fromX, y: fromY },
            toNode: { id: toNode.id, x: toX, y: toY },
            draggedNodeId: interactionState.data.draggedNodeId,
            interactionState: interactionState.state,
            timestamp: new Date().toISOString()
          });
        }
        
        // COORDINATE SYSTEM FIX: Simplified DOM reading with consistent coordinate system
        const isDragging = interactionState.state === 'DRAGGING_NODE';
        const draggedNodeId = interactionState.data.draggedNodeId;
        
        // COORDINATE SYSTEM FIX: Since InteractionManager now uses left/top positioning consistently,
        // we can always read DOM positions during drag without coordinate conversion issues
        const isActiveDrag = isDragging &&
                            draggedNodeId &&
                            isDraggingRef.current &&
                            lastDraggedNodeRef.current === draggedNodeId;
        
        // COORDINATE SYSTEM FIX: Read DOM during active drag for real-time updates
        const shouldReadDOM = isActiveDrag;
        
        // COORDINATE SYSTEM FIX: Reduced logging since coordinate system is now consistent
        if ((isFromNodeDragged || isToNodeDragged) && animationTick % 50 === 0) {
          console.log('🔍 [COORDINATE-SYSTEM-FIX] DOM reading decision:', {
            edgeId,
            isDragging,
            isActiveDrag,
            shouldReadDOM,
            draggedNodeId,
            coordinateSystemNote: 'Using consistent left/top positioning'
          });
        }
        
        if (shouldReadDOM) {
          // COORDINATE SYSTEM FIX: Simplified DOM position reading
          if (draggedNodeId === fromNode.id) {
            const nodeElement = document.getElementById(`node-${fromNode.id}`);
            if (nodeElement) {
              const rect = nodeElement.getBoundingClientRect();
              const canvasElement = document.querySelector('[role="application"]') as HTMLElement;
              const canvasRect = canvasElement?.getBoundingClientRect();
              
              if (canvasRect) {
                // COORDINATE SYSTEM FIX: Direct coordinate conversion since positioning is consistent
                const screenX = rect.left + rect.width / 2;
                const screenY = rect.top + rect.height / 2;
                const canvasPos = screenToCanvas(screenX, screenY);
                fromX = canvasPos.x;
                fromY = canvasPos.y;
                
                // COORDINATE SYSTEM FIX: Reduced logging frequency
                if (animationTick % 30 === 0) {
                  console.log('🎯 [COORDINATE-SYSTEM-FIX] FromNode position:', {
                    nodeId: fromNode.id,
                    canvasPos: { x: fromX, y: fromY },
                    tick: animationTick
                  });
                }
              }
            }
          }
          
          // COORDINATE SYSTEM FIX: Simplified DOM position reading
          if (draggedNodeId === toNode.id) {
            const nodeElement = document.getElementById(`node-${toNode.id}`);
            if (nodeElement) {
              const rect = nodeElement.getBoundingClientRect();
              const canvasElement = document.querySelector('[role="application"]') as HTMLElement;
              const canvasRect = canvasElement?.getBoundingClientRect();
              
              if (canvasRect) {
                // COORDINATE SYSTEM FIX: Direct coordinate conversion since positioning is consistent
                const screenX = rect.left + rect.width / 2;
                const screenY = rect.top + rect.height / 2;
                const canvasPos = screenToCanvas(screenX, screenY);
                toX = canvasPos.x;
                toY = canvasPos.y;
                
                // COORDINATE SYSTEM FIX: Reduced logging frequency
                if (animationTick % 30 === 0) {
                  console.log('🎯 [COORDINATE-SYSTEM-FIX] ToNode position:', {
                    nodeId: toNode.id,
                    canvasPos: { x: toX, y: toY },
                    tick: animationTick
                  });
                }
              }
            }
          }
        }
        // CLICK-STABILITY FIX: Removed grace period DOM reading to prevent flickering on clicks
        
        // Calculate center points of nodes for connection lines
        const fromCenterX = fromX + NODE_WIDTH / 2 + 2000;
        const fromCenterY = fromY + NODE_HEIGHT / 2 + 2000;
        const toCenterX = toX + NODE_WIDTH / 2 + 2000;
        const toCenterY = toY + NODE_HEIGHT / 2 + 2000;
        
        // JUMP DIAGNOSTIC: Log final SVG coordinates
        if (isFromNodeDragged || isToNodeDragged) {
          console.log(`🔍 [JUMP-DEBUG] Edge ${edgeId} final SVG coordinates:`, {
            fromCenter: { x: fromCenterX, y: fromCenterY },
            toCenter: { x: toCenterX, y: toCenterY },
            shouldReadDOM,
            isActiveDrag,
            dragConfirmed: dragConfirmedRef.current,
            animationTick,
            timestamp: new Date().toISOString()
          });
        }

        return (
          <g key={edge.id}>
            <line
              x1={fromCenterX}
              y1={fromCenterY}
              x2={toCenterX}
              y2={toCenterY}
              {...style}
              className="transition-all duration-200 cursor-pointer hover:stroke-opacity-80 pointer-events-auto"
              onClick={() => onDeleteEdge(edge.id)}
            />
            {/* Arrow marker */}
            <polygon
              points={`${toCenterX-8},${toCenterY-4} ${toCenterX},${toCenterY} ${toCenterX-8},${toCenterY+4}`}
              fill={style.stroke}
              opacity="0.7"
            />
          </g>
        );
      })}
    </>
  );
}, (prevProps, nextProps) => {
  // REAL-TIME SYNC: Never memoize during drag operations - let animation frame control updates
  if (prevProps.interactionState.state === 'DRAGGING_NODE' ||
      nextProps.interactionState.state === 'DRAGGING_NODE') {
    console.log('🎬 [SVGEdges] Animation frame sync active - allowing all re-renders');
    return false; // Always re-render during drag for animation frame synchronization
  }
  
  // CLICK-STABILITY FIX: Much more restrictive memoization to prevent flickering
  const nodesChanged = prevProps.nodes.length !== nextProps.nodes.length ||
    prevProps.nodes.some((node, index) => {
      const nextNode = nextProps.nodes[index];
      return !nextNode || node.id !== nextNode.id || node.x !== nextNode.x || node.y !== nextNode.y;
    });
  
  const edgesChanged = prevProps.edges.length !== nextProps.edges.length ||
    prevProps.edges.some((edge, index) => {
      const nextEdge = nextProps.edges[index];
      return !nextEdge || edge.id !== nextEdge.id ||
        edge.from_node_id !== nextEdge.from_node_id ||
        edge.to_node_id !== nextEdge.to_node_id ||
        edge.type !== nextEdge.type;
    });
  
  // JUMP FIX: Enhanced drag state change detection with logging
  const prevIsDragging = prevProps.interactionState.state === 'DRAGGING_NODE';
  const nextIsDragging = nextProps.interactionState.state === 'DRAGGING_NODE';
  const prevDraggedNodeId = prevProps.interactionState.data?.draggedNodeId;
  const nextDraggedNodeId = nextProps.interactionState.data?.draggedNodeId;
  
  // JUMP DIAGNOSTIC: Log state transitions that might cause jumping
  if (prevIsDragging !== nextIsDragging || prevDraggedNodeId !== nextDraggedNodeId) {
    console.log('🚨 [JUMP-DEBUG] SVGEdges memoization - State transition detected:', {
      prevState: prevProps.interactionState.state,
      nextState: nextProps.interactionState.state,
      prevDraggedNodeId,
      nextDraggedNodeId,
      transitionType: prevIsDragging && !nextIsDragging ? 'DRAG_END' :
                     !prevIsDragging && nextIsDragging ? 'DRAG_START' : 'DRAG_CHANGE',
      timestamp: new Date().toISOString()
    });
  }
  
  // CLICK-STABILITY FIX: Only consider it a significant change if we're actually starting/stopping a drag
  const dragStateChanged = (prevIsDragging !== nextIsDragging) || (prevDraggedNodeId !== nextDraggedNodeId);
  
  const shouldUpdate = nodesChanged || edgesChanged || dragStateChanged;
  
  // CLICK-STABILITY FIX: Reduced logging to prevent console spam
  if (shouldUpdate && (nodesChanged || edgesChanged)) {
    console.log('🔄 [SVGEdges] Re-rendering due to data changes:', {
      nodesChanged,
      edgesChanged,
      dragStateChanged
    });
  }
  
  // Return true if props are equal (don't re-render), false if they changed (re-render)
  return !shouldUpdate;
});

SVGEdges.displayName = 'SVGEdges';

export default SVGEdges;