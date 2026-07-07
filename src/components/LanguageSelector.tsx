import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Check, Globe } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { getSupportedLanguages } from '~/utils/i18n/client';
import { cn } from '~/lib/utils';

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const supportedLanguages = useMemo(getSupportedLanguages, []);

  const currentLanguage =
    supportedLanguages.find((lang) => lang.code === i18n.language) ?? supportedLanguages[0];

  const handleLanguageChange = useCallback(
    async (languageCode: string) => {
      try {
        await fetch(`/api/locale?locale=${languageCode}`);
        await router.push(router.asPath, router.asPath, {
          locale: languageCode,
          scroll: false,
        });
        setIsOpen(false);
      } catch (error) {
        console.error('Error changing language:', error);
      }
    },
    [router],
  );

  const handleToggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);

  const handleClose = useCallback(() => setIsOpen(false), []);

  const getLanguageClickHandler = useCallback(
    (languageCode: string) => () => handleLanguageChange(languageCode),
    [handleLanguageChange],
  );

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleOpen}
        className={cn(
          'text-foreground/60 hover:text-foreground/80 flex items-center gap-2',
          className,
        )}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLanguage?.name}</span>
        <span className="sm:hidden">{currentLanguage?.code.toUpperCase()}</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={handleClose} />

          {/* Dropdown */}
          <div className="bg-surface-sheet border-foreground/8 absolute top-full right-0 z-20 mt-1 min-w-[140px] rounded-[14px] border py-1 shadow-lg">
            {supportedLanguages.map((language) => (
              <button
                key={language.code}
                onClick={getLanguageClickHandler(language.code)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm active:opacity-60',
                  i18n.language === language.code
                    ? 'text-primary'
                    : 'text-foreground/70 hover:text-foreground',
                )}
              >
                {language.name}
                {i18n.language === language.code && <Check className="size-4 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
