import { useEffect, useRef, useState } from 'react';
import type { MenuItem } from '@0pod/shared';
import { useMenuStore } from '../../stores/menuStore';
import { MenuList } from './MenuList';
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
  const [screens, setScreens] = useState<ScreenState[]>([
    { ...current, className: '' },
  ]);
  const prevStackLenRef = useRef(stack.length);

  useEffect(() => {
    const prevLen = prevStackLenRef.current;
    prevStackLenRef.current = stack.length;

    if (direction === 'forward' && stack.length > prevLen) {
      const prev = stack[stack.length - 2];
      setScreens([
        { ...prev, className: styles.slideExitForward },
        { ...current, className: styles.slideEnterForward },
      ]);
    } else if (direction === 'back' && stack.length < prevLen) {
      setScreens((prev) => {
        const exiting = prev[prev.length - 1];
        return [
          { ...current, className: styles.slideEnterBack },
          { ...exiting, className: styles.slideExitBack },
        ];
      });
    } else {
      setScreens([{ ...current, className: '' }]);
    }

    const timer = setTimeout(() => {
      setScreens([{ ...current, className: '' }]);
    }, 250);

    return () => clearTimeout(timer);
  }, [stack, direction, current]);

  return (
    <div className={styles.screenContainer}>
      {screens.map((screen, i) => (
        <div key={`${screen.id}-${i}`} className={`${styles.screenWrapper} ${screen.className}`}>
          <MenuList items={screen.items} selectedIndex={screen.selectedIndex} />
        </div>
      ))}
    </div>
  );
}
