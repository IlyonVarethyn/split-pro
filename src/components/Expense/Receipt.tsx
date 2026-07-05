import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'next-i18next';

import { AppDrawer } from '../ui/drawer';

export const Receipt = ({ fileKey }: { fileKey: string }) => {
  const { t } = useTranslation();
  const thumbKey = fileKey.replace('.webp', '-thumb.webp');
  const thumbUrl = `/api/files/${thumbKey}`;
  const fullUrl = `/api/files/${fileKey}`;

  return (
    <AppDrawer
      trigger={
        <div className="bg-foreground/4 flex w-full items-center gap-3 rounded-[14px] p-3 text-left active:opacity-55">
          {/* oxlint-disable-next-line next/no-img-element */}
          <img
            src={thumbUrl}
            alt={t('expense_details.add_expense_details.upload_file.receipt_label')}
            width={44}
            height={56}
            data-loaded="false"
            onLoad={setDataLoaded}
            className="bg-foreground/8 h-14 w-11 shrink-0 rounded-[8px] object-cover object-center data-[loaded=false]:animate-pulse"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium">
              {t('expense_details.add_expense_details.upload_file.receipt_attached')}
            </p>
            <p className="text-foreground/40 mt-0.5 text-[11.5px]">
              {t('expense_details.add_expense_details.upload_file.receipt_hint')}
            </p>
          </div>
          <ChevronRight className="text-foreground/25 size-3.5 shrink-0" />
        </div>
      }
      leftAction={t('actions.close')}
      title={t('expense_details.add_expense_details.upload_file.receipt_label')}
      className="h-[98vh]"
    >
      <div className="mb-8 overflow-scroll">
        {/* oxlint-disable-next-line next/no-img-element */}
        <img
          src={fullUrl}
          width={300}
          height={800}
          alt={t('expense_details.add_expense_details.upload_file.receipt_label')}
          data-loaded="false"
          onLoad={setDataLoaded}
          className="h-full w-full rounded-2xl object-cover data-[loaded=false]:animate-pulse data-[loaded=false]:bg-gray-100/10"
        />
      </div>
    </AppDrawer>
  );
};

const setDataLoaded = (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.setAttribute('data-loaded', 'true');
};
