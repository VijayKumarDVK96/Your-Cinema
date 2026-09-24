import React, { useState, useEffect, useCallback } from 'react';
import { Box, Tooltip, Zoom } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface BackToTopProps {
  /**
   * CSS selector for the scrollable container element. Defaults to '#main-content'.
   */
  targetSelector?: string;
  /**
   * Distance in pixels from top before showing the button. Default: 250.
   */
  threshold?: number;
  /**
   * Whether to show the circular progress indicator around the button. Default: true.
   */
  showProgress?: boolean;
}

export const BackToTop: React.FC<BackToTopProps> = ({
  targetSelector = '#main-content',
  threshold = 250,
  showProgress = true,
}) => {
  const [visible, setVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const location = useLocation();

  // Scroll target element to top smoothly
  const scrollToTop = useCallback(() => {
    let scrolled = false;

    if (targetSelector) {
      const container = document.querySelector(targetSelector);
      if (container && container.scrollTop > 0) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
        scrolled = true;
      }
    }

    if (!scrolled || window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [targetSelector]);

  // Reset scroll to top on route change
  useEffect(() => {
    const container = targetSelector ? document.querySelector(targetSelector) : null;
    if (container) {
      container.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.search, targetSelector]);

  // Listen to scroll events on both the container and window
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const container = targetSelector ? document.querySelector(targetSelector) : null;

          let currentScroll = 0;
          let maxScroll = 1;

          if (container && (container.scrollHeight > container.clientHeight || container.scrollTop > 0)) {
            currentScroll = container.scrollTop;
            maxScroll = Math.max(1, container.scrollHeight - container.clientHeight);
          } else {
            currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
            maxScroll = Math.max(
              1,
              document.documentElement.scrollHeight - window.innerHeight
            );
          }

          setVisible(currentScroll > threshold);
          const progress = Math.min(100, Math.max(0, (currentScroll / maxScroll) * 100));
          setScrollProgress(progress);
          ticking = false;
        });
        ticking = true;
      }
    };

    const container = targetSelector ? document.querySelector(targetSelector) : null;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check
    handleScroll();

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [targetSelector, threshold]);

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <AnimatePresence>
      {visible && (
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 76, md: 28 },
            right: { xs: 18, md: 28 },
            zIndex: 1150,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <Tooltip title="Back to Top" arrow placement="left">
              <Box
                component="button"
                onClick={scrollToTop}
                aria-label="Back to Top"
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    scrollToTop();
                  }
                }}
                sx={{
                  width: { xs: 44, md: 48 },
                  height: { xs: 44, md: 48 },
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  cursor: 'pointer',
                  border: '1px solid rgba(229, 169, 60, 0.35)',
                  backgroundColor: 'rgba(15, 20, 31, 0.85)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: '#E5A93C',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 15px rgba(229, 169, 60, 0.15)',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  outline: 'none',
                  p: 0,
                  m: 0,
                  '&:hover': {
                    backgroundColor: 'rgba(21, 28, 44, 0.95)',
                    borderColor: '#E5A93C',
                    transform: 'translateY(-3px)',
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6), 0 0 22px rgba(229, 169, 60, 0.4)',
                    color: '#F5C869',
                  },
                  '&:active': {
                    transform: 'translateY(0) scale(0.95)',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #E5A93C',
                    outlineOffset: '2px',
                  },
                }}
              >
                {showProgress && (
                  <Box
                    component="svg"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      transform: 'rotate(-90deg)',
                      pointerEvents: 'none',
                    }}
                    viewBox="0 0 48 48"
                  >
                    {/* Background track */}
                    <circle
                      cx="24"
                      cy="24"
                      r={radius}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeWidth="2.5"
                    />
                    {/* Progress fill */}
                    <circle
                      cx="24"
                      cy="24"
                      r={radius}
                      fill="none"
                      stroke="#E5A93C"
                      strokeWidth="2.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      style={{
                        transition: 'stroke-dashoffset 0.1s ease',
                      }}
                    />
                  </Box>
                )}

                <KeyboardArrowUpIcon
                  sx={{
                    fontSize: { xs: 24, md: 28 },
                    zIndex: 1,
                    transition: 'transform 0.2s ease',
                    '.MuiBox-root:hover &': {
                      transform: 'translateY(-2px)',
                    },
                  }}
                />
              </Box>
            </Tooltip>
          </motion.div>
        </Box>
      )}
    </AnimatePresence>
  );
};
