import { useEffect } from 'react';
import { IPodShell } from './components/iPod/IPodShell';
import { LCDScreen } from './components/iPod/LCDScreen';
import { StatusBar } from './components/StatusBar/StatusBar';
import { MenuScreen } from './components/Menu/MenuScreen';
import { ClickWheel } from './components/ClickWheel/ClickWheel';
import { InstallPrompt } from './components/InstallPrompt/InstallPrompt';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useLocalFilesStore } from './stores/localFilesStore';

export function App() {
  useAudioEngine();

  // Load saved files from IndexedDB on startup
  useEffect(() => {
    useLocalFilesStore.getState().loadFiles();
  }, []);

  return (
    <>
      <IPodShell
        screen={
          <LCDScreen>
            <StatusBar />
            <MenuScreen />
          </LCDScreen>
        }
        wheel={<ClickWheel />}
      />
      <InstallPrompt />
    </>
  );
}
