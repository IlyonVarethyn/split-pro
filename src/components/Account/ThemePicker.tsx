import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'next-i18next';
import React, { useCallback } from 'react';
import { Button } from '~/components/ui/button';
import { AppDrawer, AppDrawerClose } from '~/components/ui/drawer';

const THEME_OPTIONS = [
  { value: 'light', Icon: Sun, labelKey: 'account.theme_details.light' },
  { value: 'dark', Icon: Moon, labelKey: 'account.theme_details.dark' },
  { value: 'system', Icon: Monitor, labelKey: 'account.theme_details.system' },
] as const;

export const ThemePicker: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const getSelectHandler = useCallback((value: string) => () => setTheme(value), [setTheme]);

  return (
    <AppDrawer trigger={children} title={t('account.theme_details.title')} shouldCloseOnAction>
      <div className="divide-foreground/8 mt-2 flex flex-col divide-y">
        {THEME_OPTIONS.map(({ value, Icon, labelKey }) => (
          <AppDrawerClose key={value} asChild>
            <Button
              variant="ghost"
              className="flex w-full items-center justify-between px-0 py-3.5"
              onClick={getSelectHandler(value)}
            >
              <div className="flex items-center gap-3">
                <Icon className="text-foreground/50 size-5" />
                {t(labelKey)}
              </div>
              {theme === value ? <Check className="text-primary size-4" /> : null}
            </Button>
          </AppDrawerClose>
        ))}
      </div>
    </AppDrawer>
  );
};
