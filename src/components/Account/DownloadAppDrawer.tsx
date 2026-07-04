import { useTranslation } from 'next-i18next';
import { type ReactNode } from 'react';

import { useIsPwa } from '~/hooks/useIsPwa';
import { AppDrawer } from '../ui/drawer';

interface DownloadAppDrawerProps {
  children: ReactNode;
  className?: string;
}

const StepCard: React.FC<{ step: number; children: ReactNode }> = ({ step, children }) => (
  <div className="bg-foreground/5 flex items-center gap-3.5 rounded-[14px] px-4 py-3.5">
    <div className="bg-primary text-primary-foreground flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold">
      {step}
    </div>
    <div className="text-[14px]">{children}</div>
  </div>
);

export const DownloadAppDrawer: React.FC<DownloadAppDrawerProps> = ({ children, className }) => {
  const { t } = useTranslation();
  const isStandalone = useIsPwa();

  if (isStandalone) {
    return null;
  }

  return (
    <AppDrawer
      trigger={children}
      leftAction={t('actions.close')}
      title={t('account.download_app_details.title')}
      className={className ?? 'h-[70vh]'}
      shouldCloseOnAction
    >
      <div className="flex flex-col gap-4">
        <p className="text-foreground/50 text-[13.5px] leading-relaxed">
          {t('account.download_app_details.download_as_pwa')}
        </p>

        <StepCard step={1}>
          {t('account.download_app_details.using_ios')}{' '}
          <a
            className="text-primary underline"
            href="https://youtube.com/shorts/MQHeLOjr350"
            target="_blank"
            rel="noreferrer"
          >
            {t('account.download_app_details.video')}
          </a>
        </StepCard>

        <StepCard step={2}>
          {t('account.download_app_details.using_android')}{' '}
          <a
            className="text-primary underline"
            href="https://youtube.com/shorts/04n7oKGzgOs"
            target="_blank"
            rel="noreferrer"
          >
            {t('account.download_app_details.video')}
          </a>
        </StepCard>
      </div>
    </AppDrawer>
  );
};
