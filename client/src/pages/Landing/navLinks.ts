// WHY: shared between the desktop Nav and the MobileMenu overlay so the two link lists can't drift apart
export interface NavLink {
  href: string;
  label: string;
}

export const navLinks: NavLink[] = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#quality', label: 'Quality' },
  { href: '#demo', label: 'Live demo' },
];
