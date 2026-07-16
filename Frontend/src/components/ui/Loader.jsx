import { RiLoader4Line } from 'react-icons/ri';

export default function Loader({ fullScreen = false, text = 'Loading...', size = 'md' }) {
  const iconSize = size === 'sm' ? 28 : 48;
  const fontSize = size === 'sm' ? '0.9rem' : '1.1rem';
  const padding = size === 'sm' ? 16 : 40;

  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: size === 'sm' ? 8 : 16,
      color: 'var(--color-primary)',
      padding,
    }}>
      <RiLoader4Line size={iconSize} className="animate-spin" />
      {text && <div style={{ fontSize, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{text}</div>}
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'var(--color-bg-base)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {content}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      {content}
    </div>
  );
}
