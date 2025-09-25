import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface MessageMapStatusContextType {
  messageMapStatus: Record<string, boolean>;
  setMessageStatus: (messageId: string, status: boolean) => void;
  initializeStatus: (messages: { id: string; added_to_map: boolean }[]) => void;
}

const MessageMapStatusContext = createContext<MessageMapStatusContextType | undefined>(undefined);

export const MessageMapStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messageMapStatus, setMessageMapStatus] = useState<Record<string, boolean>>({});

  const setMessageStatus = useCallback((messageId: string, status: boolean) => {
    setMessageMapStatus(prev => ({
      ...prev,
      [messageId]: status
    }));
  }, []);

  const initializeStatus = useCallback((messages: { id: string; added_to_map: boolean }[]) => {
    const newStatus: Record<string, boolean> = {};
    messages.forEach(msg => {
      newStatus[msg.id] = msg.added_to_map || false;
    });
    setMessageMapStatus(newStatus);
  }, []);

  return (
    <MessageMapStatusContext.Provider value={{ messageMapStatus, setMessageStatus, initializeStatus }}>
      {children}
    </MessageMapStatusContext.Provider>
  );
};

export const useMessageMapStatus = (): MessageMapStatusContextType => {
  const context = useContext(MessageMapStatusContext);
  if (context === undefined) {
    throw new Error('useMessageMapStatus must be used within a MessageMapStatusProvider');
  }
  return context;
};