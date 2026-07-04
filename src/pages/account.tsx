import Head from 'next/head';
import { signOut } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { useTheme } from 'next-themes';
import { type GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AccountButton } from '~/components/Account/AccountButton';
import { SimpleConfirmationDialog } from '~/components/SimpleConfirmationDialog';
import { DownloadAppDrawer } from '~/components/Account/DownloadAppDrawer';
import { LanguagePicker } from '~/components/Account/LanguagePicker';
import { ThemePicker } from '~/components/Account/ThemePicker';
import { SubmitFeedback } from '~/components/Account/SubmitFeedback';
import { SubscribeNotification } from '~/components/Account/SubscribeNotification';
import { UpdateDetails } from '~/components/Account/UpdateDetails';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { env } from '~/env';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { BankConnection } from '~/components/Account/BankAccount/BankConnection';
import { bigIntReplacer } from '~/utils/numbers';
import {
  isBankConnectionConfigured,
  whichBankConnectionConfigured,
} from '~/server/bankTransactionHelper';
import { api } from '~/utils/api';
import type { NextPageWithUser } from '~/types';
import { DebugInfo } from '~/components/Account/DebugInfo';
import { useAppStore } from '~/store/appStore';
import { getSupportedLanguages } from '~/utils/i18n/client';

const AccountSection: React.FC<React.PropsWithChildren<{ title: string }>> = ({
  title,
  children,
}) => (
  <section className="mt-8">
    <div className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-[.06em] uppercase">
      {title}
    </div>
    <div className="flex flex-col">{children}</div>
  </section>
);

