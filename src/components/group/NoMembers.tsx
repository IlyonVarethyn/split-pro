import { type Group, type GroupUser } from '@prisma/client';
import { Users } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';

import AddMembers from './AddMembers';

interface NoMembersProps {
  group: Group & { groupUsers: GroupUser[] };
  enableSendingInvites: boolean;
}

const NoMembers: React.FC<NoMembersProps> = ({ group, enableSendingInvites }) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const isArchived = !!group.archivedAt;

  async function copyToClipboard() {
    const inviteLink = `${window.location.origin}/join-group?groupId=${group.publicId}`;
    await navigator.clipboard.writeText(inviteLink);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="bg-foreground/5 flex size-16 shrink-0 items-center justify-center rounded-full">
        <Users className="text-foreground/45 h-6.5 w-6.5" strokeWidth={1.8} />
      </div>
      <p className="text-[16.5px] font-semibold">{t('group_details.no_members.no_members')}</p>
      <p className="text-foreground/45 max-w-[240px] text-[13.5px] leading-snug">
        {t('group_details.no_members.description')}
      </p>
      <div className="mt-2.5 flex gap-2.5">
        <AddMembers group={group} enableSendingInvites={enableSendingInvites}>
          <button
            disabled={isArchived}
            className="bg-primary text-primary-foreground rounded-full px-[18px] py-[11px] text-[13.5px] font-bold active:scale-[.96] disabled:opacity-40"
          >
            {t('group_details.add_members')}
          </button>
        </AddMembers>
        <button
          onClick={copyToClipboard}
          disabled={isArchived}
          className="bg-foreground/8 rounded-full px-[18px] py-[11px] text-[13.5px] font-semibold active:scale-[.96] disabled:opacity-40"
        >
          {isCopied ? t('group_details.copied') : t('group_details.no_members.invite_link')}
        </button>
      </div>
    </div>
  );
};

export default NoMembers;
