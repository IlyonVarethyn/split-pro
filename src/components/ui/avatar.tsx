import { Avatar as AvatarPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '~/lib/utils';
import { toImageSrc } from '~/utils/imageUpload';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'bg-muted flex h-full w-full items-center justify-center rounded-full',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export const FLAT_AVATAR_COLORS = ['#f2b28c', '#8ec5d6', '#c9a8e0', '#e0c88e', '#a8d6b8'];

export const flatAvatarColor = (name: string): string => {
  let hash = 0;
  for (const ch of name) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return FLAT_AVATAR_COLORS[hash % FLAT_AVATAR_COLORS.length]!;
};

const EntityAvatar: React.FC<{
  entity?: { name?: string | null; image?: string | null; email?: string | null } | null;
  size?: number;
}> = ({ entity, size }) => {
  const avatarSize = React.useMemo(
    () => ({
      width: size ?? 40,
      height: size ?? 40,
    }),
    [size],
  );

  const name = entity?.name ?? entity?.email ?? '';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Avatar style={avatarSize}>
      <AvatarImage
        src={entity?.image ? toImageSrc(entity.image) : undefined}
        alt={entity?.name ?? entity?.email ?? ''}
      />
      <AvatarFallback style={{ backgroundColor: flatAvatarColor(name) }}>
        <span
          className="font-semibold"
          style={{ color: '#0a0c0d', fontSize: Math.round((size ?? 40) * 0.4) }}
        >
          {initial}
        </span>
      </AvatarFallback>
    </Avatar>
  );
};

export { Avatar, AvatarImage, AvatarFallback, EntityAvatar };
