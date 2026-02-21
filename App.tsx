
import React, { useEffect, memo } from 'react';
import AppContent from './components/AppContent.tsx';
import DummyAudio from './components/audio/DummyAudio.tsx';
import { useGlobalUiStore } from './store/useGlobalUiStore.ts';

const App: React.FC = memo(() => {
  const theme = useGlobalUiStore(state => state.theme);

  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <>
      <DummyAudio />
      <AppContent />
    </>
  );
});

export default App;
