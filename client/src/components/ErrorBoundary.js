import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    console.error('getDerivedStateFromError called with:', error);
    
    // Check if it's a recoverable error
    if (error && error.message) {
      const message = error.message.toLowerCase();
      if (
        message.includes('.on is not a function') ||
        message.includes('socket') ||
        message.includes('io is not') ||
        message.includes('cannot read') ||
        message.includes('undefined')
      ) {
        console.warn('Recoverable error detected, not showing error screen');
        return { hasError: false, error: null };
      }
    }
    
    // Update state to show fallback UI for real errors
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary in componentDidCatch:', error, errorInfo);
    
    // Log the full error for debugging
    console.error('Full error details:', {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack
    });
    
    // Check if it's a Socket.io related error
    if (error && error.message) {
      const message = error.message.toLowerCase();
      if (
        message.includes('.on is not a function') ||
        message.includes('socket') ||
        message.includes('io is not') ||
        message.includes('cannot read') ||
        message.includes('undefined')
      ) {
        console.warn('Socket.io/undefined error detected in componentDidCatch, app will work in offline mode');
        // Reset error state for recoverable errors
        setTimeout(() => {
          this.setState({ hasError: false, error: null });
        }, 100);
        return;
      }
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full">
            <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-gray-300 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Reload Application
            </button>
            <p className="text-gray-500 text-sm mt-4 text-center">
              Made With Love By SirAbody
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
