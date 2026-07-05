import { SplitType } from '@prisma/client';
import { clsx } from 'clsx';
import { type User as NextUser } from 'next-auth';
import { type TFunction } from 'next-i18next';

import type { inferRouterOutputs } from '@trpc/server';
import { ArrowRightIcon, Landmark, PencilIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { type ComponentProps, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useIntlCronParser } from '~/hooks/useIntlCronParser';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cronFromBackend, extractTemplateExpenseId } from '~/lib/cron';
import { CATEGORIES, DEFAULT_CATEGORY } from '~/lib/category';
import { isCurrencyCode } from '~/lib/currency';
import type { ExpenseRouter } from '~/server/api/routers/expense';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { BigMath } from '~/utils/numbers';

import { CurrencyConversion } from '../Friend/CurrencyConversion';
import { SimpleConfirmationDialog } from '../SimpleConfirmationDialog';
import { EntityAvatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { CurrencyInput } from '../ui/currency-input';
import { AppDrawer } from '../ui/drawer';
import { DeleteExpense } from './DeleteExpense';
import { Receipt } from './Receipt';
import { DateSelector } from '../AddExpense/DateSelector';

type ExpenseDetailsOutput = NonNullable<inferRouterOutputs<ExpenseRouter>['getExpenseDetails']>;

const EDIT_CIRCLE_CLASS = 'bg-foreground/6 size-9 shrink-0 rounded-full p-0 active:scale-[.9]';
const EDIT_BLOCK_CLASS =
  'bg-foreground/8 flex-1 rounded-[14px] py-[13px] text-[14.5px] font-semibold active:scale-[.97]';

const SPLIT_TYPE_TITLE_KEYS: Partial<Record<SplitType, string>> = {
  [SplitType.EQUAL]: 'expense_details.add_expense_details.split_type_section.types.equal.title',
  [SplitType.EXACT]: 'expense_details.add_expense_details.split_type_section.types.exact.title',
  [SplitType.PERCENTAGE]:
    'expense_details.add_expense_details.split_type_section.types.percentage.title',
  [SplitType.SHARE]: 'expense_details.add_expense_details.split_type_section.types.share.title',
  [SplitType.ADJUSTMENT]:
    'expense_details.add_expense_details.split_type_section.types.adjustment.title',
};

const getSplitTypeLabel = (t: TFunction, splitType: SplitType): string => {
  if (SplitType.SETTLEMENT === splitType) {
    return t('ui.settlement');
  }
  if (SplitType.CURRENCY_CONVERSION === splitType) {
    return t('currency_conversion.title');
  }
  const key = SPLIT_TYPE_TITLE_KEYS[splitType];
  return t(key ?? SPLIT_TYPE_TITLE_KEYS[SplitType.EQUAL]!);
};

const getCategoryLabel = (t: TFunction, category: string): string => {
  if ('other' === category) {
    return t(`categories_list.${DEFAULT_CATEGORY}.items.other`, { ns: 'categories' });
  }
  for (const [section, items] of Object.entries(CATEGORIES)) {
    if (section === category) {
      return t(`categories_list.${section}.items.other`, { ns: 'categories' });
    }
    if ((items as readonly string[]).includes(category)) {
      return t(`categories_list.${section}.items.${category}`, { ns: 'categories' });
    }
  }
  return t(`categories_list.${DEFAULT_CATEGORY}.items.other`, { ns: 'categories' });
};

interface ExpenseDetailsProps {
  user: NextUser;
  expense: ExpenseDetailsOutput;
}

const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({ user, expense }) => {
  const { displayName, toUIDate, t, i18n, getCurrencyHelpersCached } = useTranslationWithUtils([
    'common',
    'categories',
  ]);

  const { cronParser, i18nReady } = useIntlCronParser();

  const cronString = useMemo(() => {
    if (!expense.recurrence) {
      return null;
    }
    try {
      return cronParser(cronFromBackend(expense.recurrence.job.schedule));
    } catch {
      toast.error(t('errors.invalid_cron_expression'));
      console.error(
        `Failed to parse cron expression for expense: ${expense.recurrence.job.schedule}`,
      );
      return null;
    }
  }, [t, expense.recurrence, cronParser]);

  const { toUIString } = getCurrencyHelpersCached(expense.currency);

  const otherParticipant = useMemo(
    () => expense.expenseParticipants.find((p) => p.userId !== user.id)?.user,
    [expense.expenseParticipants, user.id],
  );

  const context =
    expense.group?.name ?? (otherParticipant ? displayName(otherParticipant, user.id) : null);
  const overline = useMemo(() => {
    const categoryLabel = getCategoryLabel(t, expense.category);
    return context ? `${categoryLabel} · ${context}` : categoryLabel;
  }, [t, expense.category, context]);

  const participantCount = expense.expenseParticipants.filter((p) => 0n !== p.amount).length;
  const splitOverline = `${getSplitTypeLabel(t, expense.splitType)} · ${t('group_details.member_count', { count: participantCount })}`;

  const isReceived = expense.amount < 0n;

  const dateTimeAdded = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long', timeStyle: 'short' }).format(
        expense.createdAt,
      ),
    [i18n.language, expense.createdAt],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-foreground/40 text-[11.5px] font-medium tracking-[.06em] uppercase">
          {overline}
        </p>
        <div className="mt-[7px] flex items-center gap-2">
          <p className="text-[27px] leading-tight font-bold tracking-[-0.4px]">{expense.name}</p>
          {expense.transactionId && <Landmark className="text-foreground/40 size-4 shrink-0" />}
        </div>
        <p className="mt-[9px] text-[37px] leading-tight font-bold tracking-[-0.5px] tabular-nums">
          {toUIString(expense.amount)}
        </p>
        <p className="text-foreground/45 mt-1.5 text-[13px]">
          {t(isReceived ? 'ui.expense.received_by' : 'ui.expense.paid_by')}{' '}
          {displayName(expense.paidByUser, user.id, 'dativus')} ·{' '}
          {toUIDate(expense.expenseDate, { year: true })}
        </p>
        {expense.updatedByUser ? (
          <p className="text-foreground/45 mt-1 text-[13px]">
            {t('ui.edited_by')} {displayName(expense.updatedByUser, user.id, 'dativus')}{' '}
            {t('ui.on')} {toUIDate(expense.updatedAt, { year: true })}
          </p>
        ) : null}
        {expense.deletedByUser ? (
          <p className="text-negative mt-1 text-[13px]">
            {t('ui.deleted_by')} {displayName(expense.deletedByUser, user.id, 'dativus')}{' '}
            {t('ui.on')} {toUIDate(expense.deletedAt ?? expense.createdAt, { year: true })}
          </p>
        ) : null}
        {expense.recurrence ? (
          <Link
            href="/recurring"
            className="text-primary mt-1.5 inline-block text-[13px] active:opacity-55"
          >
            {t('recurrence.recurring')}
            {i18nReady ? `: ${cronString}` : ''}
          </Link>
        ) : null}
      </div>

      <div>
        <p className="text-foreground/40 mb-1.5 text-[11.5px] font-medium tracking-[.06em] uppercase">
          {splitOverline}
        </p>
        <div className="divide-foreground/8 flex flex-col divide-y">
          {expense.expenseParticipants
            .filter((participant) => 0n !== participant.amount)
            .map((participant) => (
              <ExpenseParticipantEntry
                key={participant.userId}
                participant={participant}
                userId={user.id}
                currency={expense.currency}
              />
            ))}
          {expense.conversionTo && (
            <>
              {expense.conversionTo.expenseParticipants
                .filter((participant) => 0n !== participant.amount)
                .map((participant) => (
                  <ExpenseParticipantEntry
                    key={participant.userId}
                    participant={participant}
                    userId={user.id}
                    currency={expense.conversionTo!.currency}
                  />
                ))}
            </>
          )}
        </div>
      </div>

      {expense.fileKey ? <Receipt fileKey={expense.fileKey} /> : null}

      <p className="text-foreground/35 text-[12px]">
        {t('ui.added_by')} {displayName(expense.addedByUser, user.id, 'dativus')} · {dateTimeAdded}
      </p>

      {!expense.deletedBy ? (
        <div className="mt-2 flex gap-[10px]">
          <ExpenseEditAction expense={expense} variant="block" />
          <DeleteExpense expenseId={expense.id} recurrence={expense.recurrence} />
        </div>
      ) : null}
    </div>
  );
};

