// Call Modal Component for active calls
import React, { useEffect, useRef } from 'react';
import { useCallStore } from '../../stores/callStore';
import { 
  XMarkIcon, 
  PhoneIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  ArrowUpTrayIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/solid';
import socketService from '../../services/socket';

function CallModal() {
  const { 
    currentCall, 
    localStream, 
    remoteStream, 
    isCallActive,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    endCall
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!currentCall || !isCallActive) {
    return null;
  }

  const handleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleEndCall = () => {
    endCall(socketService.getSocket());
  };

  const isVideoCall = currentCall.callType === 'video';

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="bg-background-secondary rounded-lg shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-dark-400 flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative">
              <img
                src={`https://ui-avatars.com/api/?name=${currentCall.targetUser.username}&background=53FC18&color=fff`}
                alt={currentCall.targetUser.username}
                className="w-10 h-10 rounded-full"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background-secondary animate-pulse"></div>
            </div>
            <div className="ml-3">
              <h3 className="font-semibold text-text-primary">
                {currentCall.targetUser.username}
              </h3>
              <p className="text-xs text-text-secondary">
                {isVideoCall ? 'Video Call' : 'Voice Call'}
              </p>
            </div>
          </div>
          <button
            onClick={handleEndCall}
            className="p-2 hover:bg-dark-400 rounded-lg transition-colors"
            title="End Call"
          >
            <XMarkIcon className="w-5 h-5 text-text-secondary hover:text-text-primary" />
          </button>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative bg-black overflow-hidden">
          {isVideoCall ? (
            <>
              {/* Remote Video (Main) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Local Video (Picture-in-Picture) */}
              <div className="absolute top-4 right-4 w-48 h-36 bg-dark-600 rounded-lg overflow-hidden shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-dark-800 flex items-center justify-center">
                    <VideoCameraSlashIcon className="w-8 h-8 text-text-tertiary" />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Voice Call UI */
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="mb-8">
                  <img
                    src={`https://ui-avatars.com/api/?name=${currentCall.targetUser.username}&background=53FC18&color=fff`}
                    alt={currentCall.targetUser.username}
                    className="w-32 h-32 rounded-full mx-auto mb-4"
                  />
                  <h2 className="text-2xl font-bold text-text-primary">
                    {currentCall.targetUser.username}
                  </h2>
                </div>
                
                {/* Audio Visualizer */}
                <div className="flex justify-center space-x-1 mb-8">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-accent rounded-full animate-pulse"
                      style={{
                        height: `${20 + Math.random() * 30}px`,
                        animationDelay: `${i * 100}ms`
                      }}
                    ></div>
                  ))}
                </div>

                <p className="text-text-secondary">Voice call in progress</p>
              </div>
            </div>
          )}

          {/* Screen Share Indicator */}
          {isScreenSharing && (
            <div className="absolute top-4 left-4 bg-accent px-3 py-1 rounded-lg flex items-center">
              <ArrowUpTrayIcon className="w-4 h-4 text-white mr-2" />
              <span className="text-sm text-white">Screen Sharing</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-dark-400">
          <div className="flex items-center justify-center space-x-4">
            {/* Mute/Unmute */}
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${
                isMuted 
                  ? 'bg-accent hover:bg-accent-dark' 
                  : 'bg-dark-500 hover:bg-dark-600'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <SpeakerXMarkIcon className="w-6 h-6 text-white" />
              ) : (
                <MicrophoneIcon className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Video Toggle (for video calls) */}
            {isVideoCall && (
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  !isVideoEnabled 
                    ? 'bg-accent hover:bg-accent-dark' 
                    : 'bg-dark-500 hover:bg-dark-600'
                }`}
                title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
              >
                {isVideoEnabled ? (
                  <VideoCameraIcon className="w-6 h-6 text-white" />
                ) : (
                  <VideoCameraSlashIcon className="w-6 h-6 text-white" />
                )}
              </button>
            )}

            {/* Screen Share */}
            <button
              onClick={handleScreenShare}
              className={`p-3 rounded-full transition-colors ${
                isScreenSharing 
                  ? 'bg-accent hover:bg-accent-dark' 
                  : 'bg-dark-500 hover:bg-dark-600'
              }`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              <ArrowUpTrayIcon className="w-6 h-6 text-white" />
            </button>

            {/* End Call */}
            <button
              onClick={handleEndCall}
              className="p-3 bg-primary-600 hover:bg-primary-700 rounded-full transition-colors"
              title="End call"
            >
              <PhoneIcon className="w-6 h-6 text-white transform rotate-135" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CallModal;
