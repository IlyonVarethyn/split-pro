import { type BalanceView } from '@prisma/client';
import React, { useMemo } from 'react';

import { ConvertibleBalance } from '~/components/Expense/ConvertibleBalance';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';

interface GroupMyBalanceProps {
  userId: number;
  groupBalances?: BalanceView[];
  groupId: number;
}

/**
 * Group detail "Saldo" panel: a single row with a muted label and the
 * current user's net balance across every member of the group, cumulated
 * per currency. Never sums different currencies — a single amount is shown
 * when there's one currency, otherwise a colored primary line plus a muted
 * secondary line per extra currency (via `ConvertibleBalance`'s `stacked`
 * mode, the same static-display convention used by the friend panel and
 * group list cards). Per-friend breakdown now lives in the Saldi tab.
 */
const GroupMyBalance: React.FC<GroupMyBalanceProps> = ({ userId, groupBalances = [], groupId }) => {
  const { t } = useTranslationWithUtils();

  const cumulatedBalances = useMemo(
    () =>
      Object.entries(
        groupBalances.reduce<Record<string, bigint>>((acc, balance) => {
          if (balance.userId === userId && 0n !== balance.amount) {
            acc[balance.currency] = (acc[balance.currency] ?? 0n) + balance.amount;
          }
          return acc;
        }, {}),
      )
        .filter(([, amount]) => 0n !== amount)
        .map(([currency, amount]) => ({ currency, amount })),
    [groupBalances, userId],
  );

  if (0 === cumulatedBalances.length) {
    return (
      <div className="bg-foreground/5 text-foreground/40 rounded-[18px] px-[18px] py-4 text-center text-[13px]">
        {t('ui.settled_up')}
      </div>
    );
  }

  return (
    <div className="bg-foreground/5 flex items-center justify-between rounded-[18px] px-[18px] py-4">
      <span className="text-foreground/55 text-[13px]">{t('group_details.your_balance')}</span>
      <ConvertibleBalance
        stacked
        balances={cumulatedBalances}
        entityId={groupId}
        entityType="group"
        className="text-[20px] font-bold tabular-nums"
      />
    </div>
  );
};

export default GroupMyBalance;
