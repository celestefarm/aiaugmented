import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingArrow,
  arrow
} from '@floating-ui/react';
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
  const arrowRef = useRef<SVGSVGElement>(null);
  
  // Debug logging for component lifecycle
  useEffect(() => {
    console.log('🔧 [TOOLTIP DEBUG] NodeWithTooltip mounted for node:', node.id);
    return () => {
      console.log('🔧 [TOOLTIP DEBUG] NodeWithTooltip unmounting for node:', node.id);
    };
  }, [node.id]);
  
  useEffect(() => {
    console.log('🔧 [TOOLTIP DEBUG] isOpen state changed:', isOpen, 'for node:', node.id);
  }, [isOpen, node.id]);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [
      offset(20),
      flip({
        fallbackAxisSideDirection: "start",
        fallbackPlacements: ['top', 'bottom', 'left', 'right'],
      }),
      shift({ padding: 16 }),
      arrow({
        element: arrowRef,
      }),
    ],
    whileElementsMounted: autoUpdate,
    strategy: 'fixed', // Use fixed positioning
  });

  const hover = useHover(context, {
    move: false,
    delay: { open: 300, close: 100 },
    restMs: 40 // Add rest period to prevent flickering
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);
  
  // Debug the reference props
  const debugReferenceProps = getReferenceProps();
  console.log('🔧 [TOOLTIP DEBUG] Reference props for node', node.id, ':', {
    onMouseEnter: !!debugReferenceProps.onMouseEnter,
    onMouseLeave: !!debugReferenceProps.onMouseLeave,
    onFocus: !!debugReferenceProps.onFocus,
    onBlur: !!debugReferenceProps.onBlur,
  });

  const referenceProps = getReferenceProps() as any;
  
  return (
    <>
      <div
        ref={refs.setReference}
        onMouseEnter={(e: React.MouseEvent) => {
          console.log('🐭 [TOOLTIP DEBUG] Mouse enter on wrapper div for node:', node.id);
          
          // Always manually trigger tooltip
          console.log('🐭 [TOOLTIP DEBUG] Manually setting isOpen to true');
          setIsOpen(true);
          
          // Also try the floating UI handler if it exists
          if (referenceProps.onMouseEnter) {
            console.log('🐭 [TOOLTIP DEBUG] Also calling floating UI onMouseEnter');
            referenceProps.onMouseEnter(e);
          }
        }}
        onMouseLeave={(e: React.MouseEvent) => {
          console.log('🐭 [TOOLTIP DEBUG] Mouse leave on wrapper div for node:', node.id);
          
          // Always manually trigger tooltip close
          console.log('🐭 [TOOLTIP DEBUG] Manually setting isOpen to false');
          setIsOpen(false);
          
          // Also try the floating UI handler if it exists
          if (referenceProps.onMouseLeave) {
            console.log('🐭 [TOOLTIP DEBUG] Also calling floating UI onMouseLeave');
            referenceProps.onMouseLeave(e);
          }
        }}
        style={{ display: 'contents' }}
      >
        {children}
      </div>
      
      {isOpen && (
        <EnhancedNodeTooltip
          node={node}
          edges={edges}
          isOpen={isOpen}
          refs={refs}
          floatingStyles={floatingStyles}
          arrowRef={arrowRef}
          context={context}
          getFloatingProps={getFloatingProps}
          onModalOpen={onModalOpen}
        />
      )}
    </>
  );
};