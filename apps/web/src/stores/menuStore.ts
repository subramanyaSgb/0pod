import { create } from 'zustand';
import type { MenuScreen, MenuItem } from '@0pod/shared';
import { getMenuScreen } from './menuData';

interface MenuState {
  stack: MenuScreen[];
  transitionDirection: 'forward' | 'back' | null;
  currentScreen: () => MenuScreen;
  currentTitle: () => string;
  canGoBack: () => boolean;
  navigate: (submenuId: string) => void;
  goBack: () => void;
  scrollUp: () => void;
  scrollDown: () => void;
  select: () => MenuItem | undefined;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  stack: [getMenuScreen('root')],
  transitionDirection: null,

  currentScreen: () => {
    const { stack } = get();
    return stack[stack.length - 1];
  },

  currentTitle: () => {
    return get().currentScreen().title;
  },

  canGoBack: () => {
    return get().stack.length > 1;
  },

  navigate: (submenuId: string) => {
    const screen = getMenuScreen(submenuId);
    set((state) => ({
      stack: [...state.stack, screen],
      transitionDirection: 'forward',
    }));
  },

  goBack: () => {
    if (!get().canGoBack()) return;
    set((state) => ({
      stack: state.stack.slice(0, -1),
      transitionDirection: 'back',
    }));
  },

  scrollUp: () => {
    set((state) => {
      const stack = [...state.stack];
      const current = { ...stack[stack.length - 1] };
      if (current.selectedIndex > 0) {
        current.selectedIndex -= 1;
        stack[stack.length - 1] = current;
      }
      return { stack };
    });
  },

  scrollDown: () => {
    set((state) => {
      const stack = [...state.stack];
      const current = { ...stack[stack.length - 1] };
      if (current.selectedIndex < current.items.length - 1) {
        current.selectedIndex += 1;
        stack[stack.length - 1] = current;
      }
      return { stack };
    });
  },

  select: () => {
    const screen = get().currentScreen();
    const item = screen.items[screen.selectedIndex];
    if (item?.action === 'navigate' && item.submenuId) {
      get().navigate(item.submenuId);
    }
    return item;
  },
}));
