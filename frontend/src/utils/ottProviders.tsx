import React from 'react';
import { Box, Chip } from '@mui/material';

export interface OttMeta {
  key: string;
  name: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ReactNode;
  getDefaultSearchUrl: (title: string) => string;
}

// Crisp inline SVGs for standard streaming providers
const NetflixIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.5 21V3H8.8L15.2 17.5V3H18.5V21H15.2L8.8 6.5V21H5.5Z" fill="#E50914" />
  </svg>
);

const PrimeVideoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#00A8E1" />
    <path d="M4 14.5C9 18 15 18 20 13.5M16.5 12.5L20 13.5L18.5 10" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="8" r="1.5" fill="#FFFFFF" />
    <circle cx="15" cy="8" r="1.5" fill="#FFFFFF" />
  </svg>
);

const HotstarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#0C1B33" />
    <path d="M12 4L14.2 8.5L19 9.2L15.5 12.6L16.3 17.4L12 15.1L7.7 17.4L8.5 12.6L5 9.2L9.8 8.5L12 4Z" fill="#FFCC00" />
  </svg>
);

const AppleTvIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#000000" />
    <path d="M14.5 11.8C14.5 9.7 16.2 8.7 16.3 8.6C15.3 7.2 13.8 7 13.3 6.9C12 6.8 10.7 7.7 10 7.7C9.3 7.7 8.3 7 7.2 7C5.7 7 4.3 7.9 3.5 9.3C1.9 12.1 3.1 16.2 4.6 18.4C5.4 19.5 6.3 20.7 7.5 20.7C8.7 20.7 9.1 20 10.5 20C11.9 20 12.3 20.7 13.5 20.7C14.7 20.7 15.5 19.6 16.3 18.5C17.2 17.2 17.5 16 17.6 15.9C17.5 15.8 14.5 14.7 14.5 11.8Z" fill="#FFFFFF" />
    <path d="M12.5 5.2C13.1 4.5 13.5 3.5 13.4 2.5C12.5 2.5 11.5 3.1 10.9 3.8C10.4 4.4 10 5.4 10.1 6.4C11.1 6.5 12 5.9 12.5 5.2Z" fill="#FFFFFF" />
  </svg>
);

const JioCinemaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#E20074" />
    <circle cx="12" cy="12" r="6" fill="#FFFFFF" />
    <path d="M10.5 9.5L14.5 12L10.5 14.5V9.5Z" fill="#E20074" />
  </svg>
);

const Zee5Icon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#8230C6" />
    <text x="12" y="16" fill="#FFFFFF" fontSize="12" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">Z5</text>
  </svg>
);

const SonyLivIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#181D2D" stroke="#FF5E00" strokeWidth="1.5" />
    <text x="12" y="15" fill="#FF5E00" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">LIV</text>
  </svg>
);

const DriveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.7 15.5L3.8 8.8L8.3 1H16.1L11.6 8.8H20.5L16 16.5L7.7 15.5Z" fill="#0F9D58" opacity="0.9" />
    <path d="M15.7 23L7.7 15.5L11.6 8.8L19.6 16.3L15.7 23Z" fill="#4285F4" />
    <path d="M3.8 8.8L7.7 15.5L3.8 22.2L0 15.5L3.8 8.8Z" fill="#FFBA00" />
  </svg>
);

const YouTubeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#FF0000" />
    <polygon points="9.5,7.5 16.5,12 9.5,16.5" fill="#FFFFFF" />
  </svg>
);

const SunNxtIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#FF6B00" />
    <circle cx="12" cy="9" r="4" fill="#FFD700" />
    <path d="M12 2V4M12 14V16M4 9H6M18 9H20M5.6 4.6L7 6M19.4 4.6L18 6M5.6 13.4L7 12M19.4 13.4L18 12" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" />
    <text x="12" y="22" fill="#FFFFFF" fontSize="5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">SUN NXT</text>
  </svg>
);

const ViMoviesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#E40046" />
    <text x="12" y="10" fill="#FFFFFF" fontSize="5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">Vi</text>
    <text x="12" y="18" fill="#FFCD00" fontSize="4" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">MOVIES</text>
  </svg>
);

const AhaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#FF5000" />
    <text x="12" y="16" fill="#FFFFFF" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">aha</text>
  </svg>
);

const DefaultOttIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#1E293B" stroke="#64748B" strokeWidth="1" />
    <path d="M4 6H20V16H4V6Z" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 20L12 16L14 20" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const getOttMeta = (providerName: string = '', iconOrUrl?: string): OttMeta => {
  const nameLower = providerName.toLowerCase();
  const iconLower = (iconOrUrl || '').toLowerCase();

  if (nameLower.includes('netflix') || iconLower.includes('netflix')) {
    return {
      key: 'netflix',
      name: 'Netflix',
      bgColor: '#E50914',
      textColor: '#FFFFFF',
      borderColor: 'rgba(229, 9, 20, 0.4)',
      icon: <NetflixIcon />,
      getDefaultSearchUrl: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
    };
  }

  if (nameLower.includes('prime') || nameLower.includes('amazon') || iconLower.includes('prime')) {
    return {
      key: 'prime',
      name: 'Prime Video',
      bgColor: '#00A8E1',
      textColor: '#FFFFFF',
      borderColor: 'rgba(0, 168, 225, 0.4)',
      icon: <PrimeVideoIcon />,
      getDefaultSearchUrl: (title) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(title)}`,
    };
  }

  if (nameLower.includes('hotstar') || nameLower.includes('jiohotstar') || nameLower.includes('disney') || iconLower.includes('hotstar')) {
    return {
      key: 'hotstar',
      name: 'JioHotstar',
      bgColor: '#0C1B33',
      textColor: '#FFCC00',
      borderColor: 'rgba(255, 204, 0, 0.4)',
      icon: <HotstarIcon />,
      getDefaultSearchUrl: (title) => `https://www.hotstar.com/in/explore?search_query=${encodeURIComponent(title)}`,
    };
  }

  if (nameLower.includes('apple') || iconLower.includes('apple') || iconLower.includes('appletv')) {
    return {
      key: 'appletv',
      name: 'Apple TV+',
      bgColor: '#1C1C1E',
      textColor: '#FFFFFF',
      borderColor: 'rgba(255, 255, 255, 0.25)',
      icon: <AppleTvIcon />,
      getDefaultSearchUrl: (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
    };
  }

  if (nameLower.includes('jio') || iconLower.includes('jiocinema')) {
    return {
      key: 'jiocinema',
      name: 'JioCinema',
      bgColor: '#E20074',
      textColor: '#FFFFFF',
      borderColor: 'rgba(226, 0, 116, 0.4)',
      icon: <JioCinemaIcon />,
      getDefaultSearchUrl: (title) => `https://www.jiocinema.com/search/${encodeURIComponent(title)}`,
    };
  }

  if (nameLower.includes('zee') || iconLower.includes('zee5')) {
    return {
      key: 'zee5',
      name: 'Zee5',
      bgColor: '#8230C6',
      textColor: '#FFFFFF',
      borderColor: 'rgba(130, 48, 198, 0.4)',
      icon: <Zee5Icon />,
      getDefaultSearchUrl: (title) => `https://www.zee5.com/search?q=${encodeURIComponent(title)}`,
    };
  }

  if (nameLower.includes('sony') || iconLower.includes('sonyliv')) {
    return {
      key: 'sonyliv',
      name: 'Sony LIV',
      bgColor: '#181D2D',
      textColor: '#FF5E00',
      borderColor: 'rgba(255, 94, 0, 0.4)',
      icon: <SonyLivIcon />,
      getDefaultSearchUrl: (title) => `https://www.sonyliv.com/search/${encodeURIComponent(title)}`,
    };
  }

  if (nameLower.includes('drive') || iconLower.includes('drive')) {
    return {
      key: 'google_drive',
      name: 'Google Drive',
      bgColor: '#0F9D58',
      textColor: '#FFFFFF',
      borderColor: 'rgba(15, 157, 88, 0.4)',
      icon: <DriveIcon />,
      getDefaultSearchUrl: () => '#',
    };
  }

  if (nameLower.includes('sun nxt') || nameLower.includes('sunnxt') || iconLower.includes('sun_nxt') || iconLower.includes('sunnxt')) {
    return {
      key: 'sunnxt',
      name: 'Sun NXT',
      bgColor: '#FF6B00',
      textColor: '#FFFFFF',
      borderColor: 'rgba(255, 107, 0, 0.5)',
      icon: <SunNxtIcon />,
      getDefaultSearchUrl: (title) => `https://www.sunnxt.com/search?q=${encodeURIComponent(title)}`,
    };
  }

  if (nameLower.includes('vi movies') || nameLower.includes('vi movie') || nameLower.includes('vodafone') || iconLower.includes('vi_movies') || iconLower.includes('vimovies')) {
    return {
      key: 'vimovies',
      name: 'Vi Movies & TV',
      bgColor: '#E40046',
      textColor: '#FFCD00',
      borderColor: 'rgba(228, 0, 70, 0.5)',
      icon: <ViMoviesIcon />,
      getDefaultSearchUrl: (title) => `https://www.vijungle.com/search?q=${encodeURIComponent(title)}`,
    };
  }

  if (nameLower.includes('aha') || iconLower.includes('aha')) {
    return {
      key: 'aha',
      name: 'Aha',
      bgColor: '#FF5000',
      textColor: '#FFFFFF',
      borderColor: 'rgba(255, 80, 0, 0.5)',
      icon: <AhaIcon />,
      getDefaultSearchUrl: (title) => `https://www.aha.video/search?q=${encodeURIComponent(title)}`,
    };
  }

  if (nameLower.includes('youtube') || iconLower.includes('youtube')) {
    return {
      key: 'youtube',
      name: 'YouTube',
      bgColor: '#FF0000',
      textColor: '#FFFFFF',
      borderColor: 'rgba(255, 0, 0, 0.4)',
      icon: <YouTubeIcon />,
      getDefaultSearchUrl: (title) => `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' movie')}`,
    };
  }

  return {
    key: 'other',
    name: providerName || 'Streaming Service',
    bgColor: '#1E293B',
    textColor: '#38BDF8',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    icon: <DefaultOttIcon />,
    getDefaultSearchUrl: (title) => `https://www.google.com/search?q=${encodeURIComponent(title + ' watch online ' + providerName)}`,
  };
};

