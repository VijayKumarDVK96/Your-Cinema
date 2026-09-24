import React, { useState, useEffect } from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

// Keyframe for 3D tumbling dice
const tumble3D = keyframes`
  0% {
    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(0.6);
  }
  15% {
    transform: rotateX(420deg) rotateY(240deg) rotateZ(120deg) scale(1.1) translateY(-20px);
  }
  35% {
    transform: rotateX(960deg) rotateY(600deg) rotateZ(300deg) scale(1.18) translateY(-32px);
  }
  60% {
    transform: rotateX(1680deg) rotateY(1140deg) rotateZ(600deg) scale(1.08) translateY(-14px);
  }
  80% {
    transform: rotateX(2220deg) rotateY(1680deg) rotateZ(960deg) scale(1.02) translateY(-4px);
  }
  95% {
    transform: rotateX(2520deg) rotateY(1980deg) rotateZ(1080deg) scale(1) translateY(0);
  }
  100% {
    transform: rotateX(2520deg) rotateY(1980deg) rotateZ(1080deg) scale(1.08);
  }
`;

const shadowPulse = keyframes`
  0%, 100% {
    transform: scale(0.6);
    opacity: 0.3;
  }
  35% {
    transform: scale(1.3);
    opacity: 0.7;
  }
  60% {
    transform: scale(0.9);
    opacity: 0.4;
  }
  95% {
    transform: scale(1.1);
    opacity: 0.8;
  }
`;

const auraPulse = keyframes`
  0%, 100% {
    transform: scale(0.95);
    opacity: 0.35;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.75;
  }
`;

const sparkleFloat = keyframes`
  0% {
    transform: translateY(0px) scale(0.7) rotate(0deg);
    opacity: 0;
  }
  50% {
    opacity: 1;
    transform: translateY(-24px) scale(1.2) rotate(180deg);
  }
  100% {
    transform: translateY(-48px) scale(0.5) rotate(360deg);
    opacity: 0;
  }
`;

const CINEMATIC_PHRASES = [
  '🎲 Rolling the Cinematic Dice...',
  '✨ Consulting your director & genre affinities...',
  '🎬 Scanning your unwatched collection...',
  '🎯 Curating your next masterwork...',
];

interface DiceRollTransitionProps {
  duration?: number; // In milliseconds (default: 3000)
}

