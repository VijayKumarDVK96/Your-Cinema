import React, { createContext, useContext, useState, useEffect } from 'react';

interface TVNavigationContextType {
  isTvMode: boolean;
  toggleTvMode: () => void;
  activeFocusId: string | null;
  setFocusId: (id: string | null) => void;
}

const TVNavigationContext = createContext<TVNavigationContextType | undefined>(undefined);

export const TVNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTvMode, setIsTvMode] = useState<boolean>(() => {
    return localStorage.getItem('yc_tv_mode') === 'true';
  });
  const [activeFocusId, setActiveFocusId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('yc_tv_mode', isTvMode ? 'true' : 'false');
    if (isTvMode) {
      document.body.classList.add('tv-mode');
    } else {
      document.body.classList.remove('tv-mode');
    }
  }, [isTvMode]);

  const toggleTvMode = () => {
    setIsTvMode((prev) => !prev);
  };

  // Global protection: Prevent Backspace key from triggering browser back navigation when not inside an active text input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        const target = e.target as HTMLElement | null;
        const activeEl = document.activeElement as HTMLElement | null;
        const isInput = (target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox'
        )) || (activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable ||
          activeEl.getAttribute('role') === 'textbox'
        ));

        if (!isInput) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);

  // Keyboard and D-Pad Event Navigation listener
  useEffect(() => {
    if (!isTvMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable ||
        activeEl.getAttribute('role') === 'textbox'
      );

      // Do not intercept keyboard events when user is typing in a text field
      if (isInput) return;

      const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [data-tv-item="true"]';
      const focusableElements = Array.from(document.querySelectorAll<HTMLElement>(focusableSelectors))
        .filter(el => el.offsetParent !== null && !el.hasAttribute('disabled'));

      if (focusableElements.length === 0) return;

      const currentFocused = document.activeElement as HTMLElement;
      const currentIndex = focusableElements.indexOf(currentFocused);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
        focusableElements[nextIndex].focus();
        focusableElements[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
        focusableElements[prevIndex].focus();
        focusableElements[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } else if (e.key === 'Escape') {
        // Back navigation on TV mode via Escape key only
        if (window.history.length > 1) {
          window.history.back();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTvMode]);

  return (
    <TVNavigationContext.Provider value={{ isTvMode, toggleTvMode, activeFocusId, setFocusId: setActiveFocusId }}>
      {children}
    </TVNavigationContext.Provider>
  );
};

export const useTVNavigation = () => {
  const context = useContext(TVNavigationContext);
  if (!context) throw new Error('useTVNavigation must be used within a TVNavigationProvider');
  return context;
};
