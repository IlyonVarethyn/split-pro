import { CATEGORIES } from '~/lib/category';
import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';

import { cn } from '~/lib/utils';
import { CategoryIcon } from '../ui/categoryIcons';
import { AppDrawer, AppDrawerClose } from '../ui/drawer';

export const CategoryPicker: React.FC<{
  category: string;
  onCategoryPick: (category: string) => void;
}> = ({ category, onCategoryPick }) => {
  const { t } = useTranslation('categories');

  const trigger = useMemo(
    () => (
      <div className="bg-foreground/7 text-foreground/70 flex cursor-pointer items-center justify-center rounded-full px-3.5 py-2 text-[12.5px] font-semibold">
        <CategoryIcon category={category} size={16} />
      </div>
    ),
    [category],
  );

  const categoryOptions = useMemo(
    () =>
      Object.entries(CATEGORIES).flatMap(([categoryName, categoryItems]) =>
        categoryItems.map((key: string) => ({
          id: 'other' === key ? categoryName : key,
          label: t(`categories_list.${categoryName}.items.${key}`, { ns: 'categories' }),
        })),
      ),
    [t],
  );

  return (
    <AppDrawer trigger={trigger} title={t('title')} className="h-[70vh]" shouldCloseOnAction>
      <div className="flex flex-wrap gap-2">
        {categoryOptions.map((option) => (
          <AppDrawerClose key={option.id} asChild>
            <button
              type="button"
              className={cn(
                'rounded-full px-4 py-2.5 text-[13px] font-semibold active:scale-95',
                option.id === category
                  ? 'bg-primary/16 text-primary'
                  : 'bg-foreground/7 text-foreground/70',
              )}
              onClick={() => onCategoryPick(option.id)}
            >
              {option.label}
            </button>
          </AppDrawerClose>
        ))}
      </div>
    </AppDrawer>
  );
};
