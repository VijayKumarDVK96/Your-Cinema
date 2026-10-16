import React, { createContext, useContext, useState } from 'react';
import { UserMovie, MovieSource } from '../types/index.js';
import { isDriveSource } from '../utils/googleDrive.js';
import { isYouTubeSource } from '../utils/youtube.js';
import { getOttMeta } from '../utils/ottProviders.js';

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
    // If source not provided, prefer in-app playable source (Drive or YouTube)
    let chosenSource: MovieSource | null = source || null;
    if (!chosenSource && movie.sources && movie.sources.length > 0) {
      chosenSource = movie.sources.find((s: any) => isDriveSource(s) || isYouTubeSource(s)) || null;
    }

    // If it's an OTT source, open the OTT URL alone in a new tab directly!
    if (chosenSource && !isDriveSource(chosenSource) && !isYouTubeSource(chosenSource)) {
      const meta = getOttMeta(chosenSource.provider_name, chosenSource.provider_icon);
      const raw = chosenSource.external_url || '';
      const targetUrl = (raw && !raw.includes('themoviedb.org')) ? raw : meta.getDefaultSearchUrl(movie.title);
      if (targetUrl) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return;
      }
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
