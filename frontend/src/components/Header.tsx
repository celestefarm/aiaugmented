import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Share, Download, Copy, LogOut, User, Edit, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { apiClient } from '../lib/api';

interface HeaderProps {
  currentView: 'exploration' | 'brief';
  onViewChange: (view: 'exploration' | 'brief') => void;
  title: string;
  onTitleChange: (title: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, title, onTitleChange }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [isExporting, setIsExporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update edit title when prop changes
  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle.trim() !== title) {
      onTitleChange(editTitle.trim());
    } else {
      setEditTitle(title); // Reset if no change or empty
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditTitle(title);
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleExport = async () => {
    if (!currentWorkspace) {
      console.error('No current workspace available for export');
      return;
    }

    setIsExporting(true);
    try {
      await apiClient.exportWorkspace(currentWorkspace.id);
    } catch (error) {
      console.error('Export failed:', error);
      // You could add a toast notification here
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="glass-pane sticky top-0 z-50 w-full px-6 py-4 border-b border-gray-800/50 rounded-none border-l-0 border-r-0 border-t-0">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-3">
          {/* Back to Dashboard Button */}
          <button
            onClick={handleBackToDashboard}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400 hover:text-[#6B6B3A]" />
          </button>

          {/* Layered Diamond SVG */}
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-[#6B6B3A]">
            <path
              d="M12 2 L20 12 L12 22 L4 12 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.8"
            />
            <path
              d="M12 5 L17 12 L12 19 L7 12 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          
          {/* Editable Title with PREMIUM badge horizontally aligned */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {isEditingTitle ? (
                <input
                  ref={inputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleKeyDown}
                  className="text-lg font-semibold text-white bg-transparent border border-[#6B6B3A]/50 rounded px-2 py-1 focus:outline-none focus:border-[#6B6B3A] min-w-[200px]"
                />
              ) : (
                <div className="flex items-center space-x-2 group">
                  <h1 className="text-lg font-semibold text-white group-hover:text-[#6B6B3A] transition-colors">
                    Agentic Boardroom
                  </h1>
                  <button
                    onClick={handleTitleEdit}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 transition-all"
                    title="Edit workspace title"
                  >
                    <Edit className="w-3 h-3 text-gray-400 hover:text-[#6B6B3A]" />
                  </button>
                </div>
              )}
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-600/20 text-gray-500 border border-gray-600/30">
              PREMIUM
            </span>
          </div>
        </div>

        {/* Center Section - View Toggle */}
        <div className="glass-pane-no-glow rounded-full p-1 relative z-50">
          <div className="flex">
            <button
              onClick={() => {
                alert('Exploration Map clicked! Current view: ' + currentView);
                onViewChange('exploration');
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                currentView === 'exploration'
                  ? 'bg-[#6B6B3A]/30 text-white'
                  : 'text-[#9CA3AF] bg-transparent hover:text-white'
              }`}
              style={{ pointerEvents: 'auto' }}
            >
              Exploration Map
            </button>
            <button
              onClick={() => {
                alert('Last-Mile Brief clicked! Current view: ' + currentView);
                onViewChange('brief');
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                currentView === 'brief'
                  ? 'bg-[#6B6B3A]/30 text-white'
                  : 'text-[#9CA3AF] bg-transparent hover:text-white'
              }`}
              style={{ pointerEvents: 'auto' }}
            >
              Last-Mile Brief
            </button>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Model Dropdown */}
          <div className="relative">
            <select className="bg-transparent border border-gray-600 rounded-lg px-3 py-2 text-sm text-white appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[#6B6B3A]">
              <option value="gemini" className="bg-gray-800">Gemini 2.5 Pro</option>
              <option value="gpt" className="bg-gray-800">GPT-5 Omni</option>
              <option value="claude" className="bg-gray-800">Claude 4 Opus</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-1">
            <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
              <Share className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || !currentWorkspace}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export workspace data"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'text-[#6B6B3A] animate-pulse' : 'text-gray-400'}`} />
            </button>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
              <Copy className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* User Info and Logout */}
          {user && (
            <div className="flex items-center space-x-2 pl-3 border-l border-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-[#6B6B3A]/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#6B6B3A]" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm text-white font-medium">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors group"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;