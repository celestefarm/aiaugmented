import React, { useMemo } from 'react';
import { Edge, Node } from '@/lib/api';
import { ConnectorAnchor, ConnectorState } from '@/managers/ConnectorManager';

interface ConnectorRendererProps {
  nodes: Node[];
  edges: Edge[];
  anchors: ConnectorAnchor[];
  connectorState: ConnectorState;
  transform: { x: number; y: number; scale: number };
  onEdgeClick?: (edge: Edge, position: { x: number; y: number }) => void;
  className?: string;
}

export const ConnectorRenderer: React.FC<ConnectorRendererProps> = ({
  nodes,
  edges,
  anchors,
  connectorState,
  transform,
  onEdgeClick,
  className = ''
}) => {
  // Convert canvas coordinates to screen coordinates
  const toScreenCoords = (x: number, y: number) => ({
    x: x * transform.scale + transform.x,
    y: y * transform.scale + transform.y
  });

  // Get edge style based on type and state
  const getEdgeStyle = (edge: Edge, isHovered: boolean = false) => {
    const baseOpacity = edge.relationship_strength ? Math.max(0.4, edge.relationship_strength) : 0.6;
    const strokeWidth = edge.relationship_strength ? Math.max(1.5, edge.relationship_strength * 3) : 2;
    
    let strokeColor: string;
    let strokeDashArray: string | undefined;
    
    switch (edge.type) {
      case 'support':
        strokeColor = `rgba(34, 197, 94, ${baseOpacity})`;
        break;
      case 'contradiction':
        strokeColor = `rgba(239, 68, 68, ${baseOpacity})`;
        strokeDashArray = '8,4';
        break;
      case 'dependency':
        strokeColor = `rgba(59, 130, 246, ${baseOpacity})`;
        strokeDashArray = '4,4';
        break;
      case 'ai-relationship':
        strokeColor = `rgba(147, 51, 234, ${baseOpacity})`;
        strokeDashArray = '6,3';
        break;
      default:
        strokeColor = `rgba(156, 163, 175, ${baseOpacity})`;
    }

    if (isHovered) {
      strokeColor = strokeColor.replace(/[\d.]+\)$/, '1.0)');
    }

    return {
      stroke: strokeColor,
      strokeWidth: isHovered ? strokeWidth + 1 : strokeWidth,
      strokeDasharray: strokeDashArray,
      filter: isHovered ? 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.3))' : undefined
    };
  };

  // Calculate edge path with proper anchor points
  const calculateEdgePath = (edge: Edge) => {
    const fromNode = nodes.find(n => n.id === edge.from_node_id);
    const toNode = nodes.find(n => n.id === edge.to_node_id);
    
    if (!fromNode || !toNode) return null;

    // Calculate optimal connection points
    const fromCenter = { x: fromNode.x + 120, y: fromNode.y + 60 };
    const toCenter = { x: toNode.x + 120, y: toNode.y + 60 };
    
    // Determine best anchor points based on node positions
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    
    let fromPoint: { x: number; y: number };
    let toPoint: { x: number; y: number };
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        fromPoint = { x: fromNode.x + 240, y: fromCenter.y };
        toPoint = { x: toNode.x, y: toCenter.y };
      } else {
        fromPoint = { x: fromNode.x, y: fromCenter.y };
        toPoint = { x: toNode.x + 240, y: toCenter.y };
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        fromPoint = { x: fromCenter.x, y: fromNode.y + 120 };
        toPoint = { x: toCenter.x, y: toNode.y };
      } else {
        fromPoint = { x: fromCenter.x, y: fromNode.y };
        toPoint = { x: toCenter.x, y: toNode.y + 120 };
      }
    }

    return { fromPoint, toPoint };
  };

  // Render arrow marker
  const renderArrowMarker = (id: string, color: string) => (
    <defs key={`marker-${id}`}>
      <marker
        id={`arrow-${id}`}
        viewBox="0 0 10 10"
        refX="9"
        refY="3"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" fill={color} />
      </marker>
    </defs>
  );

  // Memoized edge rendering
  const renderedEdges = useMemo(() => {
    return edges.map(edge => {
      const path = calculateEdgePath(edge);
      if (!path) return null;

      const { fromPoint, toPoint } = path;
      const fromScreen = toScreenCoords(fromPoint.x, fromPoint.y);
      const toScreen = toScreenCoords(toPoint.x, toPoint.y);
      
      const style = getEdgeStyle(edge);
      const edgeId = `edge-${edge.id}`;
      
      return (
        <g key={edge.id}>
          {renderArrowMarker(edgeId, style.stroke)}
          <line
            x1={fromScreen.x}
            y1={fromScreen.y}
            x2={toScreen.x}
            y2={toScreen.y}
            {...style}
            markerEnd={`url(#arrow-${edgeId})`}
            className="cursor-pointer hover:opacity-100 transition-opacity"
            onClick={(e) => {
              const rect = (e.target as SVGElement).getBoundingClientRect();
              const clickPosition = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              };
              onEdgeClick?.(edge, clickPosition);
            }}
          />
          
          {/* Invisible wider line for easier clicking */}
          <line
            x1={fromScreen.x}
            y1={fromScreen.y}
            x2={toScreen.x}
            y2={toScreen.y}
            stroke="transparent"
            strokeWidth={Math.max(10, style.strokeWidth * 3)}
            className="cursor-pointer"
            onClick={(e) => {
              const rect = (e.target as SVGElement).getBoundingClientRect();
              const clickPosition = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              };
              onEdgeClick?.(edge, clickPosition);
            }}
          />
        </g>
      );
    }).filter(Boolean);
  }, [edges, nodes, transform, onEdgeClick]);

  // Memoized anchor rendering
  const renderedAnchors = useMemo(() => {
    if (!connectorState.showAnchors) return null;

    return anchors.map(anchor => {
      const screenPos = toScreenCoords(anchor.x, anchor.y);
      const size = anchor.isActive ? 10 : anchor.isHighlighted ? 8 : 6;
      const opacity = anchor.isActive ? 1.0 : anchor.isHighlighted ? 0.9 : 0.6;
      
      let fillColor = 'rgba(156, 163, 175, 0.8)';
      let strokeColor = 'rgba(156, 163, 175, 1.0)';
      
      if (anchor.isActive) {
        fillColor = 'rgba(34, 197, 94, 0.9)';
        strokeColor = 'rgba(34, 197, 94, 1.0)';
      } else if (anchor.isHighlighted) {
        fillColor = 'rgba(59, 130, 246, 0.8)';
        strokeColor = 'rgba(59, 130, 246, 1.0)';
      }

      return (
        <g key={anchor.id}>
          {/* Anchor glow effect */}
          {(anchor.isActive || anchor.isHighlighted) && (
            <circle
              cx={screenPos.x}
              cy={screenPos.y}
              r={size + 4}
              fill={fillColor}
              opacity={0.3}
              className="animate-pulse"
            />
          )}
          
          {/* Main anchor circle */}
          <circle
            cx={screenPos.x}
            cy={screenPos.y}
            r={size}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
            opacity={opacity}
            className="transition-all duration-200"
          />
          
          {/* Inner dot for active anchors */}
          {anchor.isActive && (
            <circle
              cx={screenPos.x}
              cy={screenPos.y}
              r={3}
              fill="white"
              opacity={0.9}
            />
          )}
        </g>
      );
    });
  }, [anchors, connectorState.showAnchors, transform]);

  // Render connection preview line
  const renderPreviewLine = () => {
    if (!connectorState.previewLine) return null;

    const fromScreen = toScreenCoords(connectorState.previewLine.from.x, connectorState.previewLine.from.y);
    const toScreen = toScreenCoords(connectorState.previewLine.to.x, connectorState.previewLine.to.y);
    
    const isSnapping = connectorState.targetAnchor !== null;
    const strokeColor = isSnapping ? 'rgba(34, 197, 94, 0.9)' : 'rgba(156, 163, 175, 0.8)';
    const strokeWidth = isSnapping ? 3 : 2.5;
    const strokeDasharray = isSnapping ? '8,4' : '5,5';

    return (
      <g>
        <defs>
          <marker
            id="preview-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="3"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill={strokeColor} />
          </marker>
        </defs>
        
        <line
          x1={fromScreen.x}
          y1={fromScreen.y}
          x2={toScreen.x}
          y2={toScreen.y}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          markerEnd="url(#preview-arrow)"
          className="pointer-events-none animate-pulse"
          style={{
            filter: isSnapping ? 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.5))' : undefined
          }}
        />
        
        {/* Snap indicator */}
        {isSnapping && connectorState.targetAnchor && (
          <circle
            cx={toScreen.x}
            cy={toScreen.y}
            r={15}
            fill="none"
            stroke="rgba(34, 197, 94, 0.6)"
            strokeWidth="2"
            className="animate-ping pointer-events-none"
          />
        )}
      </g>
    );
  };

  return (
    <svg
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 10 }}
    >
      {/* Rendered edges */}
      {renderedEdges}
      
      {/* Connection anchors */}
      {renderedAnchors}
      
      {/* Preview line during connection drag */}
      {renderPreviewLine()}
      
      {/* Connection mode status indicator */}
      {connectorState.mode === 'CONNECTING' && (
        <text
          x="50%"
          y="30"
          textAnchor="middle"
          className="fill-blue-400 text-sm font-medium pointer-events-none"
          style={{ filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.8))' }}
        >
          🔗 Connect Mode: Click and drag from a node to another node
        </text>
      )}
    </svg>
  );
};

export default ConnectorRenderer;