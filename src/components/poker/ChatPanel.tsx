'use client';

import React, { useState } from 'react';
import { Switch } from '@headlessui/react';
import EmojiPicker from 'emoji-picker-react';
import { FaceSmileIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { FaceSmileIcon as FaceSmileSolidIcon } from '@heroicons/react/24/solid';

interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  currentPlayerId: string;
  onSendMessage: (message: string) => void;
}

export default function ChatPanel({ messages, currentPlayerId, onSendMessage }: ChatPanelProps) {
  const [showEmojis, setShowEmojis] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showSystem, setShowSystem] = useState(true);
  const [message, setMessage] = useState('');

  const handleEmojiClick = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojis(false);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    onSendMessage(message.trim());
    setMessage('');
  };

  return (
    <div className="w-[30%] bg-gray-900 border-l border-gray-800 flex flex-col min-h-0">
      {/* Chat Header */}
      <div className="flex-none p-2 border-b border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-sm uppercase tracking-wider font-medium">Chat</span>
            <Switch
              checked={showChat}
              onChange={setShowChat}
              className={`${
                showChat ? 'bg-blue-600' : 'bg-gray-700'
              } relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none`}
            >
              <span
                className={`${
                  showChat ? 'translate-x-4' : 'translate-x-1'
                } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-sm uppercase tracking-wider font-medium">System</span>
            <Switch
              checked={showSystem}
              onChange={setShowSystem}
              className={`${
                showSystem ? 'bg-orange-600' : 'bg-gray-700'
              } relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none`}
            >
              <span
                className={`${
                  showSystem ? 'translate-x-4' : 'translate-x-1'
                } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0 space-y-2">
        {messages.map((msg, index) => {
          const isLocal = msg.playerId === currentPlayerId;
          return (
            <div key={index} className={`flex ${isLocal ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                isLocal 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-700 text-white rounded-bl-none'
              }`}>
                {!isLocal && (
                  <div className="text-xs text-blue-400 font-medium mb-1">{msg.playerId}</div>
                )}
                <div className="text-sm break-words">{msg.message}</div>
                <div className="text-[10px] text-gray-400 mt-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Input */}
      <div className="flex-none p-2 border-t border-gray-800">
        <div className="relative flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="w-full bg-gray-800 text-white rounded-lg pl-3 pr-16 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={() => setShowEmojis(!showEmojis)}
                className="text-yellow-500 hover:text-yellow-400"
              >
                {showEmojis ? <FaceSmileSolidIcon className="w-5 h-5" /> : <FaceSmileIcon className="w-5 h-5" />}
              </button>
              <button 
                className="text-blue-500 hover:text-blue-400"
                onClick={handleSendMessage}
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
            {showEmojis && (
              <div className="absolute bottom-full right-0 mb-2">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={250}
                  height={350}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 