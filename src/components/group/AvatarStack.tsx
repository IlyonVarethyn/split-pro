import React from 'react';
import { EntityAvatar } from '~/components/ui/avatar';

interface AvatarStackMember {
  id: number;
  name?: string | null;
  image?: string | null;
  email?: string | null;
}

const MAX_VISIBLE = 5;

export const AvatarStack: React.FC<{ members: AvatarStackMember[] }> = ({ members }) => {
  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = members.length - visible.length;

  return (
    <div className="mt-3.5 flex">
      {visible.map((member) => (
        <div key={member.id} className="border-background -ml-2 rounded-full border-2 first:ml-0">
          <EntityAvatar entity={member} size={32} />
        </div>
      ))}
      {overflow > 0 && (
        <div className="border-background bg-foreground/8 text-foreground/50 -ml-2 flex size-8 items-center justify-center rounded-full border-2 text-xs font-medium">
          +{overflow}
        </div>
      )}
    </div>
  );
};
