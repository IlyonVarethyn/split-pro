import { ChevronLeftIcon } from 'lucide-react';
import { type GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import ExpenseDetails, { ExpenseEditAction } from '~/components/Expense/ExpenseDetails';
import MainLayout from '~/components/Layout/MainLayout';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';

const ExpensesPage: NextPageWithUser = ({ user }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const expenseId = router.query.expenseId as string;
  const groupId = parseInt(router.query.groupId as string);

  const expenseQuery = api.expense.getExpenseDetails.useQuery({ expenseId });

  return (
    <>
      <Head>
        <title>{expenseQuery.data?.name ?? ''}</title>
      </Head>
      <MainLayout
        title={
          <div className="flex w-full items-center gap-2">
            <Link
              href={`/groups/${groupId}`}
              className="bg-foreground/6 flex size-9 shrink-0 items-center justify-center rounded-full active:scale-[.9]"
            >
              <ChevronLeftIcon className="text-foreground/70 size-5" />
            </Link>
            <p className="text-foreground/60 flex-1 text-center text-[15px] font-semibold">
              {t('ui.expense_details')}
            </p>
            {expenseQuery.data && !expenseQuery.data.deletedBy ? (
              <ExpenseEditAction expense={expenseQuery.data} />
            ) : (
              <div className="size-9 shrink-0" />
            )}
          </div>
        }
        loading={expenseQuery.isPending}
      >
        {expenseQuery.data ? <ExpenseDetails user={user} expense={expenseQuery.data} /> : null}
      </MainLayout>
    </>
  );
};

ExpensesPage.auth = true;

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    ...(await customServerSideTranslations(context.locale, ['common', 'categories'])),
  },
});

export default ExpensesPage;
