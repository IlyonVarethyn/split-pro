import cronParser from 'cron-parser';
import { Check } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import React, { useCallback, useMemo } from 'react';

import { cn } from '~/lib/utils';
import { useAddExpenseStore } from '~/store/addStore';

import { CronBuilder } from '../ui/cron-builder';
import { AppDrawer } from '../ui/drawer';

interface RecurrenceInputProps {
  children: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
}

const RECURRENCE_PRESETS = [
  { key: 'never', scheduleType: 'never', value: '' },
  { key: 'day', scheduleType: 'day', value: '0 0 * * *' },
  { key: 'week', scheduleType: 'week', value: '0 0 * * 1' },
  { key: 'month', scheduleType: 'month', value: '0 0 1 * *' },
  { key: 'year', scheduleType: 'year', value: '0 0 1 1 *' },
] as const;

export const RecurrenceInput: React.FC<RecurrenceInputProps> = ({
  children,
  value: valueProp,
  onChange: onChangeProp,
}) => {
  const { t, i18n } = useTranslation();

  // Use props if provided, otherwise fall back to store
  const storeCronExpression = useAddExpenseStore((s) => s.cronExpression);
  const storeSetCronExpression = useAddExpenseStore((s) => s.actions.setCronExpression);

  const cronExpression = valueProp ?? storeCronExpression;
  const setCronExpression = onChangeProp ?? storeSetCronExpression;
  const selectedPreset = useMemo(
    () => RECURRENCE_PRESETS.find((preset) => preset.value === cronExpression)?.key ?? 'custom',
    [cronExpression],
  );

  const nextOccurrenceLabel = useMemo(() => {
    if (!cronExpression) {
      return null;
    }
    try {
      const next = cronParser
        .parseExpression(cronExpression, { currentDate: new Date() })
        .next()
        .toDate();
      return new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(next);
    } catch {
      return null;
    }
  }, [cronExpression, i18n.language]);

  const handlePresetClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setCronExpression(event.currentTarget.dataset.value ?? '');
    },
    [setCronExpression],
  );

  return (
    <AppDrawer
      title={t('recurrence.title')}
      trigger={children}
      shouldCloseOnAction
      actionTitle={t('actions.confirm')}
      className="h-[70vh]"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="bg-foreground/5 rounded-[18px] px-[18px] py-2">
            {RECURRENCE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className="border-foreground/6 flex min-h-14 w-full items-center justify-between border-b text-left last:border-b-0 active:opacity-55"
                data-value={preset.value}
                onClick={handlePresetClick}
              >
                <span className="text-[15px] font-medium">
                  {t(`recurrence.schedule_type.${preset.scheduleType}`)}
                </span>
                <span
                  className={cn(
                    'text-primary flex h-7 w-7 items-center justify-center rounded-full transition-opacity',
                    selectedPreset === preset.key ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden
                >
                  <Check className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>

          {nextOccurrenceLabel && (
            <div className="text-foreground/35 px-1 text-[12.5px] leading-5">
              {t('recurrence.next_occurrence', { date: nextOccurrenceLabel })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-foreground/45 text-[11px] font-semibold tracking-[.14em] uppercase">
            {t('recurrence.schedule_type.custom')}
          </div>
          <div className="bg-foreground/5 rounded-[18px] px-[18px] py-4">
            <CronBuilder value={cronExpression} onChange={setCronExpression} />
          </div>
        </div>
      </div>
    </AppDrawer>
  );
};
