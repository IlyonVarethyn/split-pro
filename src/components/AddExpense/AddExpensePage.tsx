import { HeartHandshakeIcon, Landmark, RefreshCcwDot, X } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback } from 'react';

import { type CurrencyCode } from '~/lib/currency';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';

import { toast } from 'sonner';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cronToBackend } from '~/lib/cron';
import { cn } from '~/lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import AddBankTransactions from './AddBankTransactions';
import { CategoryPicker } from './CategoryPicker';
import { CurrencyPicker } from './CurrencyPicker';
import { DateSelector } from './DateSelector';
import { RecurrenceInput } from './RecurrenceInput';
import { SelectUserOrGroup } from './SelectUserOrGroup';
import { PayerSelectionForm, SplitTypeInline } from './SplitTypeSection';
import { UploadFile } from './UploadFile';
import { UserInput } from './UserInput';
import { CurrencyInput } from '../ui/currency-input';
import { CurrencyConversion } from '../Friend/CurrencyConversion';
import { currencyConversion } from '~/utils/numbers';
import { CurrencyConversionIcon } from '../ui/categoryIcons';
import { useSession } from 'next-auth/react';

export const AddOrEditExpensePage: React.FC<{
  enableSendingInvites: boolean;
  expenseId?: string;
  bankConnectionEnabled: boolean;
}> = ({ enableSendingInvites, expenseId, bankConnectionEnabled }) => {
  const showFriends = useAddExpenseStore((s) => s.showFriends);
  const amount = useAddExpenseStore((s) => s.amount);
  const isNegative = useAddExpenseStore((s) => s.isNegative);
  const participants = useAddExpenseStore((s) => s.participants);
  const group = useAddExpenseStore((s) => s.group);
  const currency = useAddExpenseStore((s) => s.currency);
  const category = useAddExpenseStore((s) => s.category);
  const description = useAddExpenseStore((s) => s.description);
  const isFileUploading = useAddExpenseStore((s) => s.isFileUploading);
  const amtStr = useAddExpenseStore((s) => s.amountStr);
  const expenseDate = useAddExpenseStore((s) => s.expenseDate);
  const isExpenseSettled = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const paidBy = useAddExpenseStore((s) => s.paidBy);
  const splitType = useAddExpenseStore((s) => s.splitType);
  const fileKey = useAddExpenseStore((s) => s.fileKey);
  const currentUser = useAddExpenseStore((s) => s.currentUser);
  const transactionId = useAddExpenseStore((s) => s.transactionId);
  const cronExpression = useAddExpenseStore((s) => s.cronExpression);
  const multipleTransactions = useAddExpenseStore((s) => s.multipleTransactions);

  const { t, displayName, getCurrencyHelpersCached } = useTranslationWithUtils();

  const {
    setCurrency,
    setCategory,
    setDescription,
    setAmount,
    setAmountStr,
    resetState,
    setSplitScreenOpen,
    setExpenseDate,
    setMultipleTransactions,
    setIsTransactionLoading,
    setSingleTransaction,
  } = useAddExpenseStore((s) => s.actions);

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const updateProfile = api.user.updateUserDetail.useMutation();
  const { update } = useSession();

  const onCurrencyPick = useCallback(
    (newCurrency: CurrencyCode | null) => {
      if (!newCurrency) {
        return;
      }

      updateProfile.mutate({ currency: newCurrency });

      previousCurrencyRef.current = currency;
      setCurrency(newCurrency);
    },
    [currency, setCurrency, updateProfile],
  );

  const router = useRouter();

  const onUpdateAmount = useCallback(
    ({ strValue, bigIntValue }: { strValue?: string; bigIntValue?: bigint }) => {
      if (strValue !== undefined) {
        setAmountStr(strValue);
      }
      if (bigIntValue !== undefined) {
        setAmount(bigIntValue);
      }
      previousCurrencyRef.current = null;
    },
    [setAmount, setAmountStr],
  );

  const addExpense = useCallback(async () => {
    if (!paidBy) {
      return;
    }

    if (!isExpenseSettled) {
      setSplitScreenOpen(true);
      return;
    }

    setMultipleTransactions([]);
    setIsTransactionLoading(false);

    const sign = isNegative ? -1n : 1n;

    try {
      await addExpenseMutation.mutateAsync(
        [
          {
            name: description,
            currency,
            amount: amount * sign,
            groupId: group?.id ?? null,
            splitType,
            participants: participants.map((p) => ({
              userId: p.id,
              amount: (p.amount ?? 0n) * sign,
            })),
            paidBy: paidBy.id,
            category,
            fileKey,
            expenseDate,
            expenseId,
            transactionId,
            cronExpression: cronExpression ? cronToBackend(cronExpression) : undefined,
          },
        ],
        {
          onSuccess: (d) => {
            if (d) {
              if (multipleTransactions.length > 0) {
                const allTransactions = [...multipleTransactions];
                const transactionToAdd = allTransactions.pop();
                if (transactionToAdd) {
                  setMultipleTransactions(allTransactions);
                  setSingleTransaction(transactionToAdd);
                }
                return;
              } else {
                const id = d.length > 0 ? d[0]?.id : expenseId;

                let navPromise: () => Promise<any> = () => Promise.resolve(true);

                const { friendId, groupId } = router.query;

                if (friendId && !groupId) {
                  navPromise = () => router.push(`/balances/${friendId as string}/expenses/${id}`);
                } else if (groupId) {
                  navPromise = () => router.push(`/groups/${groupId as string}/expenses/${id}`);
                } else {
                  navPromise = () => router.push(`/expenses/${id}?keepAdding=1`);
                }

                if (expenseId) {
                  navPromise = async () => router.back();
                }

                navPromise().catch(console.error);
                update((session: any) => ({
                  ...session,
                  user: {
                    ...(session?.user ?? {}),
                    currency,
                  },
                })).catch(console.error);
              }
            }
          },
        },
      );
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred while submitting the expense.');
      }
    }
  }, [
    setSplitScreenOpen,
    description,
    currency,
    isNegative,
    amount,
    participants,
    category,
    expenseDate,
    expenseId,
    router,
    addExpenseMutation,
    group,
    paidBy,
    splitType,
    fileKey,
    isExpenseSettled,
    setMultipleTransactions,
    transactionId,
    setIsTransactionLoading,
    cronExpression,
    multipleTransactions,
    setSingleTransaction,
    update,
  ]);

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDescription(e.target.value.toString() ?? '');
    },
    [setDescription],
  );

  const clearTransaction = useCallback(() => {
    resetState();
    setMultipleTransactions([]);
  }, [resetState, setMultipleTransactions]);

  const previousCurrencyRef = React.useRef<CurrencyCode | null>(null);

  const onConvertAmount: React.ComponentProps<typeof CurrencyConversion>['onSubmit'] = useCallback(
    ({ amount: absAmount, rate }) => {
      if (!previousCurrencyRef.current) {
        return;
      }

      const targetAmount =
        (absAmount >= 0n ? 1n : -1n) *
        currencyConversion({
          amount: absAmount,
          rate,
          from: previousCurrencyRef.current,
          to: currency,
        });
      setAmount(targetAmount);
      setAmountStr(getCurrencyHelpersCached(currency).toUIString(targetAmount, false, true));
      previousCurrencyRef.current = null;
    },
    [setAmount, setAmountStr, currency, getCurrencyHelpersCached],
  );

  const currencyConversionComponent = React.useMemo(() => {
    if (
      currency === previousCurrencyRef.current ||
      previousCurrencyRef.current === null ||
      !amount ||
      0n === amount
    ) {
      return null;
    }

    return (
      <CurrencyConversion
        onSubmit={onConvertAmount}
        amount={amount}
        currency={previousCurrencyRef.current}
        editingTargetCurrency={currency}
      >
        <Button size="icon" variant="secondary" className="bg-foreground/6 size-9 rounded-full">
          <CurrencyConversionIcon className="size-4" />
        </Button>
      </CurrencyConversion>
    );
  }, [amount, currency, onConvertAmount]);

  const onBackButtonPress = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="text-foreground/50 px-0 text-[13.5px] font-semibold"
          onClick={onBackButtonPress}
        >
          {t('actions.cancel')}
        </Button>
        <div className="text-[26px] font-bold tracking-[-0.4px]">
          {expenseId ? t('actions.edit_expense') : t('actions.add_expense')}
        </div>
        {expenseId ? (
          <div className="size-[38px]" />
        ) : (
          <RecurrenceInput>
            <Button
              variant="ghost"
              className={cn(
                'size-[38px] rounded-full px-0',
                cronExpression ? 'bg-primary/14 text-primary' : 'bg-foreground/6',
              )}
            >
              <RefreshCcwDot className="size-[17px]" />
              <span className="sr-only">Toggle recurring expense options</span>
            </Button>
          </RecurrenceInput>
        )}
      </div>
      <UserInput isEditing={Boolean(expenseId)} />
      {showFriends || (1 === participants.length && !group) ? (
        <SelectUserOrGroup enableSendingInvites={enableSendingInvites} />
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <div className="text-foreground/40 text-[11.5px] font-semibold tracking-[.06em] uppercase">
              {t('expense_details.add_expense_details.description_label')}
            </div>
            <Input
              placeholder={t('expense_details.add_expense_details.description_placeholder')}
              value={description}
              onChange={handleDescriptionChange}
              className="border-foreground/18 focus-visible:border-primary rounded-none border-0 border-b-[1.5px] bg-transparent px-0 text-[18px] font-medium shadow-none placeholder:text-sm focus-visible:ring-0"
              autoFocus
            />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-foreground/40 mb-1.5 text-[11.5px] font-semibold tracking-[.06em] uppercase">
                {t('expense_details.add_expense_details.amount_label')}
              </div>
              <CurrencyInput
                className="border-0 bg-transparent px-0 text-[38px] font-bold tracking-[-0.5px] tabular-nums shadow-none placeholder:text-[24px] focus-visible:ring-0"
                placeholder={t('expense_details.add_expense_details.amount_placeholder')}
                currency={currency}
                strValue={amtStr}
                allowNegative
                hideSymbol
                onValueChange={onUpdateAmount}
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {currencyConversionComponent}
              <CurrencyPicker currentCurrency={currency} onCurrencyPick={onCurrencyPick} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <PayerSelectionForm>
              <Button
                variant="ghost"
                className="bg-primary/14 text-primary h-auto max-w-full min-w-0 justify-start rounded-full px-3.5 py-2 text-[12.5px] font-semibold"
              >
                <span className="max-w-full truncate">
                  {t(`ui.expense.${isNegative ? 'received_by' : 'paid_by'}`)}{' '}
                  {displayName(paidBy, currentUser?.id, 'dativus')}
                </span>
              </Button>
            </PayerSelectionForm>
            <CategoryPicker category={category} onCategoryPick={setCategory} />
            <DateSelector mode="single" required selected={expenseDate} onSelect={setExpenseDate} />
            <UploadFile />
          </div>

          <SplitTypeInline />

          <Button
            className="bg-primary text-primary-foreground w-full rounded-[14px] py-[15px] text-[15.5px] font-bold active:scale-[.98] disabled:opacity-40"
            loading={addExpenseMutation.isPending || isFileUploading}
            disabled={
              addExpenseMutation.isPending ||
              !amount ||
              '' === description ||
              isFileUploading ||
              !isExpenseSettled
            }
            onClick={addExpense}
          >
            {t('actions.save')}
          </Button>

          <div className="flex items-center justify-evenly px-4 lg:px-0">
            <SponsorUs />
            <div className="flex gap-2">
              <AddBankTransactions bankConnectionEnabled={bankConnectionEnabled}>
                <Button
                  variant="ghost"
                  className="bg-foreground/6 hover:text-foreground/80 size-[38px] rounded-full px-0"
                >
                  <Landmark
                    className={cn(transactionId ? 'text-primary' : 'text-foreground/45', 'h-5 w-5')}
                  />
                </Button>
              </AddBankTransactions>
              <Button
                variant="ghost"
                className={cn(
                  'bg-foreground/6 size-[38px] rounded-full px-0',
                  transactionId ? 'text-negative' : 'invisible',
                )}
                disabled={!transactionId}
                onClick={clearTransaction}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const SponsorUs = () => {
  const { t } = useTranslation();
  return (
    <div className="flex justify-center">
      <Link href="https://github.com/sponsors/krokosik" target="_blank" className="mx-auto">
        <Button
          variant="outline"
          className="text-md hover:text-foreground/80 justify-between rounded-full border-pink-500"
        >
          <div className="flex items-center gap-4">
            <HeartHandshakeIcon className="h-5 w-5 text-pink-500" />
            {t('expense_details.add_expense_details.sponsor_us')}
          </div>
        </Button>
      </Link>
    </div>
  );
};
