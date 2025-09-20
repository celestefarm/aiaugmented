import { useState, useRef, useCallback } from 'react';
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
  arrow,
} from '@floating-ui/react';

interface UseTooltipOptions {
  placement?: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
  delay?: number;
}

export function useTooltip({
  placement = 'top',
  offset: offsetValue = 8,
  delay = 200
}: UseTooltipOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(offsetValue),
      flip({
        fallbackAxisSideDirection: 'start',
        crossAxis: false,
      }),
      shift({ padding: 8 }),
      arrow({
        element: arrowRef,
      }),
    ],
  });

  const hover = useHover(context, {
    delay: {
      open: delay,
      close: 100,
    },
  });

  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  return {
    isOpen,
    refs,
    floatingStyles,
    arrowRef,
    context,
    getReferenceProps,
    getFloatingProps,
  };
}