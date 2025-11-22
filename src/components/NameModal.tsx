'use client';

import { useState, useEffect, useRef } from 'react';

interface NameModalProps {
  isOpen: boolean;
  onClose: (name: string) => void;
  currentName?: string;
}

export default function NameModal({ isOpen, onClose, currentName = '' }: NameModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }, [isOpen, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem('chatUserName', name.trim());
      onClose(name.trim());
      setName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          {currentName ? 'Change Name' : 'Welcome to Meow Chat'}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {currentName ? 'Enter your new name:' : 'Please enter your name to continue:'}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            maxLength={50}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {currentName ? 'Change Name' : 'Enter Chat'}
          </button>
        </form>
      </div>
    </div>
  );
}

