import { SplitType } from '@prisma/client';
import { type User } from 'next-auth';
import Head from 'next/head';
import Link from 'next/link';
import MainLayout from '~/components/Layout/MainLayout';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { getCurrencyHelpers } from '~/utils/numbers';
import { type TFunction } from 'next-i18next';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { withI18nStaticProps } from '~/utils/i18n/server';
import { RefreshCcwDot } from 'lucide-react';
import { Button } from '~/components/ui/button';
import React from 'react';

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
    return <div className="text-sm text-gray-400">{t('ui.not_involved')}</div>;
  } else if (isSettlement) {
    return (
      <div className={`${user.id === paidBy ? 'text-emerald-500' : 'text-orange-500'} text-sm`}>
        {t('actors.you')}{' '}
        {user.id === paidBy ? t('ui.expense.you.paid') : t('ui.expense.you.received')}{' '}
        {toUIString(amount)}
      </div>
    );
  } else {
    return (
      <div
        className={`${(user.id === paidBy) !== amount < 0n ? 'text-emerald-500' : 'text-orange-500'} text-sm`}
      >
        {t(`actors.you`)}{' '}
        {t(`ui.expense.you.${(user.id === paidBy) !== amount < 0n ? 'lent' : 'owe'}`)}{' '}
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
      <Link href="/recurring">
        <Button variant="ghost" size="sm">
          <RefreshCcwDot className="size-6" />
        </Button>
      </Link>
    ),
    [],
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
        <div className="divide-foreground/8 flex flex-col divide-y">
          {!expensesQuery.data?.length ? (
            <div className="mt-[30vh] text-center text-gray-400">{t('ui.no_activity')}</div>
          ) : null}
          {expensesQuery.data?.map((e) => {
            const { toUIString } = getCurrencyHelpers({
              locale: i18n.language,
              currency: e.expense.currency,
            });

            return (
              <Link
                href={`/expenses/${e.expenseId}`}
                key={e.expenseId}
                className="flex gap-3.5 py-4"
              >
                <div className="bg-primary mt-2 size-2 flex-shrink-0 rounded-full" />
                <div>
                  {e.expense.deletedByUser ? (
                    <p className="text-red-500 opacity-70">
                      <span className="font-semibold">
                        {displayName(e.expense.deletedByUser, user.id)}
                      </span>{' '}
                      {t(
                        `ui.expense.${e.expense.deletedByUser.id === user.id ? 'you' : 'user'}.deleted`,
                      )}{' '}
                      <span className="font-semibold">{e.expense.name}</span>
                    </p>
                  ) : (
                    <p className="text-gray-300">
                      <span className="font-semibold text-gray-300">
                        {displayName(e.expense.paidByUser, user.id)}
                      </span>{' '}
                      {t(
                        `ui.expense.${e.expense.paidByUser.id === user.id ? 'you' : 'user'}.${e.expense.amount > 0n ? 'paid' : 'received'}`,
                      )}{' '}
                      {toUIString(e.expense.amount)} {t('ui.expense.for')}{' '}
                      <span className="font-semibold text-gray-300">{e.expense.name}</span>
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
                    !!e.expense.deletedBy,
                  )}
                  <p className="text-xs text-gray-500">{toUIDate(e.expense.expenseDate)}</p>
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
