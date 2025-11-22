'use client';

import { useState, useEffect } from 'react';
import Calculator from '@/components/Calculator';
import ChatInterface from '@/components/ChatInterface';
import NameModal from '@/components/NameModal';

export default function Home() {
  const [showChat, setShowChat] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [userName, setUserName] = useState<string>('');

  // Load user name from localStorage on mount
  useEffect(() => {
    const storedName = localStorage.getItem('chatUserName');
    if (storedName) {
      setUserName(storedName);
    }
  }, []);


  // Handle secret trigger from calculator
  const handleSecretTrigger = () => {
    if (!userName) {
      // If no name stored, show name modal first
      setShowNameModal(true);
    } else {
      // If name exists, go directly to chat
      setShowChat(true);
    }
  };

  // Handle name modal close
  const handleNameSubmit = (name: string) => {
    setUserName(name);
    localStorage.setItem('chatUserName', name);
    setShowNameModal(false);
    if (!showChat) {
      setShowChat(true);
    }
  };

  // Handle change name request
  const handleChangeName = () => {
    setShowNameModal(true);
  };

  // Handle back to calculator
  const handleBackToCalculator = () => {
    setShowChat(false);
  };

  // Handle clear all chat
  const handleClearAllChat = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'PUT',
      });

      if (response.ok) {
        // Show confirmation
        alert('All chat messages have been cleared!');
        // If in chat, refresh messages
        if (showChat) {
          // Trigger a refresh by toggling chat view
          setShowChat(false);
          setTimeout(() => setShowChat(true), 100);
        }
      } else {
        console.error('Failed to clear chat');
      }
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  // Tab visibility detection - return to calculator when tab loses focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && showChat) {
        // Tab is hidden and we're in chat mode, return to calculator
        setShowChat(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showChat]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {showChat ? (
        <ChatInterface 
          userName={userName} 
          onBack={handleBackToCalculator}
          onChangeName={handleChangeName}
        />
      ) : (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-center text-zinc-900 dark:text-zinc-50 mb-8">
              Calculator
            </h1>
            <Calculator 
              onSecretTrigger={handleSecretTrigger}
              onClearChat={handleClearAllChat}
            />
          </div>
        </div>
      )}
      
      <NameModal 
        isOpen={showNameModal} 
        onClose={handleNameSubmit}
        currentName={userName}
      />
    </div>
  );
}
