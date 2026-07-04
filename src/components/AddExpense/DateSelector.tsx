import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { cn } from '~/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import type { DayPickerProps, PropsSingleRequired } from 'react-day-picker';

type DateSelectorProps = DayPickerProps &
  PropsSingleRequired & {
    popoverPortalled?: boolean;
  };

export const DateSelector: React.FC<DateSelectorProps> = ({
  popoverPortalled = true,
  ...calendarProps
}) => {
  const { t, toUIDate } = useTranslationWithUtils();

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
