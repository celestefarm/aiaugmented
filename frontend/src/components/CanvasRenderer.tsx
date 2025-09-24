import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Node, Edge } from '@/lib/api';
import { canvasStateManager, CanvasState, Point, Transform, ConnectionPoint } from '@/stores/canvasStore';
import { globalSpatialIndex } from '@/utils/spatialIndex';
import { canvasDiagnostics } from '@/utils/canvasDiagnostics';
import { User, Target, X, Link, Check, Info } from 'lucide-react';

interface CanvasRendererProps {
  nodes: Node[];
  edges: Edge[];
  transform: Transform;
  viewport: { width: number; height: number };
  onNodeClick?: (nodeId: string, event: MouseEvent) => void;
  onNodeMouseDown?: (nodeId: string, event: MouseEvent) => void;
  onCanvasClick?: (event: MouseEvent) => void;
  onCanvasMouseDown?: (event: MouseEvent) => void;
  className?: string;
}

interface NodeStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  shadowColor: string;
}

interface EdgeStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeDashArray?: number[];
  opacity: number;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  nodes,
  edges,
  transform,
  viewport,
  onNodeClick,
  onNodeMouseDown,
  onCanvasClick,
  onCanvasMouseDown,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>(canvasStateManager.getState());
  const animationFrameRef = useRef<number | null>(null);
  const lastRenderTimeRef = useRef<number>(0);
  const nodeHitBoxes = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());

  // Constants
  const NODE_WIDTH = 240;
  const NODE_HEIGHT = 120;
  const NODE_PADDING = 16;
  const NODE_BORDER_RADIUS = 12;
  
  // LOD thresholds
  const LOD_HIGH_THRESHOLD = 0.8;    // Above this scale: full detail
  const LOD_MEDIUM_THRESHOLD = 0.4;  // Above this scale: medium detail
  const LOD_LOW_THRESHOLD = 0.2;     // Above this scale: low detail
  // Below LOD_LOW_THRESHOLD: minimal detail

  // Subscribe to canvas state changes
  useEffect(() => {
    const unsubscribe = canvasStateManager.subscribe((state) => {
      setCanvasState(state);
    });
    return unsubscribe;
  }, []);

  // Update canvas state when props change
  useEffect(() => {
    console.log('🔄 [CANVAS-RENDERER] Nodes prop changed:', nodes.length);
    canvasStateManager.updateNodes(nodes);
  }, [nodes]);

  useEffect(() => {
    console.log('🔄 [CANVAS-RENDERER] Edges prop changed:', edges.length);
    canvasStateManager.updateEdges(edges);
  }, [edges]);

  useEffect(() => {
    canvasStateManager.updateTransform(transform);
  }, [transform]);

  useEffect(() => {
    canvasStateManager.updateViewport({
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });
  }, [viewport]);

  // Get node style based on type and state
  const getNodeStyle = useCallback((node: Node, isSelected: boolean = false, isDragging: boolean = false, isHovered: boolean = false): NodeStyle => {
    let baseStyle: NodeStyle;
    
    switch (node.type) {
      case 'human':
        baseStyle = {
          backgroundColor: 'rgba(107, 107, 58, 0.1)',
          borderColor: 'rgba(107, 107, 58, 0.3)',
          textColor: '#6B6B3A',
          shadowColor: 'rgba(107, 107, 58, 0.2)',
        };
        break;
      case 'ai':
        baseStyle = {
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 0.4)',
          textColor: '#3B82F6',
          shadowColor: 'rgba(59, 130, 246, 0.2)',
        };
        break;
      case 'risk':
        baseStyle = {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.4)',
          textColor: '#EF4444',
          shadowColor: 'rgba(239, 68, 68, 0.2)',
        };
        break;
      case 'dependency':
        baseStyle = {
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderColor: 'rgba(156, 163, 175, 0.4)',
          textColor: '#9CA3AF',
          shadowColor: 'rgba(156, 163, 175, 0.2)',
        };
        break;
      case 'decision':
        baseStyle = {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderColor: 'rgba(245, 158, 11, 0.4)',
          textColor: '#F59E0B',
          shadowColor: 'rgba(245, 158, 11, 0.2)',
        };
        break;
      default:
        baseStyle = {
          backgroundColor: 'rgba(156, 163, 175, 0.05)',
          borderColor: 'rgba(156, 163, 175, 0.3)',
          textColor: '#9CA3AF',
          shadowColor: 'rgba(156, 163, 175, 0.1)',
        };
    }

    // Modify style based on state
    if (isSelected) {
      baseStyle.borderColor = 'rgba(107, 107, 58, 0.8)';
      baseStyle.shadowColor = 'rgba(107, 107, 58, 0.4)';
      baseStyle.backgroundColor = baseStyle.backgroundColor.replace('0.1', '0.15');
    }

    if (isHovered && !isSelected) {
      baseStyle.borderColor = baseStyle.borderColor.replace('0.3', '0.5').replace('0.4', '0.6');
      baseStyle.backgroundColor = baseStyle.backgroundColor.replace('0.1', '0.12').replace('0.05', '0.08');
      baseStyle.shadowColor = baseStyle.shadowColor.replace('0.2', '0.25').replace('0.1', '0.15');
    }

    if (isDragging) {
      baseStyle.backgroundColor = baseStyle.backgroundColor.replace(/0\.\d+/, '0.2');
      baseStyle.shadowColor = baseStyle.shadowColor.replace(/0\.\d+/, '0.5');
    }

    return baseStyle;
  }, []);

  // Get edge style based on type and hover state
  const getEdgeStyle = useCallback((edge: Edge, isHovered: boolean = false): EdgeStyle => {
    let baseStyle: EdgeStyle;
    
    switch (edge.type) {
      case 'support':
        baseStyle = {
          strokeColor: 'rgba(156, 163, 175, 0.6)',
          strokeWidth: 2,
          opacity: 0.8,
        };
        break;
      case 'contradiction':
        baseStyle = {
          strokeColor: 'rgba(239, 68, 68, 0.6)',
          strokeWidth: 2,
          strokeDashArray: [8, 4],
          opacity: 0.8,
        };
        break;
      case 'dependency':
        baseStyle = {
          strokeColor: 'rgba(156, 163, 175, 0.6)',
          strokeWidth: 2,
          strokeDashArray: [4, 4],
          opacity: 0.8,
        };
        break;
      case 'ai-relationship':
        baseStyle = {
          strokeColor: 'rgba(147, 51, 234, 0.6)',
          strokeWidth: 2,
          strokeDashArray: [6, 3],
          opacity: 0.8,
        };
        break;
      default:
        baseStyle = {
          strokeColor: 'rgba(255, 255, 255, 0.5)',
          strokeWidth: 1.5,
          opacity: 0.7,
        };
    }

    // Enhance style when hovered
    if (isHovered) {
      baseStyle.strokeWidth += 1;
      baseStyle.opacity = Math.min(1, baseStyle.opacity + 0.2);
      baseStyle.strokeColor = baseStyle.strokeColor.replace(/0\.\d+/, '0.9');
    }

    return baseStyle;
  }, []);

  // Draw a rounded rectangle
  const drawRoundedRect = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }, []);

  // Determine Level of Detail based on zoom scale
  const getLODLevel = useCallback((scale: number): 'minimal' | 'low' | 'medium' | 'high' => {
    if (scale >= LOD_HIGH_THRESHOLD) return 'high';
    if (scale >= LOD_MEDIUM_THRESHOLD) return 'medium';
    if (scale >= LOD_LOW_THRESHOLD) return 'low';
    return 'minimal';
  }, []);

  // Draw a single node with LOD optimization
  const drawNode = useCallback((
    ctx: CanvasRenderingContext2D,
    node: Node,
    x: number,
    y: number,
    lodLevel: 'minimal' | 'low' | 'medium' | 'high',
    isSelected: boolean = false,
    isDragging: boolean = false,
    isHovered: boolean = false
  ) => {
    const style = getNodeStyle(node, isSelected, isDragging, isHovered);
    
    // Minimal LOD: Just a colored rectangle
    if (lodLevel === 'minimal') {
      ctx.fillStyle = style.borderColor;
      ctx.fillRect(x, y, NODE_WIDTH, NODE_HEIGHT);
      nodeHitBoxes.current.set(node.id, { x, y, width: NODE_WIDTH, height: NODE_HEIGHT });
      return;
    }
    
    // Low LOD: Simple rectangle with type color, no text
    if (lodLevel === 'low') {
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(x, y, NODE_WIDTH, NODE_HEIGHT);
      
      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x, y, NODE_WIDTH, NODE_HEIGHT);
      
      nodeHitBoxes.current.set(node.id, { x, y, width: NODE_WIDTH, height: NODE_HEIGHT });
      return;
    }
    
    // Medium LOD: Rounded rectangle with title only
    if (lodLevel === 'medium') {
      ctx.save();
      
      // Simplified shadow for medium LOD
      if (isDragging || isSelected) {
        ctx.shadowColor = style.shadowColor;
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 2;
      }

      drawRoundedRect(ctx, x, y, NODE_WIDTH, NODE_HEIGHT, NODE_BORDER_RADIUS);
      ctx.fillStyle = style.backgroundColor;
      ctx.fill();

      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      ctx.restore();

      // Draw title only
      ctx.fillStyle = style.textColor;
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      
      const maxTitleWidth = NODE_WIDTH - (NODE_PADDING * 2);
      let title = node.title;
      const titleMetrics = ctx.measureText(title);
      
      if (titleMetrics.width > maxTitleWidth) {
        while (ctx.measureText(title + '...').width > maxTitleWidth && title.length > 0) {
          title = title.slice(0, -1);
        }
        title += '...';
      }
      
      ctx.fillText(title, x + NODE_PADDING, y + NODE_PADDING + 16);
      
      nodeHitBoxes.current.set(node.id, { x, y, width: NODE_WIDTH, height: NODE_HEIGHT });
      return;
    }
    
    // High LOD: Full detail (original implementation)
    ctx.save();
    ctx.shadowColor = style.shadowColor;
    ctx.shadowBlur = isDragging ? 20 : 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = isDragging ? 8 : 4;

    drawRoundedRect(ctx, x, y, NODE_WIDTH, NODE_HEIGHT, NODE_BORDER_RADIUS);
    ctx.fillStyle = style.backgroundColor;
    ctx.fill();

    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    ctx.restore();

    // Draw content
    ctx.fillStyle = style.textColor;
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    // Draw title (truncated if too long)
    const maxTitleWidth = NODE_WIDTH - (NODE_PADDING * 2);
    let title = node.title;
    const titleMetrics = ctx.measureText(title);
    
    if (titleMetrics.width > maxTitleWidth) {
      while (ctx.measureText(title + '...').width > maxTitleWidth && title.length > 0) {
        title = title.slice(0, -1);
      }
      title += '...';
    }
    
    ctx.fillText(title, x + NODE_PADDING, y + NODE_PADDING + 16);

    // Draw key message or description
    if (node.key_message || node.description) {
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = 'rgba(229, 231, 235, 0.8)';
      
      const content = node.key_message || node.description || '';
      const words = content.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      const maxWidth = NODE_WIDTH - (NODE_PADDING * 2);
      const maxLines = 3;
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
          if (lines.length >= maxLines - 1) break;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
      }
      
      lines.forEach((line, index) => {
        if (index === maxLines - 1 && words.length > lines.join(' ').split(' ').length) {
          line = line.slice(0, -3) + '...';
        }
        ctx.fillText(line, x + NODE_PADDING, y + NODE_PADDING + 40 + (index * 16));
      });
    }

    // Draw type badge
    ctx.fillStyle = style.textColor;
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const typeText = node.type.toUpperCase();
    const typeMetrics = ctx.measureText(typeText);
    const badgeX = x + NODE_WIDTH - NODE_PADDING - typeMetrics.width - 8;
    const badgeY = y + NODE_HEIGHT - NODE_PADDING - 16;
    
    // Badge background
    ctx.fillStyle = style.borderColor;
    drawRoundedRect(ctx, badgeX - 4, badgeY - 12, typeMetrics.width + 8, 16, 4);
    ctx.fill();
    
    // Badge text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(typeText, badgeX, badgeY);

    // Store hit box for click detection
    nodeHitBoxes.current.set(node.id, { x, y, width: NODE_WIDTH, height: NODE_HEIGHT });
  }, [getNodeStyle, drawRoundedRect]);

  // Draw a single edge
  const drawEdge = useCallback((
    ctx: CanvasRenderingContext2D,
    edge: Edge,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    isHovered: boolean = false
  ) => {
    const style = getEdgeStyle(edge, isHovered);
    
    ctx.save();
    ctx.strokeStyle = style.strokeColor;
    ctx.lineWidth = style.strokeWidth;
    ctx.globalAlpha = style.opacity;
    
    if (style.strokeDashArray) {
      ctx.setLineDash(style.strokeDashArray);
    }

    // Draw line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw arrow
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 12;
    const arrowAngle = Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowLength * Math.cos(angle - arrowAngle),
      toY - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowLength * Math.cos(angle + arrowAngle),
      toY - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.stroke();

    ctx.restore();
  }, [getEdgeStyle]);

  // Draw connection points for nodes
  const drawConnectionPoints = useCallback((
    ctx: CanvasRenderingContext2D,
    canvasState: CanvasState
  ) => {
    const connectionPoints = canvasStateManager.getAllConnectionPoints();
    
    connectionPoints.forEach(point => {
      const screenX = point.x * transform.scale + transform.x;
      const screenY = point.y * transform.scale + transform.y;
      
      // Only draw if visible on screen
      if (screenX >= -20 && screenX <= viewport.width + 20 &&
          screenY >= -20 && screenY <= viewport.height + 20) {
        
        ctx.save();
        
        // Draw connection point circle
        const radius = point.isHighlighted ? 8 : 6;
        const alpha = point.isHighlighted ? 0.9 : 0.6;
        
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
        
        // Fill
        ctx.fillStyle = point.isHighlighted
          ? `rgba(107, 107, 58, ${alpha})`
          : `rgba(156, 163, 175, ${alpha})`;
        ctx.fill();
        
        // Border
        ctx.strokeStyle = point.isHighlighted
          ? 'rgba(107, 107, 58, 1)'
          : 'rgba(156, 163, 175, 0.8)';
        ctx.lineWidth = point.isHighlighted ? 2 : 1;
        ctx.stroke();
        
        // Inner dot for highlighted points
        if (point.isHighlighted) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, 3, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fill();
        }
        
        ctx.restore();
      }
    });
  }, [transform, viewport]);

  // Draw connection preview line
  const drawConnectionPreview = useCallback((
    ctx: CanvasRenderingContext2D,
    dragContext: any
  ) => {
    if (!dragContext.previewLine) return;
    
    ctx.save();
    
    // Draw preview line
    const isSnapping = dragContext.snapTarget !== null;
    ctx.strokeStyle = isSnapping
      ? 'rgba(107, 107, 58, 0.9)'
      : 'rgba(156, 163, 175, 0.8)';
    ctx.lineWidth = isSnapping ? 3 : 2.5;
    ctx.setLineDash(isSnapping ? [8, 4] : [5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(dragContext.previewLine.from.x, dragContext.previewLine.from.y);
    ctx.lineTo(dragContext.previewLine.to.x, dragContext.previewLine.to.y);
    ctx.stroke();
    
    // Draw arrow at the end
    if (isSnapping) {
      const fromX = dragContext.previewLine.from.x;
      const fromY = dragContext.previewLine.from.y;
      const toX = dragContext.previewLine.to.x;
      const toY = dragContext.previewLine.to.y;
      
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const arrowLength = 12;
      const arrowAngle = Math.PI / 6;

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - arrowLength * Math.cos(angle - arrowAngle),
        toY - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - arrowLength * Math.cos(angle + arrowAngle),
        toY - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.stroke();
    }
    
    // Draw snap indicator
    if (isSnapping && dragContext.snapTarget) {
      const snapPoint = dragContext.snapTarget.connectionPoint;
      const snapScreenX = snapPoint.x * transform.scale + transform.x;
      const snapScreenY = snapPoint.y * transform.scale + transform.y;
      
      ctx.beginPath();
      ctx.arc(snapScreenX, snapScreenY, 12, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(107, 107, 58, 1)';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.stroke();
      
      // Pulsing effect
      const time = Date.now() % 1000;
      const pulseRadius = 12 + Math.sin(time * 0.01) * 4;
      ctx.beginPath();
      ctx.arc(snapScreenX, snapScreenY, pulseRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(107, 107, 58, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    ctx.restore();
  }, [transform]);

  // Draw marquee selection rectangle
  const drawMarqueeSelection = useCallback((
    ctx: CanvasRenderingContext2D,
    marqueeSelection: any
  ) => {
    if (!marqueeSelection || !marqueeSelection.isActive) return;
    
    const startX = marqueeSelection.startPosition.x;
    const startY = marqueeSelection.startPosition.y;
    const currentX = marqueeSelection.currentPosition.x;
    const currentY = marqueeSelection.currentPosition.y;
    
    const minX = Math.min(startX, currentX);
    const minY = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    ctx.save();
    
    // Draw selection rectangle background
    ctx.fillStyle = 'rgba(107, 107, 58, 0.1)';
    ctx.fillRect(minX, minY, width, height);
    
    // Draw selection rectangle border
    ctx.strokeStyle = 'rgba(107, 107, 58, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(minX, minY, width, height);
    
    ctx.restore();
  }, []);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Record frame start for diagnostics
    canvasDiagnostics.recordFrame();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set high DPI scaling
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    // Apply canvas transform for zoom and pan
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Calculate viewport bounds in canvas coordinates for spatial queries
    const buffer = 200; // Larger buffer for smoother experience
    const viewportMinX = (-transform.x - buffer) / transform.scale;
    const viewportMinY = (-transform.y - buffer) / transform.scale;
    const viewportMaxX = (viewport.width - transform.x + buffer) / transform.scale;
    const viewportMaxY = (viewport.height - transform.y + buffer) / transform.scale;

    // Use spatial index to get only visible edges
    const visibleEdges = globalSpatialIndex.queryEdges(viewportMinX, viewportMinY, viewportMaxX, viewportMaxY);
    
    // Draw edges first (behind nodes) - only visible ones
    visibleEdges.forEach(spatialEdge => {
      const edge = spatialEdge.data;
      const isHovered = canvasState.interaction.hoveredEdgeId === edge.id;
      drawEdge(ctx, edge, spatialEdge.fromX, spatialEdge.fromY, spatialEdge.toX, spatialEdge.toY, isHovered);
    });

    // Determine LOD level based on current zoom
    const lodLevel = getLODLevel(transform.scale);
    
    // Use spatial index to get only visible nodes
    const visibleNodes = globalSpatialIndex.queryNodes(viewportMinX, viewportMinY, viewportMaxX, viewportMaxY);
    
    // CRITICAL DEBUG: Log spatial index query results
    console.log('🎨 [CANVAS-RENDERER-DEBUG] Spatial index query:');
    console.log('  Viewport bounds:', { viewportMinX, viewportMinY, viewportMaxX, viewportMaxY });
    console.log('  Transform:', transform);
    console.log('  Visible nodes from spatial index:', visibleNodes.length);
    console.log('  Raw nodes prop:', nodes.length);
    
    // FALLBACK: If spatial index returns no nodes but we have nodes, render all nodes
    const nodesToRender = visibleNodes.length > 0 ? visibleNodes : nodes.map(node => ({ data: node }));
    console.log('  Nodes to render:', nodesToRender.length);
    
    // Draw nodes in canvas coordinates with LOD optimization - only visible ones
    nodesToRender.forEach((spatialNode, index) => {
      const node = spatialNode.data;
      console.log(`  Rendering node ${index + 1}:`, { id: node.id, x: node.x, y: node.y, title: node.title });
      
      const isSelected = canvasState.interaction.selectedNodeIds.has(node.id);
      const isHovered = canvasState.interaction.hoveredNodeId === node.id;
      const isDragging = canvasState.interaction.mode === 'DRAGGING_NODE' &&
                        canvasState.interaction.draggedNodeId === node.id;
      
      drawNode(ctx, node, node.x, node.y, lodLevel, isSelected, isDragging, isHovered);
    });

    // Draw connection points for visible nodes
    drawConnectionPoints(ctx, canvasState);

    ctx.restore(); // Restore canvas transform

    // Draw connection drag preview in screen coordinates
    if (canvasState.interaction.mode === 'DRAGGING_CONNECTION' &&
        canvasState.interaction.connectionDragContext) {
      drawConnectionPreview(ctx, canvasState.interaction.connectionDragContext);
    }

    // Draw marquee selection in screen coordinates
    if (canvasState.interaction.mode === 'MARQUEE_SELECTING' &&
        canvasState.interaction.marqueeSelection) {
      drawMarqueeSelection(ctx, canvasState.interaction.marqueeSelection);
    }

    ctx.restore(); // Restore DPI scaling

    // Update performance metrics
    const now = performance.now();
    const deltaTime = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;
    
    // Log performance warnings in development
    if (process.env.NODE_ENV === 'development' && deltaTime > 33) { // > 30fps
      console.warn(`Slow frame detected: ${deltaTime.toFixed(2)}ms (${(1000/deltaTime).toFixed(1)}fps)`);
    }
  }, [canvasState, drawNode, drawEdge, nodes, edges, transform, viewport]);

  // Optimized animation loop - only render when needed
  useEffect(() => {
    let isAnimating = false;
    
    const animate = () => {
      if (canvasState.isDirty ||
          canvasState.interaction.mode !== 'IDLE' ||
          canvasState.interaction.connectionDragContext?.isActive) {
        render();
        animationFrameRef.current = requestAnimationFrame(animate);
        isAnimating = true;
      } else {
        // Stop animation when idle and clean
        isAnimating = false;
        animationFrameRef.current = null;
      }
    };

    // CRITICAL FIX: Always render at least once when dependencies change
    render();

    // Start animation if needed
    if (!isAnimating && (canvasState.isDirty || canvasState.interaction.mode !== 'IDLE')) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render, canvasState.isDirty, canvasState.interaction.mode, canvasState.interaction.connectionDragContext, nodes, edges]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Handle mouse events with proper coordinate transformation
  const handleMouseEvent = useCallback((event: React.MouseEvent, eventType: 'click' | 'mousedown') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    // Convert screen coordinates to canvas coordinates
    const canvasX = (screenX - transform.x) / transform.scale;
    const canvasY = (screenY - transform.y) / transform.scale;

    // Check for node hits using canvas coordinates
    let hitNodeId: string | null = null;
    
    for (const node of nodes) {
      if (canvasX >= node.x && canvasX <= node.x + NODE_WIDTH &&
          canvasY >= node.y && canvasY <= node.y + NODE_HEIGHT) {
        hitNodeId = node.id;
        break;
      }
    }

    if (hitNodeId) {
      if (eventType === 'click' && onNodeClick) {
        onNodeClick(hitNodeId, event.nativeEvent);
      } else if (eventType === 'mousedown' && onNodeMouseDown) {
        onNodeMouseDown(hitNodeId, event.nativeEvent);
      }
    } else {
      if (eventType === 'click' && onCanvasClick) {
        onCanvasClick(event.nativeEvent);
      } else if (eventType === 'mousedown' && onCanvasMouseDown) {
        onCanvasMouseDown(event.nativeEvent);
      }
    }
  }, [onNodeClick, onNodeMouseDown, onCanvasClick, onCanvasMouseDown, nodes, transform]);

  return (
    <canvas
      ref={canvasRef}
      className={`block ${className}`}
      style={{
        width: '100%',
        height: '100%',
        cursor: canvasState.interaction.mode === 'PANNING' ? 'grabbing' :
                canvasState.interaction.mode === 'CONNECTING' ? 'crosshair' :
                canvasState.interaction.mode === 'DRAGGING_NODE' ? 'grabbing' : 'grab',
      }}
      onClick={(e) => handleMouseEvent(e, 'click')}
      onMouseDown={(e) => handleMouseEvent(e, 'mousedown')}
      onContextMenu={(e) => e.preventDefault()} // Prevent context menu
    />
  );
};

export default CanvasRenderer;