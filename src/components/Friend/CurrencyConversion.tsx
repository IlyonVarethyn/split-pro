import { ArrowRight } from 'lucide-react';
import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { type CurrencyCode, isCurrencyCode } from '~/lib/currency';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { MAX_RATE_PRECISION, currencyConversion, getRatePrecision } from '~/utils/numbers';

import { CurrencyPicker } from '../AddExpense/CurrencyPicker';
import { DateSelector } from '../AddExpense/DateSelector';
import { CurrencyInput } from '../ui/currency-input';
import { AppDrawer } from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export const CurrencyConversion: React.FC<{
  amount: bigint;
  editingRate?: number;
  editingTargetCurrency?: string;
  currency: string;
  children: ReactNode;
  onSubmit: (data: {
    from: CurrencyCode;
    to: CurrencyCode;
    amount: bigint;
    rate: number;
  }) => Promise<void> | void;
}> = ({ amount, editingRate, editingTargetCurrency, currency, children, onSubmit }) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();

  const { toUIString, toSafeBigInt } = getCurrencyHelpersCached(currency);

  const [amountStr, setAmountStr] = useState('');
  const [rate, setRate] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const preferredCurrency = useAddExpenseStore((state) => state.currency);
  const { setCurrency } = useAddExpenseStore((state) => state.actions);
  const [targetCurrency, setTargetCurrency] = useState<CurrencyCode>(preferredCurrency);
  const [rateDate, setRateDate] = useState<Date>(new Date());
  const getCurrencyRate = api.expense.getCurrencyRate.useQuery(
    { from: currency, to: targetCurrency, date: rateDate },
    { enabled: currency !== targetCurrency },
  );

  const { toUIString: toUITargetString } = getCurrencyHelpersCached(targetCurrency);

  useEffect(() => {
    if (getCurrencyRate.isPending) {
      setRate('');
      setTargetAmountStr('');
    }
  }, [getCurrencyRate.isPending]);

  useEffect(() => {
    setAmountStr(toUIString(amount, false, true));
    if (editingRate) {
      const precision = getRatePrecision(editingRate);
      setRate(editingRate.toFixed(precision));
    } else {
      setRate('');
    }
    if (editingTargetCurrency && isCurrencyCode(editingTargetCurrency)) {
      setTargetCurrency(editingTargetCurrency);
    }
  }, [amount, editingRate, editingTargetCurrency, toUIString]);

  useEffect(() => {
    if (getCurrencyRate.data?.rate) {
      const precision = getRatePrecision(getCurrencyRate.data.rate);
      setRate(getCurrencyRate.data.rate.toFixed(precision));
    }
  }, [getCurrencyRate.data]);

  const dateDisabled = useMemo(() => ({ after: new Date() }), []);

  useEffect(() => {
    if (!isCurrencyCode(currency) || !isCurrencyCode(targetCurrency)) {
      return;
    }

    const targetAmount = currencyConversion({
      from: currency,
      to: targetCurrency,
      amount: toSafeBigInt(amountStr),
      rate: Number(rate),
    });
    setTargetAmountStr(toUITargetString(targetAmount, false, true));
  }, [amountStr, rate, toSafeBigInt, toUITargetString, currency, targetCurrency]);

  const onUpdateAmount = useCallback(
    ({ strValue }: { strValue?: string; bigIntValue?: bigint }) => {
      if (strValue !== undefined) {
        setAmountStr(strValue);
      }
    },
    [setAmountStr],
  );

  const onChangeRate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    // Allow empty while typing
    if (raw === '') {
      setRate('');
      return;
    }
    // Only digits and optional dot
    if (!/^[0-9]*\.?[0-9]*$/.test(raw)) {
      return;
    }
    const [int = '', dec = ''] = raw.split('.');
    const trimmedDec = dec.slice(0, 10);
    const normalized = raw.includes('.') ? `${int}.${trimmedDec}` : int;
    setRate(normalized);
  }, []);

  const onChangeTargetCurrency = useCallback(
    (nextCurrency: CurrencyCode | null) => {
      if (!nextCurrency) {
        return;
      }

      setRate('');
      setTargetCurrency(nextCurrency);
      setCurrency(nextCurrency);
    },
    [setCurrency],
  );

  const onChangeTargetAmount = useCallback(
    ({ bigIntValue }: { strValue?: string; bigIntValue?: bigint }) => {
      if (bigIntValue && isCurrencyCode(currency)) {
        const convertedAmount = currencyConversion({
          amount: bigIntValue ?? 0n,
          rate: 1 / Number(rate),
          from: targetCurrency,
          to: currency,
        });
        setAmountStr(toUIString(convertedAmount, false, true));
      }
    },
    [rate, toUIString, targetCurrency, currency],
  );

  const onSave = useCallback(async () => {
    try {
      if (!isCurrencyCode(currency)) {
        toast.error(t('errors.invalid_currency_code', { code: currency }));
        return;
      }

      await onSubmit({
        amount: getCurrencyHelpersCached(currency).toSafeBigInt(amountStr),
        rate: Number(rate),
        from: currency,
        to: targetCurrency,
      });
      toast.success(t('currency_conversion.success_toast'));
    } catch (error) {
      console.error(error);
      toast.error(t('errors.currency_conversion_error'));
    }
  }, [onSubmit, targetCurrency, amountStr, rate, currency, getCurrencyHelpersCached, t]);

  const ratePrecision = useMemo(() => {
    if (!rate) {
      return 0;
    }
    return getRatePrecision(Number(rate));
  }, [rate]);

  return (
    <AppDrawer
      trigger={children}
      leftAction={t('actions.back')}
      title={t('currency_conversion.title')}
      className="h-[70vh]"
      actionTitle={t('actions.save')}
      shouldCloseOnAction
      actionOnClick={onSave}
      actionDisabled={
        !isCurrencyCode(targetCurrency) ||
        !amountStr ||
        !rate ||
        Number(rate) <= 0 ||
        Number(amountStr) <= 0 ||
        Number(targetAmountStr) <= 0
      }
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:mt-4">
        <div className="bg-foreground/5 flex items-end gap-3 rounded-[16px] px-[18px] py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-foreground/40 text-[11.5px] font-semibold tracking-[.06em] uppercase">
              {t('ui.expense.from')}
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <CurrencyInput
                aria-label="Amount"
                currency={currency}
                strValue={amountStr}
                hideSymbol
                onValueChange={onUpdateAmount}
                className="h-9 min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-left text-[21px] font-bold tabular-nums shadow-none focus-visible:ring-0"
              />
              <span className="text-foreground/45 shrink-0 text-[13px] font-semibold">
                {currency}
              </span>
            </div>
          </div>

          <ArrowRight
            className="text-foreground/50 mb-2 h-[18px] w-[18px] shrink-0"
            strokeWidth={1.8}
            aria-hidden="true"
          />

          <div className="flex min-w-0 flex-1 flex-col items-end gap-1.5">
            <span className="text-foreground/40 text-[11.5px] font-semibold tracking-[.06em] uppercase">
              {t('ui.expense.to')}
            </span>
            <div className="flex w-full min-w-0 items-center justify-end gap-2">
              <CurrencyInput
                aria-label="Converted Amount"
                currency={targetCurrency}
                strValue={targetAmountStr}
                onValueChange={onChangeTargetAmount}
                hideSymbol
                disabled={getCurrencyRate.isPending || currency === targetCurrency}
                className="text-primary h-9 min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-right text-[21px] font-bold tabular-nums shadow-none focus-visible:ring-0"
              />
              {editingTargetCurrency ? (
                <span className="text-foreground/45 shrink-0 text-[13px] font-semibold">
                  {editingTargetCurrency}
                </span>
              ) : (
                <CurrencyPicker
                  className="mx-0 shrink-0"
                  currentCurrency={targetCurrency}
                  onCurrencyPick={onChangeTargetCurrency}
                />
              )}
            </div>
          </div>
        </div>

        <div className="bg-foreground/5 rounded-[18px] px-[18px] py-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="flex flex-col gap-2">
              <Label className="text-foreground/45 text-[13.5px] font-medium">
                {t('currency_conversion.rate')}
              </Label>
              <Input
                aria-label="Rate"
                type="number"
                step={`0.${'0'.repeat(MAX_RATE_PRECISION - 1)}1`}
                min={0}
                value={rate}
                inputMode="numeric"
                onChange={onChangeRate}
                disabled={getCurrencyRate.isPending || currency === targetCurrency}
                className="border-foreground/15 h-11 rounded-none border-0 border-b bg-transparent px-0 text-[20px] font-semibold tabular-nums shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <Label className="text-foreground/45 text-[13.5px] font-medium">
                {t('actions.fetch')} {t('ui.expense.from')}
              </Label>
              <DateSelector
                mode="single"
                required
                disabled={dateDisabled}
                selected={rateDate}
                onSelect={setRateDate}
                popoverPortalled={false}
              />
            </div>
          </div>

          <div className="text-foreground/35 mt-3 min-h-9 text-[12px] leading-5">
            {currency !== targetCurrency && getCurrencyRate.isPending && (
              <span>{t('currency_conversion.fetching_rate')}</span>
            )}
            {Boolean(rate) && (
              <div className="flex flex-col">
                <span>
                  1 {currency} = {Number(rate).toFixed(ratePrecision)} {targetCurrency}
                </span>
                <span>
                  1 {targetCurrency} = {(1 / Number(rate)).toFixed(ratePrecision)} {currency}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppDrawer>
  );
};
