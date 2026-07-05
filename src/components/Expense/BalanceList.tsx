import type { BalanceView, User } from '@prisma/client';
import { clsx } from 'clsx';
import { Fragment, useMemo } from 'react';
import { toast } from 'sonner';
import { EntityAvatar } from '~/components/ui/avatar';
import { api } from '~/utils/api';
import { BigMath } from '~/utils/numbers';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { GroupSettleUp } from '../Friend/GroupSettleup';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Button } from '../ui/button';

interface UserWithBalance {
  user: User;
  total: Record<string, bigint>;
  balances: Record<number, Record<string, bigint>>;
}

export const BalanceList: React.FC<{
  groupBalances?: BalanceView[];
  users?: User[];
}> = ({ groupBalances = [], users = [] }) => {
  const { displayName, t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const userQuery = api.user.me.useQuery();

  const userMap = useMemo(() => {
    const res = users.reduce<Record<number, UserWithBalance>>((acc, user) => {
      acc[user.id] = { user, balances: {}, total: {} };
      return acc;
    }, {});
    groupBalances
      .filter(
        ({ amount, userId, friendId }) =>
          0 < BigMath.abs(amount) && userId !== friendId && res[userId] && res[friendId],
      )
      .forEach((balance) => {
        if (!res[balance.userId]) {
          res[balance.userId] = {
            user: users.find((u) => u.id === balance.userId) ?? ({} as User),
            balances: {},
            total: {},
          };
          console.error('BalanceList: userId not found in users list', balance.userId);
          toast.error(t('common:errors.group_balances_malformed'));
        }
        if (!res[balance.userId]!.balances[balance.friendId]) {
          res[balance.userId]!.balances[balance.friendId] = {};
        }
        const friendBalance = res[balance.userId]!.balances[balance.friendId]!;
        friendBalance[balance.currency] = (friendBalance[balance.currency] ?? 0n) + balance.amount;

        res[balance.userId]!.total[balance.currency] =
          (res[balance.userId]!.total[balance.currency] ?? 0n) + balance.amount;
      });

    return res;
  }, [groupBalances, users, t]);

  return (
    <Accordion type="multiple">
      {Object.values(userMap).map(({ user, total, balances }) => {
        let totalAmount: [string, bigint] = ['', 0n];
        const isCurrentUser = userQuery.data?.id === user.id;
        const isSettled = Object.values(total).every((amount) => 0n === amount);

        Object.entries(total).forEach(([currency, amount]) => {
          if (BigMath.abs(amount) > BigMath.abs(totalAmount[1])) {
            totalAmount = [currency, amount];
          }
        });

        return (
          <AccordionItem key={user.id} value={displayName(user)} className="border-foreground/8">
            <AccordionTrigger className="gap-3 overflow-hidden py-3.5 hover:no-underline active:opacity-60">
              <div className="flex min-w-0 flex-1 items-center gap-[13px]">
                <EntityAvatar entity={user} size={38} />
                <div className="min-w-0 flex-1 text-left text-[15px] break-words">
                  <span className="font-medium">{displayName(user, userQuery.data?.id)}</span>
                  {isSettled ? (
                    <span className="text-foreground/45">
                      {' '}
                      {isCurrentUser
                        ? t('expense_details.balance_list.are_settled_up')
                        : t('expense_details.balance_list.is_settled_up')}
                    </span>
                  ) : (
                    <>
                      <span className="text-foreground/45">
                        {' '}
                        {t(
                          `ui.expense.${isCurrentUser ? 'you' : 'user'}.${0 < totalAmount[1] ? 'lent' : 'owe'}`,
                        )}{' '}
                      </span>
                      <span
                        className={clsx(
                          'font-semibold tabular-nums',
                          0 < totalAmount[1] ? 'text-positive' : 'text-negative',
                        )}
                      >
                        {getCurrencyHelpersCached(totalAmount[0]).toUIString(
                          BigMath.abs(totalAmount[1]),
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {Object.entries(balances).map(([friendId, perFriendBalances]) => {
                const friend = userMap[Number(friendId)]!.user;

                return (
                  <Fragment key={friendId}>
                    {Object.entries(perFriendBalances).map(([currency, amount]) => {
                      if (0n === amount) {
                        return null;
                      }

                      return (
                        <div
                          key={friendId + currency}
                          className="flex items-center justify-between gap-[10px] py-2 pl-[51px]"
                        >
                          <div className="text-foreground/55 min-w-0 text-[13px]">
                            {displayName(friend, userQuery.data?.id)}{' '}
                            <span className="text-foreground/45">
                              {t(
                                `ui.expense.${friend.id === userQuery.data?.id ? 'you' : 'user'}.${0 > amount ? 'get' : 'pay'}`,
                              )}{' '}
                            </span>
                            <span
                              className={clsx(
                                'font-semibold tabular-nums',
                                0 < amount ? 'text-positive' : 'text-negative',
                              )}
                            >
                              {getCurrencyHelpersCached(currency).toUIString(BigMath.abs(amount))}
                            </span>{' '}
                            <span className="text-foreground/45">
                              {t(`ui.expense.${0 < amount ? 'to' : 'from'}`, { ns: 'common' })}{' '}
                            </span>
                            {displayName(user, userQuery.data?.id, 'accusativus')}
                          </div>
                          <GroupSettleUp
                            friend={friend}
                            user={user}
                            amount={amount}
                            currency={currency}
                            groupId={groupBalances[0]!.groupId!}
                          >
                            <Button
                              variant="ghost"
                              className="bg-primary/14 text-primary h-auto shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-bold active:scale-[.95]"
                            >
                              {t('actions.settle_up')}
                            </Button>
                          </GroupSettleUp>
                        </div>
                      );
                    })}
                  </Fragment>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
