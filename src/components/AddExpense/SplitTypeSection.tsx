import { SplitType } from '@prisma/client';
import { clsx } from 'clsx';
import {
  BarChart2,
  Check,
  ChevronDown,
  DollarSign,
  Equal,
  type LucideIcon,
  Percent,
  Plus,
  X,
} from 'lucide-react';
import React, {
  type ChangeEvent,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';

import { type Participant, useAddExpenseStore } from '~/store/addStore';
import { BigMath } from '~/utils/numbers';

import { type TFunction, useTranslation } from 'next-i18next';
import type { CurrencyCode } from '~/lib/currency';
import { cn } from '~/lib/utils';
import { EntityAvatar } from '../ui/avatar';
import { CurrencyInput } from '../ui/currency-input';
import { AppDrawer, AppDrawerClose } from '../ui/drawer';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tabs, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';

export const PayerSelectionForm: React.FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslationWithUtils();
  const isNegative = useAddExpenseStore((s) => s.isNegative);
  const paidBy = useAddExpenseStore((s) => s.paidBy);
  const participants = useAddExpenseStore((s) => s.participants);

  return (
    <AppDrawer
      trigger={children}
      title={t(`ui.expense.${isNegative ? 'received_by' : 'paid_by'}`)}
      className="h-[70vh]"
      shouldCloseOnAction
    >
      <div className="flex flex-col overflow-auto">
        {participants.map((participant) => (
          <PayerRow key={participant.id} p={participant} isPaying={participant.id === paidBy?.id} />
        ))}
      </div>
    </AppDrawer>
  );
};

const PayerRow = ({ p, isPaying }: { p: Participant; isPaying: boolean }) => {
  const { displayName } = useTranslationWithUtils();
  const currentUser = useAddExpenseStore((s) => s.currentUser);
  const { setPaidBy } = useAddExpenseStore((s) => s.actions);

  const onClick = useCallback(() => setPaidBy(p), [p, setPaidBy]);

  return (
    <AppDrawerClose
      className="border-foreground/6 flex items-center justify-between border-b px-1 py-3 active:opacity-55"
      onClick={onClick}
    >
      <div className="flex min-w-0 items-center gap-3">
        <EntityAvatar entity={p} size={38} />
        <p className="truncate text-[15px] font-medium">{displayName(p, currentUser?.id)}</p>
      </div>
      {isPaying ? <Check className="text-primary h-5 w-5" /> : null}
    </AppDrawerClose>
  );
};

const useSplitTabsController = (allowedSplitTypes?: readonly SplitType[]) => {
  const { t } = useTranslation();
  const splitType = useAddExpenseStore((s) => s.splitType);
  const { setSplitType } = useAddExpenseStore((s) => s.actions);

  const onTabChange = useCallback(
    (value: string) => {
      setSplitType(value as SplitType);
    },
    [setSplitType],
  );

  const splitProps = useMemo(() => {
    const allSplitProps = getSplitProps(t);
    if (!allowedSplitTypes || 0 === allowedSplitTypes.length) {
      return allSplitProps;
    }

    return allSplitProps.filter((props) => allowedSplitTypes.includes(props.splitType));
  }, [allowedSplitTypes, t]);

  const activeSplitType = splitProps.some((props) => props.splitType === splitType)
    ? splitType
    : (splitProps[0]?.splitType ?? SplitType.EQUAL);

  useEffect(() => {
    if (activeSplitType !== splitType) {
      setSplitType(activeSplitType);
    }
  }, [activeSplitType, setSplitType, splitType]);

  return { splitProps, activeSplitType, onTabChange };
};