const AccountPage: NextPageWithUser<{
  feedbackPossible: boolean;
  bankConnectionEnabled: boolean;
  bankConnection: string;
  maxUploadFileSizeMB: number;
}> = ({ feedbackPossible, bankConnectionEnabled, bankConnection, maxUploadFileSizeMB }) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const userQuery = api.user.me.useQuery();
  const downloadQuery = api.user.downloadData.useMutation();
  const updateDetailsMutation = api.user.updateUserDetail.useMutation();
  const { setMaxUploadFileSizeMB } = useAppStore((s) => s.actions);
  const supportedLanguages = useMemo(getSupportedLanguages, []);

  useEffect(() => {
    setMaxUploadFileSizeMB(maxUploadFileSizeMB);
  }, [maxUploadFileSizeMB, setMaxUploadFileSizeMB]);

  const [downloading, setDownloading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const downloadData = useCallback(async () => {
    setDownloading(true);
    try {
      const data = await downloadQuery.mutateAsync();
      const blob = new Blob([JSON.stringify(data, bigIntReplacer, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'splitpro_data.json';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }, [downloadQuery]);

  const utils = api.useUtils();

  const onNameUpdate = useCallback(
    async (values: { name: string; image?: string | null; defaultCurrency?: string | null }) => {
      try {
        await updateDetailsMutation.mutateAsync(values);
        toast.success(t('account.messages.submit_success'), { duration: 1500 });
        utils.user.me.refetch().catch(console.error);
      } catch (error) {
        toast.error(t('account.messages.submit_error'));
        console.error(error);
      }
    },
    [updateDetailsMutation, utils.user.me, t],
  );

  const onSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut({ redirect: false });
      void router.push('/auth/signin', '/auth/signin', { locale: 'default' });
    } finally {
      setSigningOut(false);
    }
  }, [router]);

  const currentLanguage =
    supportedLanguages.find((language) => language.code === i18n.language)?.name ?? i18n.language;
  const themeLabel =
    'light' === theme
      ? t('account.theme_details.light')
      : 'dark' === theme
        ? t('account.theme_details.dark')
        : t('account.theme_details.system');
  const bankConnectionValue = bankConnectionEnabled
    ? userQuery.data?.bankingId
      ? 'GOCARDLESS' === bankConnection
        ? 'GoCardless'
        : 'PLAID' === bankConnection
          ? 'Plaid'
          : t('actions.reconnect')
      : t('actions.connect')
    : null;

  return (
    <>
      <Head>
        <title>{t('account.title')}</title>
      </Head>
      <MainLayout title={t('account.title')}>
        <div className="flex items-start justify-between gap-4 pb-6">
          <div className="flex min-w-0 items-center gap-4">
            <EntityAvatar entity={userQuery.data} size={60} />
            <div className="min-w-0">
              <div className="truncate text-[19px] font-bold">{userQuery.data?.name}</div>
              <div className="text-foreground/40 truncate text-[13px]">{userQuery.data?.email}</div>
            </div>
          </div>
          {!userQuery.isPending ? (
            <UpdateDetails
              defaultName={userQuery.data?.name ?? ''}
              defaultImage={userQuery.data?.image}
              defaultCurrency={userQuery.data?.defaultCurrency}
              onNameSubmit={onNameUpdate}
            />
          ) : null}
        </div>

        <AccountSection title={t('account.sections.preferences')}>
          <LanguagePicker>
            <AccountButton label={t('account.change_language')} value={currentLanguage} />
          </LanguagePicker>

          <ThemePicker>
            <AccountButton label={t('account.theme')} value={themeLabel} />
          </ThemePicker>

          <SubscribeNotification />

          <BankConnection
            bankConnectionEnabled={bankConnectionEnabled}
            bankConnection={bankConnection}
          >
            <AccountButton label={t('account.bank_connection')} value={bankConnectionValue ?? ''} />
          </BankConnection>
        </AccountSection>

        <AccountSection title={t('account.sections.data_tools')}>
          <AccountButton
            href="/import-splitwise"
            label={t('account.import_from_splitwise')}
            value={t('actions.import')}
          />

          <AccountButton
            onClick={downloadData}
            disabled={downloading}
            loading={downloading}
            label={t('account.download_splitpro_data')}
            value={t('actions.export')}
          />

          <DownloadAppDrawer>
            <AccountButton label={t('account.download_app')} value={t('actions.open')} />
          </DownloadAppDrawer>

          <DebugInfo>
            <AccountButton label={t('account.debug_info')} value={t('actions.open')} />
          </DebugInfo>
        </AccountSection>

        <AccountSection title={t('account.sections.open_source')}>
          <AccountButton
            href="https://github.com/oss-apps/split-pro"
            label={t('account.star_on_github')}
            value="GitHub"
          />

          <AccountButton
            href="https://github.com/sponsors/krokosik"
            label={t('account.support_us')}
            value="Sponsor"
          />

          <AccountButton
            href="https://www.producthunt.com/products/splitpro/reviews/new"
            label={t('account.write_review')}
            value="Review"
          />

          {feedbackPossible ? <SubmitFeedback /> : null}
        </AccountSection>

        <div className="mt-8 flex justify-center">
          <SimpleConfirmationDialog
            title={t('account.logout_confirm.title')}
            description={t('account.logout_confirm.description')}
            hasPermission
            onConfirm={onSignOut}
            loading={signingOut}
          >
            <Button
              variant="ghost"
              className="text-negative hover:text-negative/90 h-auto rounded-none px-0 py-0 text-[15px] font-semibold"
            >
              {t('account.logout')}
            </Button>
          </SimpleConfirmationDialog>
        </div>
      </MainLayout>
    </>
  );
};

AccountPage.auth = true;

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    feedbackPossible: Boolean(env.FEEDBACK_EMAIL),
    bankConnectionEnabled: Boolean(isBankConnectionConfigured()),
    bankConnection: whichBankConnectionConfigured(),
    ...(await customServerSideTranslations(context.locale, ['common', 'currencies'])),
    maxUploadFileSizeMB: env.UPLOAD_MAX_FILE_SIZE_MB,
  },
});

export default AccountPage;
