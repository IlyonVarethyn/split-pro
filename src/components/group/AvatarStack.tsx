import React from 'react';
import { EntityAvatar } from '~/components/ui/avatar';

interface AvatarStackMember {
  id: number;
  name?: string | null;
  image?: string | null;
  email?: string | null;
}

export const AvatarStack: React.FC<{ members: AvatarStackMember[] }> = ({ members }) => (
  <div className="mt-3.5 flex">
    {members.map((member) => (
      <div key={member.id} className="border-background -ml-2 rounded-full border-2 first:ml-0">
        <EntityAvatar entity={member} size={32} />
      </div>
    ))}
  </div>
);
