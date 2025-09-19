import React from 'react';
import { Node, NodeUpdateRequest } from '@/lib/api';

interface NodeEditModalProps {
  isOpen: boolean;
  node: Node | null;
  onClose: () => void;
  onSave: (nodeId: string, updateData: NodeUpdateRequest) => Promise<void>;
  onShowNotification: (message: string) => void;
}

const NodeEditModal: React.FC<NodeEditModalProps> = ({ isOpen, node, onClose }) => {
  if (!isOpen || !node) return null;
  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4'>
        <h2 className='text-xl font-bold text-white mb-4'>Edit Node</h2>
        <p className='text-gray-300 mb-4'>Node: {node.title}</p>
        <button onClick={onClose} className='px-4 py-2 bg-gray-600 text-white rounded'>Close</button>
      </div>
    </div>
  );
};

export default NodeEditModal;
