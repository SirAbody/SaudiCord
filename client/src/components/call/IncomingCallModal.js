// Incoming Call Modal Component
import React, { useEffect, useState } from 'react';
import { useCallStore } from '../../stores/callStore';
import { PhoneIcon, VideoCameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import socketService from '../../services/socket';

function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useCallStore();
  const [ringTimeout, setRingTimeout] = useState(null);

  useEffect(() => {
    if (incomingCall) {
      // Auto-reject after 30 seconds
      const timeout = setTimeout(() => {
        handleReject();
      }, 30000);
      setRingTimeout(timeout);

      // Play ringtone (optional)
      const audio = new Audio('/ringtone.mp3');
      audio.loop = true;
      audio.play().catch(() => {});

      return () => {
        clearTimeout(timeout);
        audio.pause();
      };
    }
  }, [incomingCall]);

  const handleAccept = async () => {
    clearTimeout(ringTimeout);
    await acceptCall(socketService.getSocket());
  };

  const handleReject = () => {
    clearTimeout(ringTimeout);
    rejectCall(socketService.getSocket());
  };

  if (!incomingCall) {
    return null;
  }

  const isVideoCall = incomingCall.callType === 'video';

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-background-secondary rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 animate-slide-up">
        {/* Call Animation */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <img
              src={`https://ui-avatars.com/api/?name=${incomingCall.callerName}&background=FF0000&color=fff`}
              alt={incomingCall.callerName}
              className="w-24 h-24 rounded-full mx-auto call-pulse"
            />
            <div className="absolute -top-2 -right-2">
              {isVideoCall ? (
                <VideoCameraIcon className="w-8 h-8 text-accent animate-bounce" />
              ) : (
                <PhoneIcon className="w-8 h-8 text-accent animate-bounce" />
              )}
            </div>
          </div>
        </div>

        {/* Caller Info */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            {incomingCall.callerName}
          </h2>
          <p className="text-text-secondary">
            Incoming {isVideoCall ? 'video' : 'voice'} call...
          </p>
        </div>

        {/* Call Actions */}
        <div className="flex justify-center space-x-4">
          {/* Reject Button */}
          <button
            onClick={handleReject}
            className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors group"
            title="Reject call"
          >
            <XMarkIcon className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="p-4 bg-green-600 hover:bg-green-700 rounded-full transition-colors group animate-pulse"
            title="Accept call"
          >
            {isVideoCall ? (
              <VideoCameraIcon className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
            ) : (
              <PhoneIcon className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 text-center">
          <button className="text-sm text-text-tertiary hover:text-text-secondary">
            Reply with message
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncomingCallModal;
