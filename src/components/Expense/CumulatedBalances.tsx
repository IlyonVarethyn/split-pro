import { useMemo } from 'react';
import { ConvertibleBalance } from '~/components/Expense/ConvertibleBalance';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { isCurrencyCode } from '~/lib/currency';
import { cn } from '~/lib/utils';
import { useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';

export const CumulatedBalances: React.FC<{
  entityId: number;
  entityType?: 'group';
  balances?: { currency: string; amount: bigint }[];
  /** Friend display name, used to interpolate the friend-detail panel's title. */
  name?: string;
}> = ({ entityId, entityType, balances, name }) => {
  const { t } = useTranslationWithUtils();

  const selectedCurrency = useCurrencyPreferenceStore((s) => s.getPreference(entityId, entityType));

  const allNonZeroCurrencies = useMemo(() => {
    const nonZeroBalances = balances?.filter((b) => b.amount !== 0n);
    return nonZeroBalances ? [...new Set(nonZeroBalances.map((b) => b.currency))] : [];
  }, [balances]);

  const youLent = useMemo(() => balances?.filter((b) => 0 < b.amount) ?? [], [balances]);
  const youOwe = useMemo(() => balances?.filter((b) => 0 > b.amount) ?? [], [balances]);

  if (!balances) {
    return null;
  }

  // Friend-detail panel: static per-currency rows, no interactive conversion popover.
  if (!entityType) {
    return <FriendBalancePanel name={name ?? ''} youOwe={youOwe} youLent={youLent} />;
  }

  return (
    <div className="flex flex-col gap-1">
      {isCurrencyCode(selectedCurrency) ? (
        <CumulatedBalanceDisplay
          prefix={`${t('ui.total_balance')}: `}
          entityId={entityId}
          entityType={entityType}
          cumulatedBalances={balances}
          currencies={allNonZeroCurrencies}
        />
      ) : (
        <>
          <CumulatedBalanceDisplay
            prefix={`${t('actors.you')} ${t('ui.expense.you.lent')}`}
            entityId={entityId}
            entityType={entityType}
            cumulatedBalances={youLent}
            className="text-positive"
            forceShowButton={allNonZeroCurrencies.length > 1}
            currencies={allNonZeroCurrencies}
          />
          <CumulatedBalanceDisplay
            prefix={`${t('actors.you')} ${t('ui.expense.you.owe')}`}
            entityId={entityId}
            entityType={entityType}
            className="text-negative"
            cumulatedBalances={youOwe}
            forceShowButton={allNonZeroCurrencies.length > 1}
            currencies={allNonZeroCurrencies}
          />
        </>
      )}
      {0 === balances.length ? <div className="text-gray-500">{t('ui.settled_up')}</div> : null}
    </div>
  );
};
const CumulatedBalanceDisplay: React.FC<{
  prefix?: string;
  entityId: number;
  entityType?: 'group';
  className?: string;
  cumulatedBalances?: { currency: string; amount: bigint }[];
  forceShowButton?: boolean;
  currencies: string[];
}> = ({
  prefix = '',
  entityId,
  entityType,
  className = '',
  cumulatedBalances,
  forceShowButton = false,
  currencies,
}) => {
  if (!cumulatedBalances || cumulatedBalances.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {prefix}
      <ConvertibleBalance
        balances={cumulatedBalances}
        entityId={entityId}
        entityType={entityType}
        forceShowButton={forceShowButton}
        showMultiOption
        overrideCurrencies={currencies}
      />
    </div>
  );
};

/**
 * Friend-detail balance panel: `rounded-[18px] bg-foreground/5` box with a muted
 * title line ("You owe Marco, in 2 currencies") followed by one static row per
 * non-zero currency (code left, colored amount right). Never sums currencies and
 * never renders the interactive conversion popover (project decision, fix wave
 * 2026-07-05). Both directions (you owe / you're owed) can render simultaneously
 * when balances with the friend are mixed-sign across currencies.
 */
const FriendBalancePanel: React.FC<{
  name: string;
  youOwe: { currency: string; amount: bigint }[];
  youLent: { currency: string; amount: bigint }[];
}> = ({ name, youOwe, youLent }) => {
  const { t } = useTranslationWithUtils();

  if (0 === youOwe.length && 0 === youLent.length) {
    return (
      <div className="bg-foreground/5 text-foreground/40 rounded-[18px] px-[18px] py-[15px] text-center text-[13px]">
        {t('ui.settled_up')}
      </div>
    );
  }

  return (
    <div className="bg-foreground/5 flex flex-col gap-3 rounded-[18px] px-[18px] py-[15px]">
      {0 < youOwe.length ? (
        <FriendBalanceDirectionGroup
          title={t('balances.owe_in_currencies', { name, count: youOwe.length })}
          balances={youOwe}
        />
      ) : null}
      {0 < youLent.length ? (
        <FriendBalanceDirectionGroup
          title={t('balances.owed_in_currencies', { name, count: youLent.length })}
          balances={youLent}
        />
      ) : null}
    </div>
  );
};

const FriendBalanceDirectionGroup: React.FC<{
  title: string;
  balances: { currency: string; amount: bigint }[];
}> = ({ title, balances }) => {
  const { getCurrencyHelpersCached } = useTranslationWithUtils();

  return (
    <div className="contents">
      <span className="text-foreground/55 text-[13px]">{title}</span>
      <div className="flex flex-col gap-[9px]">
        {balances.map((b) => (
          <div key={b.currency} className="flex items-baseline justify-between">
            <span className="text-foreground/40 text-[12px] tracking-[.04em] tabular-nums">
              {b.currency}
            </span>
            <span
              className={cn(
                'text-[19px] font-bold tabular-nums',
                0 < b.amount ? 'text-positive' : 'text-negative',
              )}
            >
              {getCurrencyHelpersCached(b.currency).toUIString(b.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
