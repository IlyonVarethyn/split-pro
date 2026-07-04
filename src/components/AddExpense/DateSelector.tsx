import { isToday as isDateToday, isYesterday, subDays } from 'date-fns';
import { useMemo } from 'react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { cn } from '~/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import type { DayPickerProps, Modifiers, PropsSingleRequired } from 'react-day-picker';

type DateSelectorProps = DayPickerProps &
  PropsSingleRequired & {
    popoverPortalled?: boolean;
  };

export const DateSelector: React.FC<DateSelectorProps> = ({
  popoverPortalled = true,
  ...calendarProps
}) => {
  const { t, toUIDate } = useTranslationWithUtils();

  const quickDates = useMemo(() => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    return [
      {
        key: 'today',
        label: t('ui.today'),
        date: today,
        active: !!calendarProps.selected && isDateToday(calendarProps.selected),
      },
      {
        key: 'yesterday',
        label: t('ui.yesterday'),
        date: yesterday,
        active: !!calendarProps.selected && isYesterday(calendarProps.selected),
      },
    ];
  }, [t, calendarProps.selected]);

  const pickQuickDate = (date: Date) => {
    calendarProps.onSelect?.(date, date, {} as Modifiers, {} as React.MouseEvent);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'bg-foreground/7 text-foreground/70 h-auto justify-start rounded-full px-3.5 py-2 text-left text-[12.5px] font-semibold',
              !calendarProps.selected && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="text-foreground/45 mr-1.5 size-4" />
            {calendarProps.selected ? (
              toUIDate(calendarProps.selected, { useToday: true })
            ) : (
              <span>{t('expense_details.add_expense_details.pick_a_date')}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="bg-surface-sheet border-foreground/8 w-auto rounded-[16px] p-2"
          portalled={popoverPortalled}
        >
          <div className="flex gap-2 px-1 pt-1 pb-2">
            {quickDates.map((quickDate) => (
              <button
                key={quickDate.key}
                type="button"
                onClick={() => pickQuickDate(quickDate.date)}
                className={cn(
                  'rounded-full px-4 py-[9px] text-[13px] font-semibold active:scale-95',
                  quickDate.active
                    ? 'bg-primary/16 text-primary'
                    : 'bg-foreground/7 text-foreground/70',
                )}
              >
                {quickDate.label}
              </button>
            ))}
          </div>
          <Calendar
            fixedWeeks
            {...calendarProps}
            disabled={calendarProps.disabled ?? { after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
