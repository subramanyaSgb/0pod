import type { ReactNode } from 'react';
import styles from './IPodShell.module.css';

interface IPodShellProps {
  screen: ReactNode;
  wheel: ReactNode;
}

export function IPodShell({ screen, wheel }: IPodShellProps) {
  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <div className={styles.screenArea}>{screen}</div>
        <div className={styles.wheelArea}>{wheel}</div>
      </div>
    </div>
  );
}
