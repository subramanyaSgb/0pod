import { IPodShell } from './components/iPod/IPodShell';
import { LCDScreen } from './components/iPod/LCDScreen';
import { StatusBar } from './components/StatusBar/StatusBar';
import { MenuScreen } from './components/Menu/MenuScreen';
import { ClickWheel } from './components/ClickWheel/ClickWheel';
import { InstallPrompt } from './components/InstallPrompt/InstallPrompt';
import { useAudioEngine } from './hooks/useAudioEngine';

export function App() {
  useAudioEngine();

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
