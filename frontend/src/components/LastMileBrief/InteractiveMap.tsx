import React, { useRef, useEffect, useState } from 'react';
import { Node, Edge } from '../../lib/api';
import { generateDisplayTitle } from '../../utils/nodeUtils';

export interface ProcessedNode extends Node {
  clusterId?: string;
  importance: number;
  connections: number;
  insights: NodeInsight[];
}

export interface ProcessedEdge extends Edge {
  strength: number;
  significance: number;
  insights: EdgeInsight[];
}

export interface NodeInsight {
  id: string;
  type: string;
  description: string;
  confidence: number;
}

export interface EdgeInsight {
  id: string;
  type: string;
  description: string;
  confidence: number;
}

export interface MapLayout {
  type: 'force-directed-graph' | 'hierarchical-tree' | 'circular' | 'grid';
  width?: number;
  height?: number;
  [key: string]: any;
}

export interface MapInteraction {
  clickable: boolean;
  hoverable: boolean;
  zoomable: boolean;
  draggable: boolean;
}

export interface InteractiveMapProps {
  nodes: Node[];
  edges: Edge[];
  layout: MapLayout;
  interactions: MapInteraction;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  nodes,
  edges,
  layout,
  interactions,
  onNodeClick,
  onEdgeClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  // Process nodes to add computed properties
  const processedNodes: ProcessedNode[] = nodes.map(node => ({
    ...node,
    importance: calculateNodeImportance(node, edges),
    connections: edges.filter(edge => 
      edge.from_node_id === node.id || edge.to_node_id === node.id
    ).length,
    insights: [] // Would be populated from analytics
  }));

  // Process edges to add computed properties
  const processedEdges: ProcessedEdge[] = edges.map(edge => ({
    ...edge,
    strength: calculateEdgeStrength(edge),
    significance: calculateEdgeSignificance(edge),
    insights: [] // Would be populated from analytics
  }));

  function calculateNodeImportance(node: Node, edges: Edge[]): number {
    const connections = edges.filter(edge => 
      edge.from_node_id === node.id || edge.to_node_id === node.id
    ).length;
    const confidence = node.confidence || 50;
    return (connections * 0.6 + confidence * 0.4) / 100;
  }

  function calculateEdgeStrength(edge: Edge): number {
    // Simple strength calculation based on edge type
    const typeWeights = {
      'support': 0.8,
      'dependency': 0.9,
      'contradiction': 0.7,
      'ai-relationship': 0.6
    };
    return typeWeights[edge.type as keyof typeof typeWeights] || 0.5;
  }

  function calculateEdgeSignificance(edge: Edge): number {
    // Calculate significance based on description length and type
    const descriptionScore = Math.min(edge.description.length / 100, 1);
    const typeScore = edge.type === 'dependency' ? 1 : 0.7;
    return (descriptionScore + typeScore) / 2;
  }

  // Calculate node positions based on layout type
  const calculateNodePositions = () => {
    const width = layout.width || 800;
    const height = layout.height || 600;
    const centerX = width / 2;
    const centerY = height / 2;

    switch (layout.type) {
      case 'circular':
        return processedNodes.map((node, index) => {
          const angle = (2 * Math.PI * index) / processedNodes.length;
          const radius = Math.min(width, height) * 0.3;
          return {
            ...node,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
          };
        });

      case 'grid':
        const cols = Math.ceil(Math.sqrt(processedNodes.length));
        const cellWidth = width / cols;
        const cellHeight = height / Math.ceil(processedNodes.length / cols);
        return processedNodes.map((node, index) => ({
          ...node,
          x: (index % cols) * cellWidth + cellWidth / 2,
          y: Math.floor(index / cols) * cellHeight + cellHeight / 2
        }));

      case 'force-directed-graph':
      default:
        // Use existing node positions or generate random ones
        return processedNodes.map(node => ({
          ...node,
          x: node.x || Math.random() * width,
          y: node.y || Math.random() * height
        }));
    }
  };

  const positionedNodes = calculateNodePositions();

  const handleNodeClick = (nodeId: string) => {
    if (interactions.clickable) {
      setSelectedNode(selectedNode === nodeId ? null : nodeId);
      onNodeClick?.(nodeId);
    }
  };

  const handleNodeMouseEnter = (nodeId: string) => {
    if (interactions.hoverable) {
      setHoveredNode(nodeId);
    }
  };

  const handleNodeMouseLeave = () => {
    if (interactions.hoverable) {
      setHoveredNode(null);
    }
  };

  const handleEdgeClick = (edgeId: string) => {
    if (interactions.clickable) {
      onEdgeClick?.(edgeId);
    }
  };

