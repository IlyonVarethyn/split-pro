import { ChevronRight } from 'lucide-react';
import { useCallback } from 'react';
import Router from 'next/router';
import { z } from 'zod';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cn } from '~/lib/utils';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';

import { EntityAvatar } from '../ui/avatar';

export const UserInput: React.FC<{
  isEditing?: boolean;
}> = ({ isEditing }) => {
  const { t, displayName } = useTranslationWithUtils();
  const {
    setNameOrEmail,
    removeLastParticipant,
    removeParticipant,
    addOrUpdateParticipant,
    setParticipants,
    setGroup,
  } = useAddExpenseStore((s) => s.actions);
  const nameOrEmail = useAddExpenseStore((s) => s.nameOrEmail);
  const participants = useAddExpenseStore((s) => s.participants);
  const currentUser = useAddExpenseStore((s) => s.currentUser);
  const group = useAddExpenseStore((s) => s.group);
  const showFriends = useAddExpenseStore((s) => s.showFriends);

  const addFriendMutation = api.user.inviteFriend.useMutation();

  const isEmail = z.string().email().safeParse(nameOrEmail);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ('Backspace' === e.key && '' === nameOrEmail) {
      if (group) {
        const currentPath = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.delete('groupId');
        Router.push(`${currentPath}?${searchParams.toString()}`).catch(console.error);

        setGroup(undefined);

        if (currentUser) {
          setParticipants([currentUser]);
        }
      } else {
        removeLastParticipant(); // Assuming deleteUser is the function you want to call
      }
    } else if ('Enter' === e.key && isEmail.success) {
      addFriendMutation.mutate(
        { email: nameOrEmail.toLowerCase() },
        {
          onSuccess: (user) => {
            removeParticipant(-1);
            addOrUpdateParticipant(user);
            setNameOrEmail('');
          },
        },
      );
      addOrUpdateParticipant({
        id: -1,
        name: nameOrEmail,
        email: nameOrEmail,
        emailVerified: new Date(),
        image: null,
        currency: 'USD',
        defaultCurrency: null,
        obapiProviderId: null,
        bankingId: null,
        preferredLanguage: '',
        hiddenFriendIds: [],
      });
    }
  };

  const isPicking = showFriends || (1 === participants.length && !group);
  const canOpenSelector = !(isEditing && Boolean(group));

  const openSelector = useCallback(() => {
    if (!canOpenSelector) {
      return;
    }
    useAddExpenseStore.setState({ showFriends: true });
  }, [canOpenSelector]);

  if (!isPicking) {
    const others = participants.filter((p) => p.id !== currentUser?.id);
    const name = group ? group.name : others.map((p) => displayName(p, currentUser?.id)).join(', ');
    const initialSource = group ? group.name : (others[0]?.name ?? others[0]?.email ?? '');
    const initial = initialSource.trim().charAt(0).toUpperCase() || '?';
    const meta =
      group || 1 < others.length
        ? t('group_details.member_count', { count: participants.length })
        : '';

    return (
      <div
        onClick={openSelector}
        className={cn(
          'bg-foreground/5 mt-2 flex items-center gap-2.5 rounded-[14px] px-3.5 py-[11px]',
          canOpenSelector ? 'cursor-pointer active:opacity-60' : 'cursor-default',
        )}
      >
        <span className="text-foreground/40 text-xs">
          {t('expense_details.add_expense_details.user_input.with_label')}
        </span>
        <div className="bg-primary/16 text-primary flex size-[26px] shrink-0 items-center justify-center rounded-[8px] text-[11px] font-bold">
          {initial}
        </div>
        <span className="min-w-0 truncate text-[14.5px] font-medium">{name}</span>
        {canOpenSelector ? (
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            {meta ? <span className="text-foreground/35 text-xs">{meta}</span> : null}
            <ChevronRight className="text-foreground/30 size-3" />
          </span>
        ) : (
          meta && <span className="text-foreground/35 ml-auto shrink-0 text-xs">{meta}</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-foreground/5 mt-2 flex gap-2 overflow-x-auto rounded-[14px] px-3.5 py-[11px] sm:flex-wrap">
      {group ? (
        <div className="bg-primary/14 text-primary flex items-center gap-2 rounded-full p-0.5 pr-4">
          <EntityAvatar entity={group} size={30} />
          <p className="text-xs">{group.name}</p>
        </div>
      ) : (
        participants.map((p) =>
          p.id !== currentUser?.id ? (
            <div
              key={p.id}
              className="bg-foreground/7 text-foreground/70 flex max-w-40 items-center gap-2 rounded-full p-0.5 pr-4"
            >
              <EntityAvatar entity={p} size={30} />
              <p className="truncate text-xs">{p.name ?? p.email}</p>
            </div>
          ) : null,
        )
      )}

      <input
        type="email"
        placeholder={
          isEditing && Boolean(group)
            ? t('expense_details.add_expense_details.user_input.cannot_change_group')
            : group
              ? t('expense_details.add_expense_details.user_input.remove_group')
              : 1 < participants.length
                ? t('expense_details.add_expense_details.user_input.add_more_friends')
                : t('expense_details.add_expense_details.user_input.search_friends')
        }
        value={nameOrEmail}
        onChange={(e) => setNameOrEmail(e.target.value)}
        onKeyDown={handleKeyDown}
        className="placeholder:text-foreground/35 min-w-[100px] grow bg-transparent text-[14.5px] outline-hidden focus:ring-0"
        autoFocus
        disabled={isEditing && Boolean(group)}
      />
    </div>
  );
};
