import { Check } from 'lucide-react';
import React, { useCallback } from 'react';
import { AppDrawer } from '~/components/ui/drawer';
import { cn } from '~/lib/utils';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command';

export const GeneralPicker: React.FC<{
  className?: string;
  trigger: React.ReactNode;
  onSelect: (value: string) => void;
  items: any[];
  extractValue: (item: any) => string;
  extractKey: (item: any) => string;
  extractKeywords?: (item: any) => string[];
  selected: (item: any) => boolean;
  render: (item: any) => React.ReactNode;
  placeholderText: string;
  noOptionsText: string;
  title: string;
}> = ({
  className,
  trigger,
  onSelect,
  items,
  extractValue,
  extractKey,
  extractKeywords,
  render,
  placeholderText,
  noOptionsText,
  title,
  selected,
}) => {
  const [open, setOpen] = React.useState(false);

  const onSelectAndClose: typeof onSelect = useCallback(
    (value) => {
      setOpen(false);
      onSelect(value);
    },
    [onSelect],
  );

  return (
    <AppDrawer
      trigger={trigger}
      title={title}
      open={open}
      onOpenChange={setOpen}
      className={cn('h-[70vh]', className)}
      shouldCloseOnAction
    >
      <Command className="h-[50vh] bg-transparent">
        <CommandInput
          wrapperClassName="bg-foreground/5 rounded-[13px] border-b-0 px-[15px] py-[11px]"
          className="h-auto p-0 text-[14px]"
          placeholder={placeholderText}
        />
        <CommandList>
          <CommandEmpty>{noOptionsText}</CommandEmpty>
          {items.map((item) => (
            <CommandItem
              key={extractKey(item)}
              value={extractValue(item)}
              keywords={extractKeywords ? extractKeywords(item) : []}
              onSelect={onSelectAndClose}
              className="border-foreground/6 flex cursor-pointer items-center border-b px-1 py-[13px] active:opacity-55"
            >
              <Check
                className={cn(
                  'text-primary order-2 ml-auto h-4 w-4',
                  selected(item) ? 'opacity-100' : 'opacity-0',
                )}
              />
              <div className="min-w-0 flex-1">{render(item)}</div>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </AppDrawer>
  );
};
