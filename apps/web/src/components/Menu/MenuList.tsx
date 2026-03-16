import { useEffect, useRef } from 'react';
import type { MenuItem } from '@0pod/shared';
import styles from './MenuList.module.css';

interface MenuListProps {
  items: MenuItem[];
  selectedIndex: number;
}

export function MenuList({ items, selectedIndex }: MenuListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <div className={styles.list} ref={listRef}>
      {items.map((item, index) => (
        <div
          key={item.id}
          ref={index === selectedIndex ? selectedRef : undefined}
          className={`${styles.item} ${index === selectedIndex ? styles.selected : ''}`}
        >
          <span>{item.label}</span>
          {item.action === 'navigate' && <span className={styles.arrow}>&#9654;</span>}
        </div>
      ))}
    </div>
  );
}
