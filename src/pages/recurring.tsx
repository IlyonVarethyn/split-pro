import { ChevronLeftIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { EditRecurrenceDialog } from '~/components/Expense/EditRecurrenceDialog';
import MainLayout from '~/components/Layout/MainLayout';
import { SimpleConfirmationDialog } from '~/components/SimpleConfirmationDialog';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { useIntlCronParser } from '~/hooks/useIntlCronParser';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cronFromBackend } from '~/lib/cron';
import { type NextPageWithUser } from '~/types';
import { type RouterOutputs, api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';

const iconButtonClassName = 'bg-foreground/6 h-[34px] w-[34px] rounded-full p-0';

type RecurringExpense = RouterOutputs['expense']['getRecurringExpenses'][number];

interface RecurringExpenseItemProps {
  item: RecurringExpense;
  onDelete: (recurrenceId: number) => Promise<void>;
  isDeleting: boolean;
  toUIDate: (date: Date) => string;
  cronParser: (cron: string) => string;
  i18nReady: boolean;
}

const RecurringExpenseItem: React.FC<RecurringExpenseItemProps> = ({
  item,
  onDelete,
  isDeleting,
  toUIDate,
  cronParser,
  i18nReady,
}) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const { toUIString } = getCurrencyHelpersCached(item.expense.currency);

  const schedule = useMemo(() => {
    try {
      return cronFromBackend(item.job.schedule);
    } catch {
      toast.error(t('errors.invalid_cron_expression'));
      console.error(`Failed to parse cron expression for expense: ${item.job.schedule}`);
      return null;
    }
  }, [t, item.job.schedule]);

  const handleDelete = useCallback(() => onDelete(item.id), [onDelete, item.id]);

  return (
    <div className="border-foreground/8 flex items-center justify-between gap-3 border-b py-4">
      <Link href={`/expenses/${item.expense.id}`} className="flex min-w-0 flex-1 gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <EntityAvatar entity={item.expense.addedByUser} size={38} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14.5px] leading-[1.4] font-medium">
            {t('recurrence.expense_for_the_amount_of', {
              name: item.expense.name,
              amount: toUIString(item.expense.amount),
              currency: item.expense.currency,
            })}
          </p>
          <p className="text-primary truncate text-[12px]">
            {t('recurrence.recurring')}
            {i18nReady && schedule ? `: ${cronParser(schedule)}` : ''}
          </p>
          <p className="text-foreground/35 mt-1 text-[11.5px]">
            {toUIDate(item.expense.expenseDate)}
          </p>
        </div>
      </Link>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        <EditRecurrenceDialog recurrenceId={item.id} currentSchedule={schedule}>
          <Button variant="ghost" size="icon" className={iconButtonClassName}>
            <PencilIcon className="h-4 w-4" />
          </Button>
        </EditRecurrenceDialog>

        <SimpleConfirmationDialog
          title={t('recurrence.delete_title')}
          description={t('recurrence.delete_description')}
          hasPermission
          loading={isDeleting}
          variant="destructive"
          onConfirm={handleDelete}
        >
          <Button variant="ghost" size="icon" className={iconButtonClassName}>
            <Trash2Icon className="text-negative h-4 w-4" />
          </Button>
        </SimpleConfirmationDialog>
      </div>
    </div>
  );
};

const RecurringPage: NextPageWithUser = () => {
  const { t, toUIDate } = useTranslationWithUtils();

  const recurringExpensesQuery = api.expense.getRecurringExpenses.useQuery();
  const deleteRecurrenceMutation = api.expense.deleteRecurrence.useMutation();
  const apiUtils = api.useUtils();

  const { cronParser, i18nReady } = useIntlCronParser();

  const handleDelete = useCallback(
    async (recurrenceId: number) => {
      try {
        await deleteRecurrenceMutation.mutateAsync({ recurrenceId });
        await apiUtils.expense.getRecurringExpenses.invalidate();
      } catch (error) {
        toast.error(t('errors.recurrence_delete_failed'));
        console.error('Error deleting recurrence:', error);
      }
    },
    [deleteRecurrenceMutation, apiUtils.expense.getRecurringExpenses, t],
  );

  return (
    <>
      <Head>
        <title>{t('navigation.recurring')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={
          <div className="flex items-center gap-2">
            <Link href="/activity" aria-label={t('navigation.activity')}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0">
                <ChevronLeftIcon className="h-5 w-5" />
              </Button>
            </Link>
            <p className="text-[16px] font-normal">{t('navigation.recurring')}</p>
          </div>
        }
        loading={recurringExpensesQuery.isPending}
      >
        <div className="flex flex-col">
          {!recurringExpensesQuery.data?.length ? (
            <div className="text-foreground/35 mt-[30vh] text-center">{t('recurrence.empty')}</div>
          ) : null}
          {recurringExpensesQuery.data?.map((e) => (
            <RecurringExpenseItem
              key={e.expense.id}
              item={e}
              onDelete={handleDelete}
              isDeleting={deleteRecurrenceMutation.isPending}
              toUIDate={toUIDate}
              cronParser={cronParser}
              i18nReady={i18nReady}
            />
          ))}
        </div>
      </MainLayout>
    </>
  );
};

RecurringPage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default RecurringPage;
