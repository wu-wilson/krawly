import React from 'react';

import { Icon } from './Icon';
import { FOCUS_RING, HOVER_TRANSITION } from './styles';

import type { IconName } from './Icon';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'touch';

interface ButtonLook {
  /** Visual weight: dark primary, outlined secondary, or quiet ghost */
  variant?: ButtonVariant;
  /** Height: `sm` 26px, `md` 28px (32px on touch screens), `lg` 32px, `xl` 38px, `touch` 44px for phones and touch screens */
  size?: ButtonSize;
  /** Icon drawn before the label */
  icon?: IconName;
  /** Icon drawn after the label */
  trailingIcon?: IconName;
  /** Icon size override; otherwise it follows the button size */
  iconSize?: number;
}

interface ButtonProps extends ButtonLook, React.ButtonHTMLAttributes<HTMLButtonElement> {}

interface ButtonLinkProps extends ButtonLook, React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Where the link goes */
  href: string;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-surface hover:bg-ink-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-ink-3',
  ghost: 'bg-transparent text-ink-2 hover:bg-wash-hover hover:text-ink',
};

const SIZES: Record<ButtonSize, { box: string; square: string; icon: number }> = {
  sm: { box: 'h-[26px] gap-1.5 rounded-md text-xs', square: 'w-[26px]', icon: 12 },
  md: { box: 'h-7 gap-1.5 rounded-md text-[13px] coarse:h-8', square: 'w-7 coarse:w-8', icon: 13 },
  lg: { box: 'h-8 gap-1.5 rounded-md text-[13px]', square: 'w-8', icon: 13 },
  xl: { box: 'h-[38px] gap-2 rounded-[5px] text-sm', square: 'w-[38px]', icon: 16 },
  touch: { box: 'h-11 gap-2 rounded-lg text-sm', square: 'w-11', icon: 18 },
};

// Ghosts sit a little tighter than filled buttons so their labels line up with nearby text.
const PADDING: Record<ButtonSize, Record<ButtonVariant, string>> = {
  sm: { primary: 'px-2.5', secondary: 'px-2.5', ghost: 'px-2' },
  md: { primary: 'px-[11px]', secondary: 'px-3', ghost: 'px-2' },
  lg: { primary: 'px-3', secondary: 'px-3', ghost: 'px-2.5' },
  xl: { primary: 'px-3.5', secondary: 'px-3.5', ghost: 'px-3' },
  touch: { primary: 'px-3', secondary: 'px-3', ghost: 'px-3' },
};

/**
 * A button in the light system, with optional leading and trailing icons. With no label it becomes a square icon
 * button, which then needs an `aria-label`.
 * @param props - Variant, size, icons, and native button attributes
 * @returns Styled button
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, icon, trailingIcon, iconSize, className = '', type = 'button', children, ...rest }, ref) => (
    <button ref={ref} type={type} className={lookClasses({ variant, size }, children, className)} {...rest}>
      <LookContent look={{ size, icon, trailingIcon, iconSize }}>{children}</LookContent>
    </button>
  ),
);

Button.displayName = 'Button';

/**
 * A link styled as a button, for actions that navigate, so it keeps link behaviour such as opening in a new tab.
 * @param props - Variant, size, icons, and native link attributes
 * @returns Styled link
 */
export const ButtonLink: React.FC<ButtonLinkProps> = ({ variant, size, icon, trailingIcon, iconSize, className = '', children, ...rest }) => (
  <a className={lookClasses({ variant, size }, children, className)} {...rest}>
    <LookContent look={{ size, icon, trailingIcon, iconSize }}>{children}</LookContent>
  </a>
);

/**
 * Build the classes shared by buttons and button links.
 * @param look - Variant and size
 * @param children - The label, whose absence makes a square icon button
 * @param className - Additional classes
 * @returns Class string
 */
const lookClasses = ({ variant = 'primary', size = 'md' }: ButtonLook, children: React.ReactNode, className: string): string => {
  const spec = SIZES[size];
  const iconOnly = children === undefined || children === null || children === false;
  return `inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap font-medium ${VARIANTS[variant]} ${spec.box}
    ${iconOnly ? spec.square : PADDING[size][variant]} ${HOVER_TRANSITION} ${FOCUS_RING} ${className}`;
};

interface LookContentProps {
  /** Size and icons */
  look: ButtonLook;
  /** The label */
  children: React.ReactNode;
}

/**
 * The icons and label inside a button or button link.
 * @param props - Size, icons, and label
 * @returns Button content
 */
const LookContent: React.FC<LookContentProps> = ({ look: { size = 'md', icon, trailingIcon, iconSize }, children }) => {
  const glyph = iconSize ?? SIZES[size].icon;
  return (
    <>
      {icon && <Icon name={icon} size={glyph} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={glyph} />}
    </>
  );
};