const SplitTypePicker: React.FC<{
  splitProps: SplitSectionProps[];
  activeSplitType: SplitType;
  onTabChange: (value: string) => void;
}> = ({ splitProps, activeSplitType, onTabChange }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const activeProps = splitProps.find((props) => props.splitType === activeSplitType);

  const handleSelect = useCallback(
    (value: string) => {
      onTabChange(value);
      setOpen(false);
    },
    [onTabChange],
  );

  if (!activeProps) {
    return null;
  }

  const ActiveIcon = activeProps.iconComponent;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="bg-foreground/5 flex w-full items-center gap-2.5 rounded-[14px] px-3.5 py-[11px] active:opacity-60"
        >
          <div className="bg-primary/14 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
            <ActiveIcon className="h-4 w-4" />
          </div>
          <span className="flex-1 text-left text-[15px] font-medium">
            {t(
              `expense_details.add_expense_details.split_type_section.types.${activeSplitType.toLowerCase()}.title`,
            )}
          </span>
          <ChevronDown className="text-foreground/40 h-4 w-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="bg-surface-sheet border-foreground/8 w-[calc(100vw-2rem)] max-w-sm rounded-[16px] p-1.5"
      >
        <div className="flex flex-col">
          {splitProps.map(({ splitType, iconComponent: Icon }) => (
            <button
              key={splitType}
              type="button"
              onClick={() => handleSelect(splitType)}
              className={cn(
                'flex items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-left active:opacity-60',
                splitType === activeSplitType && 'bg-primary/8',
              )}
            >
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full',
                  splitType === activeSplitType
                    ? 'bg-primary/14 text-primary'
                    : 'bg-foreground/6 text-foreground/60',
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-medium">
                  {t(
                    `expense_details.add_expense_details.split_type_section.types.${splitType.toLowerCase()}.title`,
                  )}
                </div>
                <div className="text-foreground/45 text-[12.5px]">
                  {t(
                    `expense_details.add_expense_details.split_type_section.types.${splitType.toLowerCase()}.description`,
                  )}
                </div>
              </div>
              {splitType === activeSplitType ? (
                <Check className="text-primary h-4 w-4 shrink-0" />
              ) : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const SplitTypeTabs: React.FC<{
  splitProps: SplitSectionProps[];
  activeSplitType: SplitType;
  onTabChange: (value: string) => void;
}> = ({ splitProps, activeSplitType, onTabChange }) => (
  <Tabs value={activeSplitType} className="w-full" onValueChange={onTabChange}>
    <SplitTypePicker
      splitProps={splitProps}
      activeSplitType={activeSplitType}
      onTabChange={onTabChange}
    />
    {splitProps.map((props) => (
      <TabsContent key={props.splitType} value={props.splitType}>
        <SplitSection {...props} />
      </TabsContent>
    ))}
  </Tabs>
);

export const SplitExpenseForm: React.FC<
  PropsWithChildren<{
    allowedSplitTypes?: readonly SplitType[];
    onSave?: () => void;
    onOpenChange?: (open: boolean) => void;
    onTriggerClick?: () => void;
  }>
> = ({ children, allowedSplitTypes, onSave, onOpenChange, onTriggerClick }) => {
  const { t } = useTranslation();
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const splitScreenOpen = useAddExpenseStore((s) => s.splitScreenOpen);

  const { setSplitScreenOpen } = useAddExpenseStore((s) => s.actions);
  const { splitProps, activeSplitType, onTabChange } = useSplitTabsController(allowedSplitTypes);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setSplitScreenOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange, setSplitScreenOpen],
  );

  return (
    <AppDrawer
      trigger={children}
      onTriggerClick={onTriggerClick}
      title={t(
        `expense_details.add_expense_details.split_type_section.types.${activeSplitType.toLowerCase()}.title`,
      )}
      className="h-[85vh] lg:h-[70vh]"
      shouldCloseOnAction
      dismissible={canSplitScreenClosed}
      actionTitle={t('actions.save')}
      actionOnClick={onSave}
      actionDisabled={!canSplitScreenClosed}
      open={splitScreenOpen}
      onOpenChange={handleOpenChange}
    >
      <div className="mx-auto mt-5 w-full">
        <SplitTypeTabs
          splitProps={splitProps}
          activeSplitType={activeSplitType}
          onTabChange={onTabChange}
        />
      </div>
    </AppDrawer>
  );
};

/**
 * Inline (non-drawer) rendering of the split-type segmented control, used directly on the
 * Add Expense main screen per the redesign brief (segmented control + participant rows +
 * "Totale ripartito" live on the page, not behind a trigger).
 */
export const SplitTypeInline: React.FC<{ allowedSplitTypes?: readonly SplitType[] }> = ({
  allowedSplitTypes,
}) => {
  const { t } = useTranslation();
  const { splitProps, activeSplitType, onTabChange } = useSplitTabsController(allowedSplitTypes);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-foreground/40 text-[11.5px] font-semibold tracking-[.06em] uppercase">
        {t('expense_details.add_expense_details.split_type_section.how_to_split')}
      </div>
      <SplitTypeTabs
        splitProps={splitProps}
        activeSplitType={activeSplitType}
        onTabChange={onTabChange}
      />
    </div>
  );
};

interface SplitSectionPropsBase {
  splitType: SplitType;
  iconComponent: LucideIcon;
  prefix: string;
  isBoolean?: boolean;
  isCurrency?: boolean;
  fmtSummartyText: (
    amount: bigint,
    totalShares: bigint,
    toUIString: (val: unknown, signed?: boolean) => string,
  ) => string;
}

interface BooleanSplitSectionProps extends SplitSectionPropsBase {
  isBoolean: true;
  fmtShareText: null;
  step: null;
}

interface NumericSplitSectionProps extends SplitSectionPropsBase {
  fmtShareText: (share: bigint) => string;
  step: number | null;
}

interface CurrencySplitSectionProps extends SplitSectionPropsBase {
  isCurrency: true;
  fmtShareText: (share: bigint, toUIString: (val: unknown) => string) => string;
  step: number | null;
}

type SplitSectionProps =
  | BooleanSplitSectionProps
  | NumericSplitSectionProps
  | CurrencySplitSectionProps;

const getSplitProps = (t: TFunction): SplitSectionProps[] => [
  {
    splitType: SplitType.EQUAL,
    iconComponent: Equal,
    prefix: '',
    isBoolean: true,
    fmtSummartyText: (amount, totalShares, toUIString) =>
      `${totalShares > 0 ? toUIString(amount / totalShares) : 0} ${t('expense_details.add_expense_details.split_type_section.types.equal.per_person')}`,
    fmtShareText: null,
    step: null,
  },
  {
    splitType: SplitType.PERCENTAGE,
    iconComponent: Percent,
    prefix: '%',
    fmtSummartyText: (amount, totalShares) => {
      const remainingPercentage = 10000n - totalShares;
      return `${t('expense_details.add_expense_details.split_type_section.types.percentage.remaining')} ${Number(remainingPercentage) / 100}%`;
    },
    fmtShareText: (share) => (Number(share) / 100).toString(),
    step: null,
  },
  {
    splitType: SplitType.EXACT,
    iconComponent: DollarSign,
    prefix: '',
    isCurrency: true,
    fmtSummartyText: (amount, totalShares, toUIString) =>
      `${t('expense_details.add_expense_details.split_type_section.types.exact.remaining')} ${toUIString(amount - totalShares, true)}`,
    fmtShareText: (share, toUIString) => toUIString(share),
    step: null,
  },
  {
    splitType: SplitType.SHARE,
    iconComponent: BarChart2,
    prefix: t('expense_details.add_expense_details.split_type_section.types.share.shares'),
    fmtSummartyText: (_amount, totalShares) =>
      `${t('expense_details.add_expense_details.split_type_section.types.share.total_shares')} ${Number(totalShares) / 100}`,
    fmtShareText: (share) => (Number(share) / 100).toString(),
    step: 1,
  },
  {
    splitType: SplitType.ADJUSTMENT,
    iconComponent: Plus,
    isCurrency: true,
    prefix: '',
    fmtSummartyText: (amount, totalShares, toUIString) =>
      `${t('expense_details.add_expense_details.split_type_section.types.adjustment.remaining_to_split_equally')}: ${toUIString(amount - totalShares, true)}`,
    fmtShareText: (share, toUIString) => toUIString(share),
    step: null,
  },
];

const SplitSection: React.FC<SplitSectionProps> = (props) => {
  const participants = useAddExpenseStore((s) => s.participants);
  const totalShares = useAddExpenseStore((s) =>
    s.participants.reduce(
      (acc, p) =>
        acc + (s.splitShares[p.id]?.[s.splitType] ?? (s.splitType === SplitType.EQUAL ? 1n : 0n)),
      0n,
    ),
  );
  const allSelected = useAddExpenseStore((s) =>
    s.participants.every((p) => 0n !== s.splitShares[p.id]?.[s.splitType]),
  );
  const currency = useAddExpenseStore((s) => s.currency);
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const { toUIString, toSafeBigInt } = getCurrencyHelpersCached(currency);
  const amount = useAddExpenseStore((s) => s.amount);
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const splitShares = useAddExpenseStore((s) => s.splitShares);
  const { setSplitShare } = useAddExpenseStore((s) => s.actions);

  const { fmtSummartyText, splitType, isBoolean, isCurrency } = props;

  const selectAll = useCallback(() => {
    participants.forEach((p) => {
      setSplitShare(splitType, p.id, allSelected ? 0n : 1n);
    });
  }, [participants, setSplitShare, splitType, allSelected]);

  const onToggleBoolean = useCallback(
    (userId: number) => {
      setSplitShare(splitType, userId, 0n === splitShares[userId]?.[splitType] ? 1n : 0n);
    },
    [setSplitShare, splitType, splitShares],
  );

  const onChangeInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>, userId: number) => {
      const { value } = e.target;

      setSplitShare(
        splitType,
        userId,
        value === undefined || '' === value
          ? 0n
          : BigMath.abs(toSafeBigInt(isCurrency ? value : parseFloat(value))),
      );
    },
    [setSplitShare, splitType, toSafeBigInt, isCurrency],
  );

  return (
    <div className="mt-4 flex flex-col px-1">
      {isBoolean && (
        <Button
          variant="outline"
          className="bg-foreground/7 text-foreground/60 mx-auto mb-2 h-8 w-fit gap-2 rounded-full border-none px-3 py-2"
          onClick={selectAll}
        >
          {allSelected ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          <span className="text-sm">{t('actors.all')}</span>
        </Button>
      )}
      {participants.map((p) => (
        <ParticipantRow
          key={p.id}
          p={p}
          share={splitShares[p.id]?.[splitType]}
          currency={currency}
          onToggleBoolean={onToggleBoolean}
          onChangeInput={onChangeInput}
          {...props}
        />
      ))}
      <div className="flex items-center justify-between pt-3">
        <p className="text-foreground/45 text-[13px]">
          {t('expense_details.add_expense_details.split_type_section.total_split')}
        </p>
        <p
          className={cn(
            canSplitScreenClosed ? 'text-positive' : 'text-negative',
            'wrap-break-words text-[14px] font-semibold tabular-nums',
          )}
        >
          {fmtSummartyText(amount, totalShares, toUIString)}
        </p>
      </div>
    </div>
  );
};

const ParticipantRow = ({
  p,
  prefix,
  isBoolean,
  isCurrency,
  share,
  currency,
  onToggleBoolean,
  onChangeInput,
  splitType,
  fmtShareText,
  step,
}: {
  p: Participant;
  share?: bigint;
  currency: CurrencyCode;
  onToggleBoolean: (userId: number) => void;
  onChangeInput: (e: ChangeEvent<HTMLInputElement>, userId: number) => void;
} & SplitSectionProps) => {
  const { setSplitShare } = useAddExpenseStore((s) => s.actions);
  const onClick = useCallback(() => {
    if (isBoolean) {
      onToggleBoolean(p.id);
    }
  }, [isBoolean, onToggleBoolean, p.id]);

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChangeInput(e, p.id);
    },
    [onChangeInput, p.id],
  );

  const { getCurrencyHelpersCached } = useTranslationWithUtils();

  const [shareStr, setShareStr] = React.useState(
    getCurrencyHelpersCached(currency).toUIString(share ?? 0n),
  );

  const onCurrencyInputValueChange = React.useCallback(
    ({ strValue, bigIntValue }: { strValue?: string; bigIntValue?: bigint }) => {
      if (strValue !== undefined) {
        setShareStr(strValue);
      }
      if (bigIntValue !== undefined) {
        setSplitShare(splitType, p.id, bigIntValue);
      }
    },
    [p.id, setSplitShare, splitType],
  );

  return (
    <div
      key={p.id}
      className={clsx(
        'border-foreground/7 flex items-center justify-between border-b py-3',
        isBoolean && 'cursor-pointer active:opacity-55',
      )}
      onClick={onClick}
    >
      <UserAndAmount user={p} currency={currency} />
      {isBoolean ? (
        0n !== share ? (
          <Check className="text-primary h-5 w-5" />
        ) : null
      ) : isCurrency ? (
        <div className="flex w-1/2 items-center gap-1">
          <CurrencyInput
            strValue={shareStr}
            currency={currency}
            className="ml-2 border-0 bg-transparent text-right text-[15px] font-semibold tabular-nums shadow-none focus-visible:ring-0"
            onValueChange={onCurrencyInputValueChange}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <p className="text-xs">{prefix}</p>
          <Input
            type="number"
            defaultValue={share ? fmtShareText(share) : ''}
            inputMode="decimal"
            className="bg-foreground/5 ml-2 w-20 rounded-[10px] text-right text-[15px] font-semibold tabular-nums"
            placeholder="0"
            min={0}
            step={step ?? 0.01}
            onChange={onInputChange}
          />
        </div>
      )}
    </div>
  );
};

export const UserAndAmount: React.FC<{ user: Participant; currency: CurrencyCode }> = ({
  user,
  currency,
}) => {
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const paidBy = useAddExpenseStore((s) => s.paidBy);
  const amount = useAddExpenseStore((s) => s.amount);
  const currentUser = useAddExpenseStore((s) => s.currentUser);

  const { getCurrencyHelpersCached, displayName } = useTranslationWithUtils();
  const { toUIString } = getCurrencyHelpersCached(currency);

  const shareAmount = paidBy?.id === user.id ? (user.amount ?? 0n) - amount : user.amount;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <EntityAvatar entity={user} size={34} />
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-[14.5px] font-medium">{displayName(user, currentUser?.id)}</p>
        <p
          className={cn(
            canSplitScreenClosed || 'hidden',
            'text-foreground/40 max-w-24 truncate text-[12px] tabular-nums',
          )}
        >
          {paidBy && 0n < (shareAmount ?? 0n) ? '-' : ''} {toUIString(shareAmount)}
        </p>
      </div>
    </div>
  );
};