const ExpenseParticipantEntry: React.FC<{
  participant: ExpenseDetailsOutput['expenseParticipants'][number];
  userId: number;
  currency: string;
}> = ({ participant, userId, currency }) => {
  const { displayName, getCurrencyHelpersCached } = useTranslationWithUtils();
  const { toUIString } = getCurrencyHelpersCached(currency);

  const isCurrentUser = userId === participant.userId;
  const isPositive = participant.amount > 0n;

  return (
    <Link
      href={isCurrentUser ? '/balances' : `/balances/${participant.userId}`}
      className="flex items-center gap-[13px] py-3 active:opacity-55"
    >
      <EntityAvatar entity={participant.user} size={36} />
      <p className="min-w-0 flex-1 truncate text-[15px] font-medium">
        {displayName(participant.user, userId)}
      </p>
      <p
        className={clsx(
          'min-w-[66px] shrink-0 text-right text-[15px] font-semibold tabular-nums',
          isPositive ? 'text-positive' : 'text-negative',
        )}
      >
        {toUIString(participant.amount)}
      </p>
    </Link>
  );
};

export const EditExpenseButton: React.FC<{
  expense: ExpenseDetailsOutput;
  variant?: 'circle' | 'block';
}> = ({ expense, variant = 'circle' }) => {
  const { t } = useTranslationWithUtils();
  const router = useRouter();
  const recurrence = expense.recurrence;

  const isTemplate = useMemo(
    () => (recurrence ? extractTemplateExpenseId(recurrence.job.command) === expense.id : false),
    [recurrence, expense.id],
  );

  const handleEditConfirm = useCallback(async () => {
    await router.push(`/add?expenseId=${expense.id}`);
  }, [router, expense.id]);

  const editDescription = useMemo(() => {
    if (!recurrence) {
      return '';
    }
    if (isTemplate) {
      return t('recurrence.template_edit_warning');
    }
    return (
      <>
        {t('recurrence.derived_edit_warning')}{' '}
        <Link href="/recurring" className="text-primary underline">
          {t('recurrence.view_recurring_page')}
        </Link>
      </>
    );
  }, [recurrence, isTemplate, t]);

  const trigger =
    'block' === variant ? (
      <Button variant="ghost" className={EDIT_BLOCK_CLASS}>
        {t('actions.edit')}
      </Button>
    ) : (
      <Button variant="ghost" size="icon" className={EDIT_CIRCLE_CLASS}>
        <PencilIcon className="text-foreground/50 size-3.5" />
      </Button>
    );

  if (recurrence) {
    return (
      <SimpleConfirmationDialog
        title={t('recurrence.edit_confirmation_title')}
        description={editDescription}
        hasPermission
        onConfirm={handleEditConfirm}
        loading={false}
      >
        {trigger}
      </SimpleConfirmationDialog>
    );
  }

  return (
    <Link
      href={`/add?expenseId=${expense.id}`}
      className={'block' === variant ? 'flex-1' : undefined}
    >
      {trigger}
    </Link>
  );
};

