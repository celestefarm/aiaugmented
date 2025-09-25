import React from 'react';
import { Link, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ConnectorButtonProps {
  mode: 'IDLE' | 'CONNECTING' | 'DRAGGING_CONNECTION';
  isEnabled: boolean;
  nodeCount: number;
  onToggle: () => void;
  className?: string;
}

export const ConnectorButton: React.FC<ConnectorButtonProps> = ({
  mode,
  isEnabled,
  nodeCount,
  onToggle,
  className = ''
}) => {
  const isDisabled = nodeCount < 2;
  const isActive = mode === 'CONNECTING' || mode === 'DRAGGING_CONNECTION';
  
  // Determine button appearance based on state
  const getButtonVariant = () => {
    if (isDisabled) return 'ghost';
    if (isActive) return 'default';
    return 'outline';
  };

  const getButtonClasses = () => {
    const baseClasses = 'glass-pane px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center space-x-2';
    
    if (isDisabled) {
      return `${baseClasses} opacity-50 cursor-not-allowed text-gray-500 border-gray-600/30`;
    }
    
    if (isActive) {
      return `${baseClasses} text-[#6B6B3A] bg-[#6B6B3A]/20 border-[#6B6B3A]/40 shadow-lg shadow-[#6B6B3A]/20 ring-1 ring-[#6B6B3A]/30`;
    }
    
    return `${baseClasses} text-[#E5E7EB] hover:text-[#6B6B3A] hover:bg-[#6B6B3A]/10 border-gray-600/50 hover:border-[#6B6B3A]/40`;
  };

  // Get icon based on current state
  const getIcon = () => {
    if (mode === 'DRAGGING_CONNECTION') {
      return <Zap className="w-4 h-4 animate-pulse" />;
    }
    if (isActive) {
      return <X className="w-4 h-4" />;
    }
    return <Link className="w-4 h-4" />;
  };

  // Get button text based on state
  const getButtonText = () => {
    if (isDisabled) {
      return 'Add Connector';
    }
    if (mode === 'DRAGGING_CONNECTION') {
      return 'Connecting...';
    }
    if (isActive) {
      return 'Cancel Connection';
    }
    return 'Add Connector';
  };

  // Get tooltip content based on state
  const getTooltipContent = () => {
    if (isDisabled) {
      return (
        <div className="text-center">
          <div className="font-medium">Add Connector (C)</div>
          <div className="text-xs text-gray-400 mt-1">
            Need at least 2 nodes to create connections
          </div>
        </div>
      );
    }
    
    if (mode === 'DRAGGING_CONNECTION') {
      return (
        <div className="text-center">
          <div className="font-medium">Creating Connection</div>
          <div className="text-xs text-gray-400 mt-1">
            Drag to another node to complete • Press Esc to cancel
          </div>
        </div>
      );
    }
    
    if (isActive) {
      return (
        <div className="text-center">
          <div className="font-medium">Cancel Connection (Esc)</div>
          <div className="text-xs text-gray-400 mt-1">
            Exit connection mode
          </div>
        </div>
      );
    }
    
    return (
      <div className="text-center">
        <div className="font-medium">Add Connector (C)</div>
        <div className="text-xs text-gray-400 mt-1">
          Click, then drag from a node to another node to link
        </div>
      </div>
    );
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onToggle}
          disabled={isDisabled}
          className={`${getButtonClasses()} ${className}`}
          aria-label={`${getButtonText()} - Press C to toggle`}
          aria-pressed={isActive}
          aria-disabled={isDisabled}
          role="button"
          tabIndex={isDisabled ? -1 : 0}
        >
          {getIcon()}
          <span>{getButtonText()}</span>
          
          {/* Visual state indicators */}
          {isActive && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#6B6B3A] rounded-full animate-pulse" />
          )}
          
          {mode === 'DRAGGING_CONNECTION' && (
            <div className="absolute inset-0 bg-gradient-to-r from-[#6B6B3A]/20 to-transparent rounded animate-pulse" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {getTooltipContent()}
      </TooltipContent>
    </Tooltip>
  );
};

export default ConnectorButton;