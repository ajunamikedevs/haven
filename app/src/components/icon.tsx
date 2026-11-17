export type IconName =
  | 'home' | 'cal' | 'list' | 'people' | 'pot' | 'bag' | 'share' | 'plus' | 'x' | 'check' | 'clock' | 'shuffle'
  | 'trash' | 'arrow' | 'chev' | 'down' | 'pencil' | 'lock' | 'phone' | 'bell' | 'repeat' | 'link';

/** Decorative icon from the sprite in the root layout. Always paired with visible or aria-label text. */
export function Icon({ name, size }: { name: IconName; size?: 'sm' | 'lg' }) {
  return (
    <svg className={size ? 'i ' + size : 'i'} aria-hidden>
      <use href={'#i-' + name} />
    </svg>
  );
}
