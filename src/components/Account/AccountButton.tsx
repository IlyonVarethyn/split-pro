import Link from 'next/link';
import React from 'react';

import { cn } from '~/lib/utils';

import { Button, type ButtonProps } from '../ui/button';
import { ChevronRight } from 'lucide-react';

export interface AccountButtonProps extends Omit<ButtonProps, 'children' | 'value'> {
  href?: string;
  label?: React.ReactNode;
  value?: React.ReactNode;
  children?: React.ReactNode;
}

export const AccountButton: React.FC<AccountButtonProps> = ({
  href,
  label,
  value,
  children,
  className,
  ...buttonProps
}) => {
  const rowClassName = cn(
    'flex w-full items-center justify-between rounded-none border-b border-foreground/8 px-0 py-[15px] text-left active:opacity-60',
    className,
  );

  const leftSide = label ? (
    <span className="min-w-0 truncate text-[15px] font-medium">{label}</span>
  ) : (
    <span className="flex min-w-0 items-center gap-4">{children}</span>
  );

  const rightSide = (
    <span className="flex min-w-0 items-center gap-2">
      {value ? <span className="text-foreground/40 truncate text-[14px]">{value}</span> : null}
      <ChevronRight className="text-foreground/25 h-4 w-4 shrink-0" />
    </span>
  );

  const row = (
    <span className="flex w-full items-center justify-between gap-4">
      {leftSide}
      {rightSide}
    </span>
  );

  if (href) {
    const isExternal = href.startsWith('http');
    return (
      <Button asChild variant="ghost" className={rowClassName} {...buttonProps}>
        <Link
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer' : undefined}
        >
          {row}
        </Link>
      </Button>
    );
  }

  return (
    <Button variant="ghost" type="button" className={rowClassName} {...buttonProps}>
      {row}
    </Button>
  );
};
