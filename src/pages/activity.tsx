import { SplitType } from '@prisma/client';
import { RefreshCcwDot } from 'lucide-react';
import { type TFunction } from 'next-i18next';
import { type User } from 'next-auth';
import Head from 'next/head';
import Link from 'next/link';
import React from 'react';

import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';
import { getCurrencyHelpers } from '~/utils/numbers';

function getPaymentString(
  user: User,
  amount: bigint,
  paidBy: number,
  expenseUserAmt: bigint,
  isSettlement: boolean,
  t: TFunction,
  toUIString: (value: bigint) => string,
  isDeleted?: boolean,
) {
  if (isDeleted) {
    return null;
  } else if (0n === expenseUserAmt) {
    return (
      <div className="text-foreground/35 text-[13px] tabular-nums">{t('ui.not_involved')}</div>
    );
  } else if (isSettlement) {
    return (
      <div
        className={`text-[13px] tabular-nums ${user.id === paidBy ? 'text-positive' : 'text-negative'}`}
      >
        {t('actors.you')}{' '}
        {user.id === paidBy ? t('ui.expense.you.paid') : t('ui.expense.you.received')}{' '}
        {toUIString(amount)}
      </div>
    );
  } else {
    const isPositive = (user.id === paidBy) !== amount < 0n;

    return (
      <div className={`text-[13px] tabular-nums ${isPositive ? 'text-positive' : 'text-negative'}`}>
        {t('actors.you')} {t(`ui.expense.you.${isPositive ? 'lent' : 'owe'}`)}{' '}
        {toUIString(expenseUserAmt)}
      </div>
    );
  }
}

const ActivityPage: NextPageWithUser = ({ user }) => {
  const { displayName, t, toUIDate, i18n } = useTranslationWithUtils();
  const expensesQuery = api.expense.getAllExpenses.useQuery();

  const actions = React.useMemo(
    () => (
      <Link href="/recurring" aria-label={t('navigation.recurring')}>
        <Button
          variant="ghost"
          size="icon"
          className="bg-foreground/6 h-[38px] w-[38px] rounded-full p-0 active:scale-[.9]"
        >
          <RefreshCcwDot className="text-foreground/60 size-5" />
        </Button>
      </Link>
    ),
    [t],
  );

  return (
    <>
      <Head>
        <title>{t('navigation.activity')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={t('navigation.activity')}
        actions={actions}
        loading={expensesQuery.isPending}
      >
        <div className="flex flex-col">
          {!expensesQuery.data?.length ? (
            <div className="text-foreground/35 mt-[30vh] text-center">{t('ui.no_activity')}</div>
          ) : null}
          {expensesQuery.data?.map((e) => {
            const { toUIString } = getCurrencyHelpers({
              locale: i18n.language,
              currency: e.expense.currency,
            });
            const actor = e.expense.deletedByUser ?? e.expense.paidByUser;
            const isDeleted = Boolean(e.expense.deletedBy);

            return (
              <Link
                href={`/expenses/${e.expenseId}`}
                key={e.expenseId}
                className="border-foreground/8 flex gap-3.5 border-b py-4 active:opacity-55"
              >
                <div className="mt-0.5 flex-shrink-0">
                  <EntityAvatar entity={actor} size={34} />
                </div>
                <div className={isDeleted ? 'text-negative/60 min-w-0' : 'min-w-0'}>
                  {e.expense.deletedByUser ? (
                    <p className="text-[14px] leading-[1.45]">
                      <span className="font-semibold">
                        {displayName(e.expense.deletedByUser, user.id)}
                      </span>{' '}
                      {t(
                        `ui.expense.${e.expense.deletedByUser.id === user.id ? 'you' : 'user'}.deleted`,
                      )}{' '}
                      <span className="font-semibold">{e.expense.name}</span>
                    </p>
                  ) : (
                    <p className="text-foreground/85 text-[14px] leading-[1.45]">
                      <span className="text-foreground font-semibold">
                        {displayName(e.expense.paidByUser, user.id)}
                      </span>{' '}
                      {t(
                        `ui.expense.${e.expense.paidByUser.id === user.id ? 'you' : 'user'}.${e.expense.amount > 0n ? 'paid' : 'received'}`,
                      )}{' '}
                      {toUIString(e.expense.amount)} {t('ui.expense.for')}{' '}
                      <span className="text-foreground font-semibold">{e.expense.name}</span>
                    </p>
                  )}

                  {getPaymentString(
                    user,
                    e.expense.amount,
                    e.expense.paidBy,
                    e.amount,
                    e.expense.splitType === SplitType.SETTLEMENT,
                    t,
                    toUIString,
                    isDeleted,
                  )}
                  <p className="text-foreground/35 mt-1 text-[11.5px]">
                    {toUIDate(e.expense.expenseDate)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </MainLayout>
    </>
  );
};

ActivityPage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default ActivityPage;
