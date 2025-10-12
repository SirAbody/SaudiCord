// Loading Screen Component
import React from 'react';

function LoadingScreen() {
  return (
    <div className="h-screen w-screen bg-background-primary flex flex-col items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-accent animate-pulse">SaudiCord</h1>
          <p className="text-text-secondary mt-2">Made With Love By SirAbody</p>
        </div>
        
        {/* Loading Spinner */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-dark-400 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
        
        {/* Loading Text */}
        <p className="text-text-tertiary mt-4 text-sm animate-pulse">
          Connecting to server...
        </p>
      </div>
    </div>
  );
}

export default LoadingScreen;
