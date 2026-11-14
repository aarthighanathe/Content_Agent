import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

// WHY: one thin wrapper over btn-primary/secondary/ghost/danger — shared loading/disabled
// without re-styling every page. Landing <Link> CTAs, icon-only closes, and scoped page
// classes stay native — polymorphic `as` or forced migration wouldn't buy much.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant. Defaults to 'primary'. */
  variant?: ButtonVariant;
  /** Size preset. Defaults to 'md'. sm = fontSize 12/padding 8px 14px, md = CSS-class default. */
  size?: ButtonSize;
  /** When true: shows a Loader2 spinner prefix, sets disabled, and keeps the label readable. */
  loading?: boolean;
  /** Optional prefix icon (ReactNode — pass a Lucide icon element). */
  icon?: ReactNode;
}

// WHY: forwardRef: callers may need to attach a ref for focus management (e.g. modals
// returning focus to the trigger after close). Forwarding ref is a drop-in requirement
// for any button abstraction that replaces native <button> usage.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', loading = false, icon, children, disabled, className, style, ...rest },
    ref,
  ) {
    const cssClass = variantClass(variant);

    // WHY: inline style for size rather than a CSS class: the existing btn-primary /
    // btn-secondary CSS classes already define default sizing. Overriding only font-size
    // and padding for `sm` via inline style is the minimal delta — we don't want to add
    // a second CSS class (btn-primary-sm) just to override two properties.
    const sizeStyle = size === 'sm'
      ? { fontSize: '12px', padding: '8px 14px' }
      : undefined;

    return (
      <button
        ref={ref}
        className={[cssClass, className].filter(Boolean).join(' ')}
        disabled={disabled || loading}
        style={{ ...sizeStyle, ...style }}
        {...rest}
      >
        {loading
          ? <Loader2 size={size === 'sm' ? 12 : 14} className="btn-spinner" aria-hidden />
          : icon
            ? <span className="btn-icon" aria-hidden>{icon}</span>
            : null}
        {children}
      </button>
    );
  },
);

function variantClass(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':   return 'btn-primary';
    case 'secondary': return 'btn-secondary';
    case 'ghost':     return 'btn-ghost';
    case 'danger':    return 'btn-danger';
  }
}