  const getNodeColor = (node: ProcessedNode) => {
    const typeColors = {
      'human': '#C6AC8E',
      'ai': '#EAE0D5',
      'decision': '#10B981',
      'risk': '#EF4444',
      'dependency': '#3B82F6'
    };
    return typeColors[node.type as keyof typeof typeColors] || '#9CA3AF';
  };

  const getNodeSize = (node: ProcessedNode) => {
    const baseSize = 8;
    const importanceMultiplier = 1 + node.importance;
    return baseSize * importanceMultiplier;
  };

  const getEdgeColor = (edge: ProcessedEdge) => {
    const typeColors = {
      'support': '#10B981',
      'dependency': '#3B82F6',
      'contradiction': '#EF4444',
      'ai-relationship': '#F59E0B'
    };
    return typeColors[edge.type as keyof typeof typeColors] || '#9CA3AF';
  };

  const getEdgeWidth = (edge: ProcessedEdge) => {
    return 1 + edge.strength * 3;
  };

  const renderEdges = () => {
    return processedEdges.map(edge => {
      const fromNode = positionedNodes.find(n => n.id === edge.from_node_id);
      const toNode = positionedNodes.find(n => n.id === edge.to_node_id);
      
      if (!fromNode || !toNode) return null;

      return (
        <line
          key={edge.id}
          x1={fromNode.x}
          y1={fromNode.y}
          x2={toNode.x}
          y2={toNode.y}
          stroke={getEdgeColor(edge)}
          strokeWidth={getEdgeWidth(edge)}
          opacity={0.6}
          className="map-connection"
          onClick={() => handleEdgeClick(edge.id)}
          style={{ cursor: interactions.clickable ? 'pointer' : 'default' }}
        />
      );
    });
  };

  const renderNodes = () => {
    return positionedNodes.map(node => {
      const isSelected = selectedNode === node.id;
      const isHovered = hoveredNode === node.id;
      const nodeSize = getNodeSize(node);
      
      return (
        <g key={node.id}>
          {/* Node circle */}
          <circle
            cx={node.x}
            cy={node.y}
            r={nodeSize}
            fill={getNodeColor(node)}
            stroke={isSelected ? '#EAE0D5' : 'transparent'}
            strokeWidth={isSelected ? 3 : 0}
            opacity={isHovered ? 0.8 : 1}
            className="map-node"
            onClick={() => handleNodeClick(node.id)}
            onMouseEnter={() => handleNodeMouseEnter(node.id)}
            onMouseLeave={handleNodeMouseLeave}
            style={{ 
              cursor: interactions.clickable ? 'pointer' : 'default',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
              transformOrigin: `${node.x}px ${node.y}px`,
              transition: 'all 0.2s ease'
            }}
          />
          
          {/* Node label */}
          <text
            x={node.x}
            y={node.y + nodeSize + 15}
            textAnchor="middle"
            fontSize="12"
            fill="#EAE0D5"
            className="node-label"
            style={{ pointerEvents: 'none' }}
          >
            {generateDisplayTitle(node.title, node.description, 'list')}
          </text>
          
          {/* Connection count indicator */}
          {node.connections > 0 && (
            <circle
              cx={node.x + nodeSize - 2}
              cy={node.y - nodeSize + 2}
              r="6"
              fill="#22333B"
              stroke={getNodeColor(node)}
              strokeWidth="1"
            />
          )}
          {node.connections > 0 && (
            <text
              x={node.x + nodeSize - 2}
              y={node.y - nodeSize + 6}
              textAnchor="middle"
              fontSize="8"
              fill="#EAE0D5"
              style={{ pointerEvents: 'none' }}
            >
              {node.connections}
            </text>
          )}
        </g>
      );
    });
  };

  return (
    <div className="interactive-map">
      <svg
        ref={svgRef}
        width={layout.width || 800}
        height={layout.height || 600}
        className="map-svg"
        style={{ background: 'rgba(34, 51, 59, 0.2)' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Render edges first (behind nodes) */}
          {renderEdges()}
          
          {/* Render nodes */}
          {renderNodes()}
        </g>
      </svg>
      
      {/* Node details tooltip */}
      {hoveredNode && (
        <div className="node-tooltip">
          {(() => {
            const node = positionedNodes.find(n => n.id === hoveredNode);
            if (!node) return null;
            
            return (
              <div>
                <h4>{generateDisplayTitle(node.title, node.description, 'tooltip')}</h4>
                <p>{node.description}</p>
                <div className="node-stats">
                  <span>Type: {node.type}</span>
                  <span>Connections: {node.connections}</span>
                  {node.confidence && <span>Confidence: {node.confidence}%</span>}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      
      {/* Map controls */}
      {interactions.zoomable && (
        <div className="map-controls">
          <button
            onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 3) }))}
            className="map-control-btn"
          >
            +
          </button>
          <button
            onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.3) }))}
            className="map-control-btn"
          >
            -
          </button>
          <button
            onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
            className="map-control-btn"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;