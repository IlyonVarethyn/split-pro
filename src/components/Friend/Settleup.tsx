import { SplitType, type User } from '@prisma/client';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DEFAULT_CATEGORY } from '~/lib/category';
import { cn } from '~/lib/utils';
import { api } from '~/utils/api';
import { BigMath } from '~/utils/numbers';

import { useSession } from 'next-auth/react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import type { MinimalBalance } from '~/types/balance.types';
import { EntityAvatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { CurrencyInput } from '../ui/currency-input';
import { AppDrawer } from '../ui/drawer';
import { SettleSuccessOverlay } from './SettleSuccessOverlay';

export const SettleUp: React.FC<
  React.PropsWithChildren<{
    balances?: MinimalBalance[];
    friend: User;
  }>
> = ({ children, balances, friend }) => {
  const { t, displayName, getCurrencyHelpersCached } = useTranslationWithUtils();
  const { data } = useSession();
  const currentUser = data?.user;

  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [balanceToSettle, setBalanceToSettle] = useState<MinimalBalance | undefined>(balances?.[0]);
  const [amount, setAmount] = useState<bigint>(BigMath.abs(balances?.[0]?.amount ?? 0n));
  const [amountStr, setAmountStr] = useState<string>(
    getCurrencyHelpersCached(balanceToSettle?.currency ?? '').toUIString(amount),
  );

  const isCurrentUserPaying = 0 > (balanceToSettle?.amount ?? 0);

  useEffect(() => {
    if (!showSuccess) {
      return;
    }
    const timer = setTimeout(() => setOpen(false), 1150);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  function onSelectBalance(balance: MinimalBalance) {
    setBalanceToSettle(balance);
    setAmount(BigMath.abs(balance.amount));
    setAmountStr(
      getCurrencyHelpersCached(balance.currency).toUIString(BigMath.abs(balance.amount)),
    );
  }

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const utils = api.useUtils();

  const saveExpense = React.useCallback(() => {
    if (!balanceToSettle || !amount || !currentUser) {
      return;
    }

    addExpenseMutation.mutate(
      {
        name: t('ui.settle_up_name'),
        currency: balanceToSettle.currency,
        amount,
        splitType: SplitType.SETTLEMENT,
        participants: [
          {
            userId: currentUser.id,
            amount: isCurrentUserPaying ? amount : -amount,
          },
          {
            userId: friend.id,
            amount: isCurrentUserPaying ? -amount : amount,
          },
        ],
        paidBy: isCurrentUserPaying ? currentUser.id : friend.id,
        category: DEFAULT_CATEGORY,
        groupId: balanceToSettle.groupId,
      },
      {
        onSuccess: () => {
          utils.user.invalidate().catch(console.error);
          utils.expense.invalidate().catch(console.error);
          setShowSuccess(true);
        },
        onError: (error) => {
          console.error('Error while saving expense:', error);
          toast.error(t('errors.saving_expense'));
        },
      },
    );
  }, [
    balanceToSettle,
    amount,
    currentUser,
    isCurrentUserPaying,
    friend,
    addExpenseMutation,
    utils,
    t,
  ]);

  const onCurrencyInputValueChange = React.useCallback(
    ({ strValue, bigIntValue }: { strValue?: string; bigIntValue?: bigint }) => {
      if (strValue !== undefined) {
        setAmountStr(strValue);
      }
      if (bigIntValue !== undefined) {
        setAmount(bigIntValue);
      }
    },
    [],
  );

  if (!currentUser) {
    return null;
  }

  if (!balances) {
    return (
      <Button size="sm" variant="outline" responsiveIcon disabled>
        <span className="xs:inline hidden">{t('actions.settle_up')}</span>
      </Button>
    );
  }

  return (
    <AppDrawer
      trigger={children}
      disableTrigger={!balances.length}
      open={open}
      onOpenChange={setOpen}
      leftAction={showSuccess ? undefined : t('actions.back')}
      title={showSuccess ? undefined : t('ui.settle_up_name')}
      className="h-[70vh]"
      actionTitle={showSuccess ? undefined : t('actions.save')}
      actionDisabled={!balanceToSettle || !amount}
      actionOnClick={saveExpense}
      shouldCloseOnAction={false}
    >
      {showSuccess ? (
        <SettleSuccessOverlay
          message={t('settle_up.settled_with', { name: displayName(friend) })}
        />
      ) : (
        <div className="flex flex-col items-center gap-6 pt-4">
          <div className="flex flex-col items-center gap-[9px] pb-1">
            <EntityAvatar entity={friend} size={56} />
            <p className="text-foreground/45 text-center text-[13px]">
              {isCurrentUserPaying
                ? `${t('actors.you')} ${t('ui.expense.you.pay')} ${displayName(friend)}`
                : `${displayName(friend)} ${t('ui.expense.user.pay')} ${t('actors.you')}`}
            </p>
            {balanceToSettle?.groupName ? (
              <p className="text-foreground/35 text-center text-[11.5px]">
                {balanceToSettle.groupName}
              </p>
            ) : null}
            <CurrencyInput
              currency={balanceToSettle?.currency ?? ''}
              strValue={amountStr}
              disabled={!balanceToSettle}
              className={cn(
                'h-auto w-auto border-0 bg-transparent p-0 text-center text-[40px] font-bold tracking-[-0.5px] tabular-nums shadow-none focus-visible:ring-0',
                isCurrentUserPaying ? 'text-negative' : 'text-positive',
              )}
              onValueChange={onCurrencyInputValueChange}
            />
          </div>
          {1 < balances.length ? (
            <div className="w-full">
              <div className="text-foreground/40 mb-2.5 text-[11.5px] tracking-[.06em] uppercase">
                {t('ui.select_currency')}
              </div>
              <div className="flex gap-[10px]">
                {balances.map((b) => {
                  const selected =
                    b.currency === balanceToSettle?.currency &&
                    b.groupId === balanceToSettle?.groupId;

                  return (
                    <button
                      key={`${b.friendId}-${b.currency}-${b.groupId ?? 'null'}`}
                      type="button"
                      onClick={() => onSelectBalance(b)}
                      className={cn(
                        'flex-1 rounded-[14px] border-[1.5px] p-3.5 text-center transition-all duration-[220ms] active:scale-[.97]',
                        selected
                          ? 'border-primary bg-primary/8'
                          : 'border-foreground/12 bg-foreground/4',
                      )}
                    >
                      <div
                        className={cn(
                          'text-[16px] font-bold tabular-nums',
                          0 < b.amount ? 'text-positive' : 'text-negative',
                        )}
                      >
                        {getCurrencyHelpersCached(b.currency).toUIString(BigMath.abs(b.amount))}
                      </div>
                      <div className="text-foreground/40 mt-0.5 text-[11px]">{b.currency}</div>
                      {b.groupName ? (
                        <div className="text-foreground/35 mt-0.5 truncate text-[10.5px]">
                          {b.groupName}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AppDrawer>
  );
};
