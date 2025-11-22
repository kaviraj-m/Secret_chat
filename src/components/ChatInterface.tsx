'use client';

import { useState, useEffect, useRef } from 'react';
import MessageContextMenu from './MessageContextMenu';

interface Message {
  id: string;
  name: string;
  message: string;
  timestamp: string;
  reactions?: { [key: string]: string[] };
  edited?: boolean;
  editedAt?: string;
}

interface ChatInterfaceProps {
  userName: string;
  onBack: () => void;
  onChangeName: () => void;
}

export default function ChatInterface({ userName, onBack, onChangeName }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    message: Message;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const highlightedMessageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastMessageIdRef = useRef<string>('');
  const shouldAutoScrollRef = useRef<boolean>(true);

  // Check if user is near bottom of scroll (within 100px)
  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    
    const threshold = 100;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom < threshold;
  };

  const scrollToBottom = (force = false) => {
    if (force || shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Track scroll position to determine if we should auto-scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      shouldAutoScrollRef.current = isNearBottom();
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/chat');
      const data = await response.json();
      const newMessages = data.messages || [];
      
      // Check if there's a new message (by comparing last message ID)
      const hasNewMessage = newMessages.length > 0 && 
        newMessages[newMessages.length - 1].id !== lastMessageIdRef.current;
      
      // Track new message IDs for animation
      if (hasNewMessage) {
        const previousIds = new Set(messages.map((m: Message) => m.id));
        const newIds = newMessages
          .filter((m: Message) => !previousIds.has(m.id))
          .map((m: Message) => m.id);
        
        if (newIds.length > 0) {
          setNewMessageIds(new Set(newIds));
          // Remove animation class after animation completes
          setTimeout(() => {
            setNewMessageIds(new Set());
          }, 500);
        }
      }
      
      // Update last message ID
      if (newMessages.length > 0) {
        lastMessageIdRef.current = newMessages[newMessages.length - 1].id;
      }
      
      setMessages(newMessages);
      
      // Only auto-scroll if there's a new message AND user is near bottom
      if (hasNewMessage && shouldAutoScrollRef.current) {
        setTimeout(() => {
          scrollToBottom(true);
        }, 100);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 2 seconds
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  // Initial scroll to bottom on mount
  useEffect(() => {
    if (messages.length > 0 && lastMessageIdRef.current === '') {
      // First load - scroll to bottom
      setTimeout(() => {
        scrollToBottom(true);
        if (messages.length > 0) {
          lastMessageIdRef.current = messages[messages.length - 1].id;
        }
      }, 100);
    }
  }, [messages.length]);


  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    try {
      if (editingMessage) {
        // Edit existing message
        const response = await fetch('/api/chat', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingMessage.id,
            message: newMessage.trim(),
            name: userName,
          }),
        });

        if (response.ok) {
          setNewMessage('');
          setEditingMessage(null);
          shouldAutoScrollRef.current = true; // Force scroll when editing message
          await fetchMessages();
        }
      } else {
        // Send new message
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: userName,
            message: newMessage.trim(),
          }),
        });

         if (response.ok) {
           setNewMessage('');
           shouldAutoScrollRef.current = true; // Force scroll when sending message
           await fetchMessages();
         } else {
           console.error('Failed to send message');
         }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/chat?id=${messageId}&name=${encodeURIComponent(userName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchMessages();
      } else {
        console.error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleReact = async (messageId: string, reaction: string) => {
    try {
      const response = await fetch('/api/chat/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          reaction,
          userName,
        }),
      });

      if (response.ok) {
        await fetchMessages();
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleLongPress = (message: Message, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Get position
    let x: number, y: number;
    if ('touches' in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }

    setContextMenu({
      isOpen: true,
      position: { x, y },
      message,
    });
  };

  const handleTouchStart = (message: Message, e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };

    longPressTimerRef.current = setTimeout(() => {
      handleLongPress(message, e);
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current) {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
      
      // If moved more than 10px, cancel long press
      if (deltaX > 10 || deltaY > 10) {
        handleTouchEnd();
      }
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getReactionCount = (reactions: { [key: string]: string[] } | undefined) => {
    if (!reactions) return 0;
    return Object.values(reactions).reduce((sum, users) => sum + users.length, 0);
  };

  // Filter messages based on search query
  const filteredMessages = searchQuery.trim()
    ? messages.filter((msg) =>
        msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Get search results count
  const searchResultsCount = searchQuery.trim() ? filteredMessages.length : 0;

  // Highlight text in message
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-300 dark:bg-yellow-600/50 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Navigate to next/previous search result
  const navigateSearch = (direction: 'next' | 'prev') => {
    if (!searchQuery.trim() || filteredMessages.length === 0) return;

    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % filteredMessages.length;
    } else {
      newIndex = currentSearchIndex <= 0 ? filteredMessages.length - 1 : currentSearchIndex - 1;
    }

    setCurrentSearchIndex(newIndex);
    const messageId = filteredMessages[newIndex].id;
    const element = highlightedMessageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a temporary highlight effect
      element.classList.add('ring-4', 'ring-blue-400', 'ring-opacity-50');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-blue-400', 'ring-opacity-50');
      }, 1000);
    }
  };

  // Handle search input changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setCurrentSearchIndex(0);
      // Scroll to first result after a short delay
      setTimeout(() => {
        if (filteredMessages.length > 0) {
          const firstMessageId = filteredMessages[0].id;
          const element = highlightedMessageRefs.current[firstMessageId];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    } else {
      setCurrentSearchIndex(-1);
    }
  }, [searchQuery]);

  // Keyboard shortcuts for search navigation
  useEffect(() => {
    if (!showSearch || !searchQuery.trim()) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        navigateSearch('prev');
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        navigateSearch('next');
      } else if (e.key === 'Escape') {
        setSearchQuery('');
        setShowSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, searchQuery, currentSearchIndex, filteredMessages.length]);

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header - Mobile Optimized */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm flex-shrink-0">
        {/* Search Bar */}
        {showSearch && (
          <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <div className="max-w-4xl mx-auto flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full px-4 py-2.5 pl-10 text-base border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
                  autoFocus
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  🔍
                </span>
              </div>
              {searchQuery.trim() && (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {currentSearchIndex + 1 > 0 ? `${currentSearchIndex + 1}/${searchResultsCount}` : `${searchResultsCount} result${searchResultsCount !== 1 ? 's' : ''}`}
                  </div>
                  {searchResultsCount > 0 && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigateSearch('prev')}
                        className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 rounded-lg transition-colors touch-manipulation"
                        title="Previous (Shift+Enter)"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => navigateSearch('next')}
                        className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 rounded-lg transition-colors touch-manipulation"
                        title="Next (Enter)"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 rounded-lg transition-colors touch-manipulation"
                title="Close search (Esc)"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Header */}
        <div className="p-3 sm:p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 truncate">
                Meow Chat
              </h1>
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="text-zinc-600 dark:text-zinc-400 hidden sm:inline">as</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50 truncate max-w-[80px] sm:max-w-none">
                  {userName}
                </span>
                <button
                  onClick={onChangeName}
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline touch-manipulation"
                  title="Change name"
                >
                  Change
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (!showSearch) {
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  } else {
                    setSearchQuery('');
                  }
                }}
                className="p-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 rounded-lg transition-colors touch-manipulation"
                title="Search messages"
              >
                🔍
              </button>
              <button
                onClick={onBack}
                className="px-3 sm:px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 rounded-lg transition-colors font-medium text-sm sm:text-base touch-manipulation whitespace-nowrap"
              >
                <span className="hidden sm:inline">Back to Calculator</span>
                <span className="sm:hidden">Back</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages - Mobile Optimized */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4"
      >
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 dark:text-zinc-400 py-8 text-sm sm:text-base">
              No messages yet. Be the first to say something!
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.name === userName;
              const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
              const isNewMessage = newMessageIds.has(msg.id);
              const animationClass = isNewMessage 
                ? (isOwnMessage ? 'message-enter-right' : 'message-enter-left')
                : '';
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 relative touch-manipulation ${animationClass} ${
                      isOwnMessage
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                    }`}
                    onTouchStart={(e) => handleTouchStart(msg, e)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleLongPress(msg, e);
                    }}
                  >
                    {!isOwnMessage && (
                      <div className={`text-xs font-semibold mb-1 ${
                        isOwnMessage ? 'text-blue-100' : 'text-zinc-500 dark:text-zinc-400'
                      }`}>
                        {msg.name}
                      </div>
                    )}
                    <div className="text-sm sm:text-base break-words">{msg.message}</div>
                    {msg.edited && (
                      <span className={`text-xs italic mr-2 ${
                        isOwnMessage ? 'text-blue-100' : 'text-zinc-400 dark:text-zinc-500'
                      }`}>
                        (edited)
                      </span>
                    )}
                    <div className={`text-xs mt-1 flex items-center gap-2 ${
                      isOwnMessage ? 'text-blue-100' : 'text-zinc-400 dark:text-zinc-500'
                    }`}>
                      <span>{formatTime(msg.timestamp)}</span>
                    </div>
                    
                    {/* Reactions */}
                    {hasReactions && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(msg.reactions!).map(([reaction, users]) => (
                          <button
                            key={reaction}
                            onClick={() => handleReact(msg.id, reaction)}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors touch-manipulation ${
                              isOwnMessage
                                ? 'bg-blue-400/30 border-blue-300/50 text-white'
                                : 'bg-zinc-100 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-50'
                            } ${users.includes(userName) ? 'ring-2 ring-blue-400' : ''}`}
                          >
                            <span className="mr-1">{reaction}</span>
                            <span>{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Mobile Optimized */}
      <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-3 sm:p-4 flex-shrink-0">
        {editingMessage && (
          <div className="max-w-4xl mx-auto mb-2 text-xs text-blue-600 dark:text-blue-400">
            ✏️ Editing message...
          </div>
        )}
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
            disabled={loading}
            autoFocus={editingMessage ? true : false}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || loading}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm sm:text-base touch-manipulation whitespace-nowrap"
          >
            {loading ? '...' : editingMessage ? 'Save' : 'Send'}
          </button>
          {editingMessage && (
            <button
              type="button"
              onClick={() => {
                setEditingMessage(null);
                setNewMessage('');
              }}
              className="px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 rounded-lg transition-colors text-sm sm:text-base touch-manipulation"
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <MessageContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          isOwnMessage={contextMenu.message.name === userName}
          onClose={() => setContextMenu(null)}
          onEdit={() => {
            setEditingMessage(contextMenu.message);
            setNewMessage(contextMenu.message.message);
            setContextMenu(null);
          }}
          onDelete={() => handleDeleteMessage(contextMenu.message.id)}
          onReact={(reaction) => handleReact(contextMenu.message.id, reaction)}
        />
      )}
    </div>
  );
}
