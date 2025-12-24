import React, { useState, useRef, useEffect } from 'react';
import Scene from './components/Scene';
import { AppMode } from './types';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Background Music - "We Wish You a Merry Christmas" (Royalty Free)
  const MUSIC_URL = "https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3"; 

  const handleUserInteraction = () => {
    // Browsers block autoplay until interaction
    if (audioRef.current && !isPlaying) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(e => console.log("Audio play failed pending interaction", e));
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative w-full h-full bg-black" onClick={handleUserInteraction}>
      {/* Audio Element */}
      <audio ref={audioRef} src={MUSIC_URL} loop />

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 w-full z-10 p-8 pointer-events-none flex flex-col items-center justify-center text-center">
        <h1 className="serif-font text-3xl md:text-5xl lg:text-6xl text-amber-200 tracking-widest drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] font-bold mb-2">
          MERRY CHRISTMAS
        </h1>
        <p className="serif-font text-amber-100/60 text-sm md:text-base tracking-widest uppercase">
          Click to Interact • Drag to Rotate
        </p>
      </div>

      {/* Music Controls */}
      <div className="absolute bottom-8 right-8 z-20 flex gap-4">
        <button 
          onClick={togglePlay}
          className="p-3 bg-black/40 backdrop-blur-md rounded-full text-amber-200 border border-amber-500/30 hover:bg-amber-900/40 transition-all duration-300"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button 
          onClick={toggleMute}
          className="p-3 bg-black/40 backdrop-blur-md rounded-full text-amber-200 border border-amber-500/30 hover:bg-amber-900/40 transition-all duration-300"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* 3D Scene */}
      <div className="w-full h-full cursor-pointer">
        <Scene />
      </div>
    </div>
  );
};

export default App;
