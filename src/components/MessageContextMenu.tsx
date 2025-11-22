'use client';

import { useEffect, useRef } from 'react';

interface MessageContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  isOwnMessage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (reaction: string) => void;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function MessageContextMenu({
  isOpen,
  position,
  isOwnMessage,
  onClose,
  onEdit,
  onDelete,
  onReact,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Adjust position to keep menu in viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 300),
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onTouchStart={onClose}
      />
      
      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 py-2 min-w-[180px]"
        style={{
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
        }}
      >
        {/* Reactions */}
        <div className="px-2 pb-2 border-b border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 px-2 py-1 mb-1">
            React
          </div>
          <div className="flex gap-2 flex-wrap">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction}
                onClick={() => {
                  onReact(reaction);
                  onClose();
                }}
                className="text-2xl hover:scale-125 transition-transform active:scale-110 touch-manipulation"
                aria-label={`React with ${reaction}`}
              >
                {reaction}
              </button>
            ))}
          </div>
        </div>

        {/* Edit and Delete (only for own messages) */}
        {isOwnMessage && (
          <>
            <button
              onClick={() => {
                onEdit();
                onClose();
              }}
              className="w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 transition-colors text-sm font-medium touch-manipulation"
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors text-sm font-medium touch-manipulation"
            >
              🗑️ Delete
            </button>
          </>
        )}
      </div>
    </>
  );
}