export const ExpenseEditAction: React.FC<{
  expense: ExpenseDetailsOutput;
  variant?: 'circle' | 'block';
}> = ({ expense, variant = 'circle' }) => {
  if (SplitType.CURRENCY_CONVERSION === expense.splitType) {
    return <EditCurrencyConversion expense={expense} variant={variant} />;
  }
  if (SplitType.SETTLEMENT === expense.splitType) {
    return <EditSettlement expense={expense} variant={variant} />;
  }
  return <EditExpenseButton expense={expense} variant={variant} />;
};

export const EditCurrencyConversion: React.FC<{
  expense: ExpenseDetailsOutput;
  variant?: 'circle' | 'block';
}> = ({ expense, variant = 'circle' }) => {
  const { setCurrency } = useAddExpenseStore((s) => s.actions);
  const { t } = useTranslationWithUtils();

  if (!expense.conversionTo) {
    toast.error(t('errors.currency_conversion_malformed'));
    console.error(
      'Malformed currency conversion data: no conversionTo present, please report this issue.',
    );
    return null;
  }

  const addOrEditCurrencyConversionMutation = api.expense.addOrEditCurrencyConversion.useMutation();
  const apiUtils = api.useUtils();

  const onClick = useCallback(() => {
    if (expense.conversionTo && isCurrencyCode(expense.conversionTo.currency)) {
      setCurrency(expense.conversionTo.currency);
    }
  }, [expense, setCurrency]);

  const sender = expense.paidByUser;
  const receiver = expense.expenseParticipants.find((p) => p.userId !== expense.paidBy)?.user;

  if (!sender || !receiver || !isCurrencyCode(expense.currency)) {
    return null;
  }

  const onSubmit: ComponentProps<typeof CurrencyConversion>['onSubmit'] = useCallback(
    async (data) => {
      await addOrEditCurrencyConversionMutation.mutateAsync({
        ...data,
        senderId: sender.id,
        receiverId: receiver.id,
        groupId: expense.groupId,
        expenseId: expense.id,
      });
      await apiUtils.invalidate();
    },
    [
      addOrEditCurrencyConversionMutation,
      sender.id,
      receiver.id,
      expense.groupId,
      expense.id,
      apiUtils,
    ],
  );

  return (
    <CurrencyConversion
      amount={expense.amount}
      currency={expense.currency}
      onSubmit={onSubmit}
      editingRate={Math.abs(Number(expense.conversionTo?.amount) / Number(expense.amount))}
    >
      <Button
        variant="ghost"
        onClick={onClick}
        className={'block' === variant ? EDIT_BLOCK_CLASS : EDIT_CIRCLE_CLASS}
      >
        {'block' === variant ? (
          t('actions.edit')
        ) : (
          <PencilIcon className="text-foreground/50 size-3.5" />
        )}
      </Button>
    </CurrencyConversion>
  );
};

