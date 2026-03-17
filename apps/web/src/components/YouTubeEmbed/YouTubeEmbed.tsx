import styles from './YouTubeEmbed.module.css';

export function YouTubeEmbed() {
  return (
    <div className={styles.container}>
      <iframe
        src="https://music.youtube.com"
        className={styles.iframe}
        allow="autoplay; encrypted-media"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        title="YouTube Music"
      />
    </div>
  );
}
