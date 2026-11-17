import type { Member } from '@/lib/types';

/** Whose plan it is: a colored chip with an initial, so color is never the only signal. */
export function WhoChip({ member }: { member: Member | undefined }) {
  const name = member?.name ?? 'Everyone';
  return (
    <span className="who" style={{ '--c': member?.color ?? 'var(--everyone)' } as React.CSSProperties} title={name}>
      <span aria-hidden>{member ? initialOf(member.name) : 'All'}</span>
      <span className="sr">{name}</span>
    </span>
  );
}

export const initialOf = (name: string) => (name.trim()[0] || '?').toUpperCase();
