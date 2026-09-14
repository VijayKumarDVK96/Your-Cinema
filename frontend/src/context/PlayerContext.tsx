import React, { createContext, useContext, useState } from 'react';
import { UserMovie, MovieSource } from '../types/index.js';
import { isYouTubeSource, openYouTubeAutoplay } from '../utils/youtube.js';

interface PlayerContextType {
  activeMovie: UserMovie | null;
  activeSource: MovieSource | null;
  isOpen: boolean;
  openPlayer: (movie: UserMovie, source?: MovieSource) => void;
  closePlayer: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMovie, setActiveMovie] = useState<UserMovie | null>(null);
  const [activeSource, setActiveSource] = useState<MovieSource | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const openPlayer = (movie: UserMovie, source?: MovieSource) => {
    // If source not provided, pick first available source or default to trailer
    const chosenSource = source || (movie.sources && movie.sources.length > 0 ? movie.sources[0] : null);

    // If assigned OTT or source is YouTube, directly open YouTube app or website with autoplay
    if (chosenSource && isYouTubeSource(chosenSource)) {
      openYouTubeAutoplay(chosenSource.external_url || '', movie.title);
      return;
    }

    setActiveMovie(movie);
    setActiveSource(chosenSource);
    setIsOpen(true);
  };

  const closePlayer = () => {
    setIsOpen(false);
    setActiveMovie(null);
    setActiveSource(null);
  };

  return (
    <PlayerContext.Provider value={{ activeMovie, activeSource, isOpen, openPlayer, closePlayer }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
};
