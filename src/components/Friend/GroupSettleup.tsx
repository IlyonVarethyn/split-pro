import { SplitType, type User } from '@prisma/client';
import React, { type ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { DEFAULT_CATEGORY } from '~/lib/category';
import { cn } from '~/lib/utils';
import { api } from '~/utils/api';
import { BigMath } from '~/utils/numbers';

import { EntityAvatar } from '../ui/avatar';
import { CurrencyInput } from '../ui/currency-input';
import { AppDrawer } from '../ui/drawer';
import { useSession } from 'next-auth/react';
import { SettleSuccessOverlay } from './SettleSuccessOverlay';

export const GroupSettleUp: React.FC<{
  amount: bigint;
  currency: string;
  friend: User;
  user: User;
  children: ReactNode;
  groupId: number;
}> = ({ amount: _amount, currency, friend, user, children, groupId }) => {
  const { data } = useSession();
  const { displayName, t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [amount, setAmount] = useState<bigint>(BigMath.abs(_amount));
  const [amountStr, setAmountStr] = useState(getCurrencyHelpersCached(currency).toUIString(amount));

  const sender = 0 > _amount ? user : friend;
  const receiver = 0 > _amount ? friend : user;
  const isCurrentUserPaying = sender.id === data?.user.id;

  useEffect(() => {
    if (!showSuccess) {
      return;
    }
    const timer = setTimeout(() => setOpen(false), 1150);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  const handleOpenChange = React.useCallback((o: boolean) => {
    setOpen(o);
    if (o) {
      setShowSuccess(false);
    }
  }, []);

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

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const utils = api.useUtils();

  const saveExpense = React.useCallback(() => {
    if (!amount) {
      return;
    }

    addExpenseMutation.mutate(
      {
        name: t('ui.settle_up_name'),
        currency: currency,
        amount,
        splitType: SplitType.SETTLEMENT,
        groupId,
        participants: [
          {
            userId: sender.id,
            amount,
          },
          {
            userId: receiver.id,
            amount: -amount,
          },
        ],
        paidBy: sender.id,
        category: DEFAULT_CATEGORY,
      },
      {
        onSuccess: () => {
          utils.group.invalidate().catch(console.error);
          setShowSuccess(true);
        },
        onError: (error) => {
          console.error('Error while saving expense:', error);
          toast.error(t('errors.saving_expense'));
        },
      },
    );
  }, [sender, receiver, amount, utils, addExpenseMutation, currency, groupId, t]);

  return (
    <AppDrawer
      trigger={children}
      open={open}
      onOpenChange={handleOpenChange}
      leftAction={showSuccess ? undefined : t('actions.back')}
      title={showSuccess ? undefined : t('ui.settlement')}
      actionTitle={showSuccess ? undefined : t('actions.save')}
      actionOnClick={saveExpense}
      actionDisabled={!amount}
      className="h-[70vh]"
      shouldCloseOnAction={false}
    >
      {showSuccess ? (
        <SettleSuccessOverlay
          message={t('settle_up.settled_with', { name: displayName(friend) })}
        />
      ) : (
        <div className="flex flex-col items-center gap-[9px] pt-4 pb-1">
          <EntityAvatar entity={friend} size={56} />
          <p className="text-foreground/45 text-center text-[13px]">
            {displayName(sender, data?.user.id)}{' '}
            {t(`ui.expense.${sender.id === data?.user.id ? 'you' : 'user'}.pay`)}{' '}
            {displayName(receiver, data?.user.id)}
          </p>
          <CurrencyInput
            currency={currency}
            strValue={amountStr}
            className={cn(
              'h-auto w-auto border-0 bg-transparent p-0 text-center text-[40px] font-bold tracking-[-0.5px] tabular-nums shadow-none focus-visible:ring-0',
              isCurrentUserPaying ? 'text-negative' : 'text-positive',
            )}
            onValueChange={onCurrencyInputValueChange}
          />
        </div>
      )}
    </AppDrawer>
  );
};
