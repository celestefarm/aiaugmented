import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Node, Edge } from '@/lib/api';
import { EnhancedNodeTooltip } from './EnhancedNodeTooltip';
import { ProcessedContent } from '@/utils/tooltipContentUtils';

interface NodeWithTooltipProps {
  node: Node;
  edges: Edge[];
  transform: { x: number; y: number; scale: number };
  isSelected: boolean;
  isDragging: boolean;
  onMouseDown: (event: React.MouseEvent, nodeId: string, nodeType: 'ai' | 'human') => void;
  onSelect: () => void;
  onModalOpen?: (node: Node, edges: Edge[], processedContent: ProcessedContent) => void;
  children: React.ReactNode;
}

export const NodeWithTooltip: React.FC<NodeWithTooltipProps> = ({
  node,
  edges,
  transform,
  isSelected,
  isDragging,
  onMouseDown,
  onSelect,
  onModalOpen,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const handleTooltipClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(prev => !prev);
  }, []);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (nodeRef.current && !nodeRef.current.contains(event.target as HTMLElement)) {
      // Check if click is on the tooltip itself
      const tooltipElement = document.querySelector('[role="tooltip"]');
      if (tooltipElement && !tooltipElement.contains(event.target as HTMLElement)) {
        setIsOpen(false);
      }
    }
  }, []);

  // Add click outside listener when tooltip is open
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, handleClickOutside]);
  
  return (
    <>
      {/* Invisible positioning reference div that matches the actual node position */}
      <div
        ref={nodeRef}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          left: `${node.x * transform.scale + transform.x}px`,
          top: `${node.y * transform.scale + transform.y}px`,
          width: '240px',
          height: '120px',
          zIndex: 1,
          visibility: 'hidden'
        }}
      />
      
      {/* Wrap the actual node and pass tooltip click handler */}
      <div style={{ display: 'contents' }}>
        {React.cloneElement(children as React.ReactElement, {
          onTooltipClick: handleTooltipClick
        })}
      </div>
      
      <EnhancedNodeTooltip
        node={node}
        edges={edges}
        isOpen={isOpen}
        transform={transform}
        nodeElement={nodeRef.current}
        onModalOpen={onModalOpen}
      />
    </>
  );
};