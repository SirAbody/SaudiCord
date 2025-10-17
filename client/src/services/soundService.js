// Sound Service for Discord-like sounds
// Made With Love By SirAbody

class SoundService {
  constructor() {
    this.sounds = {
      // Message sounds
      messageReceive: '/sounds/message.mp3',
      messageSend: '/sounds/send.mp3',
      mention: '/sounds/mention.mp3',
      
      // Call sounds
      callIncoming: '/sounds/call-incoming.mp3',
      callOutgoing: '/sounds/call-outgoing.mp3',
      callEnd: '/sounds/call-end.mp3',
      
      // Voice sounds
      voiceJoin: '/sounds/voice-join.mp3',
      voiceLeave: '/sounds/voice-leave.mp3',
      mute: '/sounds/mute.mp3',
      unmute: '/sounds/unmute.mp3',
      deafen: '/sounds/deafen.mp3',
      undeafen: '/sounds/undeafen.mp3',
      
      // Notification sounds
      notification: '/sounds/notification.mp3',
      error: '/sounds/error.mp3',
      success: '/sounds/success.mp3'
    };
    
    this.enabled = this.loadSoundPreference();
    this.volume = this.loadVolumePreference();
    
    // Create audio context for better performance
    this.audioContext = null;
    this.audioBuffers = {};
    
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      ['click', 'touchstart'].forEach(event => {
        document.addEventListener(event, () => {
          this.initAudioContext();
        }, { once: true });
      });
    }
  }
  
  initAudioContext() {
    if (!this.audioContext && typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[Sound] Audio context initialized');
    }
  }
  
  loadSoundPreference() {
    const stored = localStorage.getItem('soundEnabled');
    return stored !== 'false'; // Default to true
  }
  
  loadVolumePreference() {
    const stored = localStorage.getItem('soundVolume');
    return stored ? parseFloat(stored) : 0.5; // Default to 50%
  }
  
  setSoundEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('soundEnabled', enabled);
  }
  
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', this.volume);
  }
  
  // Alias for backwards compatibility
  playSound(soundName) {
    return this.play(soundName);
  }
  
  async play(soundName) {
    if (!this.enabled) return;
    
    const soundUrl = this.sounds[soundName];
    if (!soundUrl) {
      console.warn(`[Sound] Unknown sound: ${soundName}`);
      return;
    }
    
    try {
      // Use Web Audio API if available for better performance
      if (this.audioContext) {
        await this.playWithWebAudio(soundUrl);
      } else {
        // Fallback to HTML5 Audio
        await this.playWithHtmlAudio(soundUrl);
      }
    } catch (error) {
      console.error('[Sound] Error playing sound:', error);
    }
  }
  
  async playWithWebAudio(url) {
    if (!this.audioBuffers[url]) {
      // Load and cache the audio buffer
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffers[url] = await this.audioContext.decodeAudioData(arrayBuffer);
    }
    
    // Create a source node and play it
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = this.audioBuffers[url];
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    gainNode.gain.value = this.volume;
    
    source.start(0);
  }
  
  async playWithHtmlAudio(url) {
    const audio = new Audio(url);
    audio.volume = this.volume;
    
    // Create a promise that resolves when the audio can play
    const canPlayPromise = new Promise((resolve) => {
      audio.addEventListener('canplaythrough', resolve, { once: true });
    });
    
    // Load the audio
    audio.load();
    
    // Wait for audio to be ready
    await canPlayPromise;
    
    // Play the audio
    await audio.play();
  }
  
  // Convenience methods for common sounds
  playMessage() {
    return this.play('messageReceive');
  }
  
  playSend() {
    return this.play('messageSend');
  }
  
  playMention() {
    return this.play('mention');
  }
  
  playVoiceJoin() {
    return this.play('voiceJoin');
  }
  
  playVoiceLeave() {
    return this.play('voiceLeave');
  }
  
  playCallIncoming() {
    return this.play('callIncoming');
  }
  
  playCallEnd() {
    return this.play('callEnd');
  }
  
  playNotification() {
    return this.play('notification');
  }
  
  playError() {
    return this.play('error');
  }
  
  playSuccess() {
    return this.play('success');
  }
}

// Export singleton instance
const soundService = new SoundService();
export default soundService;