export const EditSettlement: React.FC<{
  expense: ExpenseDetailsOutput;
  variant?: 'circle' | 'block';
}> = ({ expense, variant = 'circle' }) => {
  const { displayName, t, getCurrencyHelpersCached } = useTranslationWithUtils();

  const sender = expense.paidByUser;
  const receiver = expense.expenseParticipants.find((p) => p.userId !== expense.paidBy)?.user;

  const [amount, setAmount] = useState<bigint>(BigMath.abs(expense.amount));
  const [expenseDate, setExpenseDate] = useState<Date>(expense.expenseDate);
  const [amountStr, setAmountStr] = useState<string>(
    getCurrencyHelpersCached(expense.currency).toUIString(BigMath.abs(expense.amount)),
  );

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const apiUtils = api.useUtils();

  const onCurrencyInputValueChange = useCallback(
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

  const saveExpense = useCallback(() => {
    if (!amount || !sender || !receiver) {
      return;
    }

    addExpenseMutation.mutate(
      {
        expenseId: expense.id,
        name: t('ui.settle_up_name'),
        currency: expense.currency,
        amount,
        splitType: SplitType.SETTLEMENT,
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
        groupId: expense.groupId,
        expenseDate,
      },
      {
        onSuccess: () => {
          apiUtils.invalidate().catch(console.error);
        },
        onError: (error) => {
          console.error('Error while saving expense:', error);
          toast.error(t('errors.saving_expense'));
        },
      },
    );
  }, [amount, sender, receiver, expense, addExpenseMutation, expenseDate, apiUtils, t]);

  if (!sender || !receiver) {
    return null;
  }

  return (
    <AppDrawer
      trigger={
        <Button
          variant="ghost"
          className={'block' === variant ? EDIT_BLOCK_CLASS : EDIT_CIRCLE_CLASS}
        >
          {'block' === variant ? (
            t('actions.edit')
          ) : (
            <PencilIcon className="text-foreground/50 size-3.5" />
          )}
        </Button>
      }
      leftAction={t('actions.back')}
      title={t('ui.settlement')}
      actionTitle={t('actions.save')}
      actionOnClick={saveExpense}
      actionDisabled={!amount}
      className="h-[70vh]"
      shouldCloseOnAction
    >
      <div className="mt-10 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-5">
            <EntityAvatar entity={sender} />
            <ArrowRightIcon className="text-foreground/45 h-6 w-6" />
            <EntityAvatar entity={receiver} />
          </div>
          <p className="mt-2 text-center text-sm text-gray-400">
            {displayName(sender)} {t('ui.expense.user.pay')} {displayName(receiver)}
          </p>
          {expense.group ? (
            <p className="mt-1 text-center text-xs text-gray-500">{expense.group.name}</p>
          ) : null}
        </div>
        <CurrencyInput
          currency={expense.currency}
          strValue={amountStr}
          className="mx-auto mt-4 w-37.5 text-center text-lg"
          onValueChange={onCurrencyInputValueChange}
        />
        <DateSelector
          mode="single"
          required
          selected={expenseDate}
          onSelect={setExpenseDate}
          popoverPortalled={false}
        />
      </div>
    </AppDrawer>
  );
};

export default ExpenseDetails;
