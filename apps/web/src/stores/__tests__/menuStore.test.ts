import { describe, it, expect, beforeEach } from 'vitest';
import { useMenuStore } from '../menuStore';

beforeEach(() => {
  useMenuStore.setState({
    stack: [{ id: 'root', title: '0Pod', items: [
      { id: 'music', label: 'Music', action: 'navigate', submenuId: 'music' },
      { id: 'sources', label: 'Sources', action: 'navigate', submenuId: 'sources' },
      { id: 'settings', label: 'Settings', action: 'navigate', submenuId: 'settings' },
    ], selectedIndex: 0 }],
    transitionDirection: null,
  });
});

describe('useMenuStore', () => {
  it('starts at root screen', () => {
    const screen = useMenuStore.getState().currentScreen();
    expect(screen.id).toBe('root');
  });

  it('navigates forward to a submenu', () => {
    useMenuStore.getState().navigate('music');
    const screen = useMenuStore.getState().currentScreen();
    expect(screen.id).toBe('music');
    expect(useMenuStore.getState().stack.length).toBe(2);
    expect(useMenuStore.getState().transitionDirection).toBe('forward');
  });

  it('goes back to previous screen', () => {
    useMenuStore.getState().navigate('music');
    useMenuStore.getState().goBack();
    const screen = useMenuStore.getState().currentScreen();
    expect(screen.id).toBe('root');
    expect(useMenuStore.getState().transitionDirection).toBe('back');
  });

  it('does not go back past root', () => {
    useMenuStore.getState().goBack();
    expect(useMenuStore.getState().stack.length).toBe(1);
  });

  it('scrolls down through items', () => {
    useMenuStore.getState().scrollDown();
    expect(useMenuStore.getState().currentScreen().selectedIndex).toBe(1);
  });

  it('scrolls up through items', () => {
    useMenuStore.getState().scrollDown();
    useMenuStore.getState().scrollUp();
    expect(useMenuStore.getState().currentScreen().selectedIndex).toBe(0);
  });

  it('does not scroll past boundaries', () => {
    useMenuStore.getState().scrollUp();
    expect(useMenuStore.getState().currentScreen().selectedIndex).toBe(0);
  });

  it('selects a navigable item and drills down', () => {
    useMenuStore.getState().select();
    expect(useMenuStore.getState().currentScreen().id).toBe('music');
  });
});
