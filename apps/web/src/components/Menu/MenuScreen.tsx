import { useEffect, useRef, useState, useCallback } from 'react';
import type { MenuItem } from '@0pod/shared';
import { useMenuStore } from '../../stores/menuStore';
import { MenuList } from './MenuList';
import { NowPlaying } from '../NowPlaying/NowPlaying';
import { SearchScreen } from '../Search/SearchScreen';
import { LocalFilesScreen } from '../LocalFiles/LocalFilesScreen';
import styles from './MenuScreen.module.css';

interface ScreenState {
  id: string;
  items: MenuItem[];
  selectedIndex: number;
  className: string;
}

export function MenuScreen() {
  const stack = useMenuStore((s) => s.stack);
  const direction = useMenuStore((s) => s.transitionDirection);
  const current = stack[stack.length - 1];
  const prevStackLenRef = useRef(stack.length);
  const isTransitioningRef = useRef(false);

  const [screens, setScreens] = useState<ScreenState[]>([
    { ...current, className: '' },
  ]);

  // Only handle navigation transitions (stack length changes)
  useEffect(() => {
    const prevLen = prevStackLenRef.current;
    const newLen = stack.length;

    if (prevLen === newLen) {
      // Stack length didn't change — just a scroll update, not a navigation.
      // Update the current screen's selectedIndex without triggering animation.
      setScreens((prev) => {
        const updated = [...prev];
        const last = { ...updated[updated.length - 1] };
        last.selectedIndex = current.selectedIndex;
        last.items = current.items;
        updated[updated.length - 1] = last;
        return updated;
      });
      return;
    }

    prevStackLenRef.current = newLen;
    isTransitioningRef.current = true;

    if (direction === 'forward' && newLen > prevLen) {
      const prev = stack[stack.length - 2];
      setScreens([
        { ...prev, className: styles.slideExitForward },
        { ...current, className: styles.slideEnterForward },
      ]);
    } else if (direction === 'back' && newLen < prevLen) {
      setScreens((prevScreens) => {
        const exiting = prevScreens[prevScreens.length - 1];
        return [
          { ...current, className: styles.slideEnterBack },
          { ...exiting, className: styles.slideExitBack },
        ];
      });
    }

    const timer = setTimeout(() => {
      isTransitioningRef.current = false;
      setScreens([{ ...current, className: '' }]);
    }, 260); // Slightly longer than animation duration to avoid cut-off

    return () => clearTimeout(timer);
  }, [stack, direction, current]);

  return (
    <div className={styles.screenContainer}>
      {screens.map((screen, i) => (
        <div key={`${screen.id}-${i}`} className={`${styles.screenWrapper} ${screen.className}`}>
          {screen.id === 'nowPlaying' ? (
            <NowPlaying />
          ) : screen.id === 'search' ? (
            <SearchScreen />
          ) : screen.id === 'localFiles' ? (
            <LocalFilesScreen />
          ) : (
            <MenuList items={screen.items} selectedIndex={screen.selectedIndex} />
          )}
        </div>
      ))}
    </div>
  );
}
