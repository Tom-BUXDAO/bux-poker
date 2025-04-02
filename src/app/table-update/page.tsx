'use client';

import React from 'react';
import { Switch } from '@headlessui/react';
import EmojiPicker from 'emoji-picker-react';
import { FaceSmileIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { FaceSmileIcon as FaceSmileSolidIcon } from '@heroicons/react/24/solid';

export default function TableUpdatePage() {
  const [showEmojis, setShowEmojis] = React.useState(false);
  const [showChat, setShowChat] = React.useState(true);
  const [showSystem, setShowSystem] = React.useState(true);
  const [message, setMessage] = React.useState('');

  const handleEmojiClick = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojis(false);
  };

  return (
    <div className="min-h-screen h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-10 min-h-[2.5rem] bg-gray-900 border-b border-gray-800 flex items-center px-3">
        <h1 className="text-white font-bold text-base">BUX Poker</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Game Area - 70% */}
        <div className="w-[70%] flex flex-col min-h-0">
          {/* Game Table - Fills available space */}
          <div className="flex-1 bg-gray-800 relative min-h-0">
            {/* Game table content will go here */}
            <div className="absolute inset-[10%] rounded-3xl bg-[#1a6791] [background:radial-gradient(circle,#1a6791_0%,#14506e_70%,#0d3b51_100%)] border-2 border-[#d88a2b]">
              {/* First Seat */}
              <div className="absolute -top-[5%] left-1/4 -translate-x-1/2">
                <div className="w-[4.5vw] h-[4.5vw] rounded-full bg-gray-800/90 flex items-center justify-center border-2 border-gray-700">
                  <span className="text-gray-400 font-medium text-[0.65vw]">EMPTY</span>
                </div>
              </div>
              {/* Second Seat */}
              <div className="absolute -top-[5%] right-1/4 translate-x-1/2">
                <div className="w-[4.5vw] h-[4.5vw] rounded-full bg-gray-800/90 flex items-center justify-center border-2 border-gray-700">
                  <span className="text-gray-400 font-medium text-[0.65vw]">EMPTY</span>
                </div>
              </div>
              {/* Third Seat (Right Top) */}
              <div className="absolute -right-[5%] top-1/4 translate-y-[-50%]">
                <div className="w-[4.5vw] h-[4.5vw] rounded-full bg-gray-800/90 flex items-center justify-center border-2 border-gray-700">
                  <span className="text-gray-400 font-medium text-[0.65vw]">EMPTY</span>
                </div>
              </div>
              {/* Fourth Seat (Right Bottom) */}
              <div className="absolute -right-[5%] bottom-1/4 translate-y-[50%]">
                <div className="w-[4.5vw] h-[4.5vw] rounded-full bg-gray-800/90 flex items-center justify-center border-2 border-gray-700">
                  <span className="text-gray-400 font-medium text-[0.65vw]">EMPTY</span>
                </div>
              </div>
              {/* Fifth Seat */}
              <div className="absolute -bottom-[5%] left-1/4 -translate-x-1/2">
                <div className="w-[4.5vw] h-[4.5vw] rounded-full bg-gray-800/90 flex items-center justify-center border-2 border-gray-700">
                  <span className="text-gray-400 font-medium text-[0.65vw]">EMPTY</span>
                </div>
              </div>
              {/* Sixth Seat */}
              <div className="absolute -bottom-[5%] right-1/4 translate-x-1/2">
                <div className="w-[4.5vw] h-[4.5vw] rounded-full bg-gray-800/90 flex items-center justify-center border-2 border-gray-700">
                  <span className="text-gray-400 font-medium text-[0.65vw]">EMPTY</span>
                </div>
              </div>
              {/* Seventh Seat (Left Bottom) */}
              <div className="absolute -left-[5%] bottom-1/4 translate-y-[50%]">
                <div className="w-[4.5vw] h-[4.5vw] rounded-full bg-gray-800/90 flex items-center justify-center border-2 border-gray-700">
                  <span className="text-gray-400 font-medium text-[0.65vw]">EMPTY</span>
                </div>
              </div>
              {/* Eighth Seat (Left Top) */}
              <div className="absolute -left-[5%] top-1/4 translate-y-[-50%]">
                <div className="w-[4.5vw] h-[4.5vw] rounded-full bg-gray-800/90 flex items-center justify-center border-2 border-gray-700">
                  <span className="text-gray-400 font-medium text-[0.65vw]">EMPTY</span>
                </div>
              </div>
              {/* Table content */}
            </div>
          </div>

          {/* Control Panel - Fixed height */}
          <div className="h-[30%] min-h-0 bg-gray-900 p-2">
            <div className="h-full py-2 flex items-center gap-2">
              {/* Left Container - Cards and Info */}
              <div className="w-1/2 flex gap-2">
                {/* Cards Section */}
                <div className="h-full flex items-center justify-start gap-2 w-[45%]">
                  <div className="h-full w-[45%] relative">
                    <img 
                      src="/cards/AS.png"
                      alt="Ace of Spades"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="h-full w-[45%] relative">
                    <img 
                      src="/cards/KH.png"
                      alt="King of Hearts"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>

                {/* Game Info Tile */}
                <div className="w-[55%] bg-black/50 rounded p-1">
                  <div className="h-full flex flex-col justify-between text-base">
                    {/* Best Hand */}
                    <div>
                      <span className="text-white uppercase tracking-wider font-medium block text-[1vw]">Best hand</span>
                      <div className="text-yellow-400 font-semibold text-[1.2vw]">Waiting for cards...</div>
                    </div>

                    {/* Blinds */}
                    <div>
                      <span className="text-white uppercase tracking-wider font-medium block text-[1vw]">Blinds</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-[1vw]">Current</span>
                          <span className="text-white font-semibold text-[1.2vw]">10/20</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-[1vw]">Next</span>
                          <span className="text-white font-semibold text-[1.2vw]">20/40</span>
                        </div>
                      </div>
                    </div>

                    {/* Timer */}
                    <div>
                      <span className="text-white uppercase tracking-wider font-medium block text-[1vw]">Next level</span>
                      <div className="text-yellow-400 font-semibold text-[1.2vw]">10:00</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Container - Action Buttons */}
              <div className="w-1/2 h-full flex items-center gap-2">
                {/* Fold Column */}
                <div className="flex-1 h-full flex flex-col gap-2">
                  <div className="h-[65%]">
                    <button className="h-full w-full bg-red-600 hover:bg-red-700 text-white font-bold rounded uppercase tracking-wider text-[1.4vw] border border-white">
                      Fold
                    </button>
                  </div>
                  <div className="h-[30%] flex gap-2">
                    <button className="flex-1 h-full bg-gray-700 hover:bg-gray-600 text-white font-medium rounded text-[1.2vw] border border-green-500">
                      1/2
                    </button>
                    <button className="flex-1 h-full bg-gray-700 hover:bg-gray-600 text-white font-medium rounded text-[1.2vw] border border-green-500">
                      2/3
                    </button>
                  </div>
                </div>

                {/* Check/Call Column */}
                <div className="flex-1 h-full flex flex-col gap-2">
                  <div className="h-[65%]">
                    <button className="h-full w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded uppercase tracking-wider text-[1.4vw] border border-white">
                      Check
                    </button>
                  </div>
                  <div className="h-[30%] flex gap-2">
                    <button className="flex-1 h-full bg-gray-700 hover:bg-gray-600 text-white font-medium rounded text-[1.2vw] border border-green-500">
                      POT
                    </button>
                    <button className="flex-1 h-full bg-gray-700 hover:bg-gray-600 text-white font-medium rounded text-[1.2vw] border border-green-500">
                      ALL IN
                    </button>
                  </div>
                </div>

                {/* Bet/Raise Column */}
                <div className="flex-1 h-full flex flex-col gap-2">
                  <div className="h-[65%]">
                    <button className="h-full w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded uppercase tracking-wider text-[1.4vw] border border-white">
                      Bet 0
                    </button>
                  </div>
                  <div className="h-[30%] grid grid-cols-3 gap-2">
                    <button className="h-full bg-gray-700 hover:bg-gray-600 text-white font-bold rounded text-[1.2vw] border border-green-500">
                      -
                    </button>
                    <input 
                      type="text" 
                      className="h-full bg-gray-800 text-white text-center rounded text-[1.2vw] border border-green-500"
                      value="0"
                      readOnly
                    />
                    <button className="h-full bg-gray-700 hover:bg-gray-600 text-white font-bold rounded text-[1.2vw] border border-green-500">
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area - 30% */}
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
          <div className="flex-1 overflow-y-auto p-2 min-h-0">
            {/* Messages will go here */}
          </div>

          {/* Chat Input */}
          <div className="flex-none p-2 border-t border-gray-800">
            <div className="relative flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-gray-800 text-white rounded-lg pl-3 pr-16 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={() => setShowEmojis(!showEmojis)}
                    className="text-yellow-500 hover:text-yellow-400"
                  >
                    <FaceSmileSolidIcon className="w-5 h-5" />
                  </button>
                  <button 
                    className="text-blue-500 hover:text-blue-400"
                    onClick={() => {
                      if (message.trim()) {
                        // Handle send message
                        setMessage('');
                      }
                    }}
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
      </div>
    </div>
  );
} 