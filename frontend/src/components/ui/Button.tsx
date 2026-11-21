import type { ComponentPropsWithoutRef } from 'react';
import { Link } from 'react-router';
import type { LinkProps } from 'react-router';

import { buttonClasses } from './buttonStyles';
import type { ButtonVariant } from './buttonStyles';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
}

/** A router link that looks like a button, for navigation actions such as "Plan a hike". */
export function ButtonLink({ variant = 'primary', className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