export const DiceRollTransition: React.FC<DiceRollTransitionProps> = ({ duration = 3000 }) => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Cycle through cinematic phrases during the roll
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % CINEMATIC_PHRASES.length);
    }, 750);
    return () => clearInterval(interval);
  }, []);

  // 3D Die Dimension Configuration
  const size = 80;
  const half = size / 2;

  // Face styling helper
  const faceCommon = {
    position: 'absolute' as const,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '16px',
    backgroundColor: '#0F1626',
    backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(229, 169, 60, 0.22) 0%, rgba(15, 22, 38, 0.98) 70%)',
    border: '2px solid rgba(229, 169, 60, 0.75)',
    boxShadow: 'inset 0 0 16px rgba(229, 169, 60, 0.25), 0 0 20px rgba(0, 0, 0, 0.9)',
    display: 'grid',
    padding: '12px',
    boxSizing: 'border-box' as const,
    backfaceVisibility: 'visible' as const,
  };

  // Dot (Pip) styling
  const pip = (
    <Box
      sx={{
        width: 13,
        height: 13,
        borderRadius: '50%',
        backgroundColor: '#E5A93C',
        backgroundImage: 'radial-gradient(circle at 35% 35%, #FFFDF5 10%, #F5C869 45%, #E5A93C 75%, #B37D1A 100%)',
        boxShadow: '0 0 8px #E5A93C, inset 0 0 2px rgba(255, 255, 255, 0.9)',
        margin: 'auto',
      }}
    />
  );

  return (
    <Box
      sx={{
        minHeight: 330,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        py: 4,
        background: 'radial-gradient(ellipse at center, rgba(229, 169, 60, 0.12) 0%, rgba(15, 21, 35, 0.95) 70%)',
        borderRadius: 3.5,
      }}
    >
      {/* Ambient Pulsing Aura */}
      <Box
        sx={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(229, 169, 60, 0.3) 0%, rgba(56, 189, 248, 0.15) 50%, transparent 75%)',
          filter: 'blur(30px)',
          animation: `${auraPulse} 2s ease-in-out infinite`,
          pointerEvents: 'none',
        }}
      />

      {/* Floating Sparkle Elements */}
      {[
        { top: '25%', left: '28%', delay: '0s', size: 18 },
        { top: '20%', right: '30%', delay: '0.4s', size: 22 },
        { bottom: '30%', left: '32%', delay: '0.8s', size: 16 },
        { bottom: '25%', right: '28%', delay: '1.2s', size: 20 },
      ].map((sp, idx) => (
        <Box
          key={idx}
          sx={{
            position: 'absolute',
            top: sp.top,
            left: sp.left,
            right: sp.right,
            bottom: sp.bottom,
            color: '#E5A93C',
            fontSize: sp.size,
            animation: `${sparkleFloat} 1.8s ease-in-out infinite`,
            animationDelay: sp.delay,
            pointerEvents: 'none',
          }}
        >
          ✦
        </Box>
      ))}

      {/* 3D Rolling Dice Stage */}
      <Box
        sx={{
          perspective: '1000px',
          width: size,
          height: size,
          position: 'relative',
          mb: 4,
          mt: 1,
        }}
      >
        {/* Dice Cube */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            animation: `${tumble3D} ${duration}ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards`,
          }}
        >
          {/* Face 1: One pip (Center) */}
          <Box
            sx={{
              ...faceCommon,
              transform: `translateZ(${half}px)`,
              gridTemplateColumns: '1fr',
              gridTemplateRows: '1fr',
            }}
          >
            {pip}
          </Box>

          {/* Face 6: Six pips (Opposite 1) */}
          <Box
            sx={{
              ...faceCommon,
              transform: `rotateY(180deg) translateZ(${half}px)`,
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
            }}
          >
            {pip}
            {pip}
            {pip}
            {pip}
            {pip}
            {pip}
          </Box>

          {/* Face 3: Three pips */}
          <Box
            sx={{
              ...faceCommon,
              transform: `rotateY(90deg) translateZ(${half}px)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ alignSelf: 'flex-start' }}>{pip}</Box>
            <Box sx={{ alignSelf: 'center' }}>{pip}</Box>
            <Box sx={{ alignSelf: 'flex-end' }}>{pip}</Box>
          </Box>

          {/* Face 4: Four pips (Opposite 3) */}
          <Box
            sx={{
              ...faceCommon,
              transform: `rotateY(-90deg) translateZ(${half}px)`,
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
            }}
          >
            {pip}
            {pip}
            {pip}
            {pip}
          </Box>

          {/* Face 2: Two pips */}
          <Box
            sx={{
              ...faceCommon,
              transform: `rotateX(90deg) translateZ(${half}px)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ alignSelf: 'flex-start' }}>{pip}</Box>
            <Box sx={{ alignSelf: 'flex-end' }}>{pip}</Box>
          </Box>

          {/* Face 5: Five pips (Opposite 2) */}
          <Box
            sx={{
              ...faceCommon,
              transform: `rotateX(-90deg) translateZ(${half}px)`,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
            }}
          >
            <Box sx={{ gridArea: '1 / 1' }}>{pip}</Box>
            <Box sx={{ gridArea: '1 / 3' }}>{pip}</Box>
            <Box sx={{ gridArea: '2 / 2' }}>{pip}</Box>
            <Box sx={{ gridArea: '3 / 1' }}>{pip}</Box>
            <Box sx={{ gridArea: '3 / 3' }}>{pip}</Box>
          </Box>
        </Box>

        {/* 3D Realistic Drop Shadow */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -28,
            left: '10%',
            width: '80%',
            height: 18,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(0, 0, 0, 0.85) 0%, rgba(229, 169, 60, 0.25) 40%, transparent 75%)',
            filter: 'blur(5px)',
            animation: `${shadowPulse} ${duration}ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards`,
          }}
        />
      </Box>

      {/* Shuffling Status Text */}
      <Box sx={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, zIndex: 2 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={phraseIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#F8FAFC',
                letterSpacing: '0.02em',
                textAlign: 'center',
                textShadow: '0 0 12px rgba(229, 169, 60, 0.4)',
                fontSize: { xs: '1rem', md: '1.15rem' },
              }}
            >
              {CINEMATIC_PHRASES[phraseIndex]}
            </Typography>
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Animated 3-Second Golden Progress Bar */}
      <Box
        sx={{
          width: { xs: '80%', sm: 260 },
          height: 4,
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Box
          component={motion.div}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          sx={{
            height: '100%',
            background: 'linear-gradient(90deg, #E5A93C 0%, #F5C869 50%, #38BDF8 100%)',
            boxShadow: '0 0 10px rgba(229, 169, 60, 0.8)',
          }}
        />
      </Box>
    </Box>
  );
};