export const OttBadge: React.FC<{
  providerName?: string;
  providerIcon?: string;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ providerName = '', providerIcon, size = 'small', interactive = false, onClick }) => {
  const meta = getOttMeta(providerName, providerIcon);

  // If a remote image logo URL is supplied (e.g. from TMDB), use it
  const isHttpLogo = providerIcon && providerIcon.startsWith('http');

  if (size === 'small') {
    return (
      <Box
        onClick={onClick}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.6,
          px: 0.9,
          py: 0.35,
          borderRadius: 1.5,
          backgroundColor: 'rgba(10, 14, 24, 0.92)',
          border: `1px solid ${meta.borderColor}`,
          backdropFilter: 'blur(6px)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
          cursor: interactive ? 'pointer' : 'default',
          transition: 'all 0.15s ease',
          '&:hover': interactive ? {
            transform: 'scale(1.05)',
            borderColor: meta.textColor,
          } : {},
        }}
      >
        {isHttpLogo ? (
          <Box
            component="img"
            src={providerIcon}
            alt={meta.name}
            sx={{ width: 14, height: 14, borderRadius: 0.5, objectFit: 'contain' }}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', transform: 'scale(0.8)' }}>
            {meta.icon}
          </Box>
        )}
        <Box
          component="span"
          sx={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: meta.textColor,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {meta.name}
        </Box>
      </Box>
    );
  }

  return (
    <Chip
      clickable={interactive}
      onClick={onClick}
      icon={
        isHttpLogo ? (
          <Box
            component="img"
            src={providerIcon}
            alt={meta.name}
            sx={{ width: 18, height: 18, borderRadius: 0.5, objectFit: 'contain' }}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5 }}>{meta.icon}</Box>
        )
      }
      label={meta.name}
      sx={{
        backgroundColor: 'rgba(14, 20, 33, 0.9)',
        border: `1px solid ${meta.borderColor}`,
        color: meta.textColor,
        fontWeight: 700,
        fontSize: '0.8rem',
        height: size === 'large' ? 36 : 28,
        '&:hover': interactive ? {
          backgroundColor: 'rgba(25, 35, 58, 0.95)',
          borderColor: meta.textColor,
        } : {},
      }}
    />
  );
};
