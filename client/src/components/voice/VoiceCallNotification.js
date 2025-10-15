import React, { useEffect, useState } from 'react';
import { useVoice } from '../../contexts/VoiceContext';
import { PhoneIcon, XMarkIcon } from '@heroicons/react/24/solid';
import soundService from '../../services/soundService';

function VoiceCallNotification() {
  const { incomingCall, acceptCall, rejectCall } = useVoice();
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (incomingCall) {
      setIsVisible(true);
      setTimeLeft(30);
      
      // Play ringtone
      const playRingtone = () => {
        soundService.playSound('ringtone');
      };
      playRingtone();
      const ringtoneInterval = setInterval(playRingtone, 3000);
      
      // Countdown timer
      const countdownInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleReject();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        clearInterval(ringtoneInterval);
        clearInterval(countdownInterval);
      };
    } else {
      setIsVisible(false);
    }
  }, [incomingCall]);

  const handleAccept = () => {
    acceptCall();
    setIsVisible(false);
  };

  const handleReject = () => {
    rejectCall();
    setIsVisible(false);
  };

  if (!incomingCall || !isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden max-w-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-500 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PhoneIcon className="w-5 h-5 text-white animate-bounce" />
              <span className="text-white font-medium text-sm">Incoming Voice Call</span>
            </div>
            <span className="text-white/70 text-xs">{timeLeft}s</span>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                {incomingCall.from?.avatar ? (
                  <img 
                    src={incomingCall.from.avatar} 
                    alt={incomingCall.from.username} 
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {incomingCall.from?.username?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary-500 rounded-full animate-pulse"></div>
            </div>
            
            {/* Caller Info */}
            <div className="flex-1">
              <p className="text-white font-medium">
                {incomingCall.from?.displayName || incomingCall.from?.username || 'Someone'}
              </p>
              <p className="text-gray-400 text-sm">
                {incomingCall.channelName || 'Voice Channel'}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleAccept}
              className="flex-1 bg-primary-500 hover:bg-primary-600 text-black font-medium py-2 px-4 rounded transition-all flex items-center justify-center space-x-2 group"
            >
              <PhoneIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Accept</span>
            </button>
            <button
              onClick={handleReject}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-all flex items-center justify-center space-x-2 group"
            >
              <XMarkIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Decline</span>
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 bg-gray-700">
          <div 
            className="h-full bg-primary-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 30) * 100}%` }}
          />
        </div>
      </div>

      {/* Alternative: Top Banner Style (commented out) */}
      {/* <div className="fixed top-0 left-0 right-0 bg-gray-800 border-b border-primary-500 p-3 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <PhoneIcon className="w-5 h-5 text-primary-500 animate-bounce" />
            <span className="text-white">
              <strong>{incomingCall.from?.username}</strong> is calling you...
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleAccept}
              className="bg-primary-500 hover:bg-primary-600 text-black px-4 py-1 rounded text-sm font-medium"
            >
              Accept
            </button>
            <button
              onClick={handleReject}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded text-sm font-medium"
            >
              Decline
            </button>
          </div>
        </div>
      </div> */}
    </div>
  );
}

export default VoiceCallNotification;
