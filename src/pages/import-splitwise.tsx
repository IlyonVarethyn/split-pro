import { DownloadCloud, UploadCloud } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';
import { cn } from '~/lib/utils';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Separator } from '~/components/ui/separator';
import { LoadingSpinner } from '~/components/ui/spinner';
import { type NextPageWithUser, type SplitwiseGroup, type SplitwiseUser } from '~/types';
import { api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';

const ImportSpliwisePage: NextPageWithUser = () => {
  const { t } = useTranslation();
  const [usersWithBalance, setUsersWithBalance] = useState<SplitwiseUser[]>([]);
  const [groups, setGroups] = useState<SplitwiseGroup[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const router = useRouter();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;

    const file = files?.[0];

    if (!file) {
      return;
    }

    setUploadedFile(file);

    try {
      const json = JSON.parse(await file.text()) as Record<string, unknown>;
      const friendsWithOutStandingBalance: SplitwiseUser[] = [];
      for (const friend of json.friends as Record<string, unknown>[]) {
        const balance = friend.balance as { currency_code: string; amount: string }[];
        if (balance.length && 'confirmed' === friend.registration_status) {
          friendsWithOutStandingBalance.push(friend as unknown as SplitwiseUser);
        }
      }

      setUsersWithBalance(friendsWithOutStandingBalance);
      setSelectedUsers(
        friendsWithOutStandingBalance.reduce<Record<string, boolean>>((acc, user) => {
          acc[user.id] = true;
          return acc;
        }, {}),
      );

      const _groups = (json.groups as SplitwiseGroup[]).filter(
        (g) => 0 < g.members.length && 0 !== g.id,
      );

      setGroups(_groups);
      setSelectedGroups(
        _groups.reduce<Record<string, boolean>>((acc, group) => {
          acc[group.id] = true;
          return acc;
        }, {}),
      );
    } catch (e) {
      console.error(e);
      toast.error(t('errors.import_failed'));
    }
  };

  const importMutation = api.user.importUsersFromSplitWise.useMutation();

  function onImport() {
    importMutation.mutate(
      {
        usersWithBalance: usersWithBalance.filter((user) => selectedUsers[user.id]),
        groups: groups.filter((group) => selectedGroups[group.id]),
      },
      {
        onSuccess: () => {
          toast.success(t('account.import_from_splitwise_details.messages.import_success'));
          router.push('/balances').catch((err) => console.error(err));
        },
      },
    );
  }

  return (
    <>
      <Head>
        <title>{t('account.import_from_splitwise')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout hideAppBar>
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Link href="/balances">
              <Button variant="ghost" className="text-primary px-0 py-0" size="sm">
                {t('actions.cancel')}
              </Button>
            </Link>
          </div>
          <div className="font-medium">{t('account.import_from_splitwise')}</div>
          <div className="flex gap-4">
            <Button
              onClick={onImport}
              variant="ghost"
              className="text-primary px-0 py-0"
              size="sm"
              disabled={importMutation.isPending || !uploadedFile}
            >
              {t('actions.import')}
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <div className="bg-foreground/5 flex items-center gap-3.5 rounded-[16px] px-[17px] py-[15px]">
            <div
              className={cn(
                'flex size-6.5 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold',
                uploadedFile
                  ? 'bg-foreground/12 text-foreground/55'
                  : 'bg-primary text-primary-foreground',
              )}
            >
              1
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={cn('text-sm', uploadedFile ? 'text-foreground/55' : 'text-foreground')}
              >
                {t('account.import_from_splitwise_details.follow_to_export_splitwise_data')}
              </div>
              {!uploadedFile && (
                <Link
                  href="https://export-splitwise.vercel.app/"
                  target="_blank"
                  className="text-primary mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-semibold underline-offset-2 active:opacity-60"
                >
                  <DownloadCloud className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {t('account.import_from_splitwise_details.export_splitwise_data_button')}
                </Link>
              )}
            </div>
          </div>
          <div className="bg-foreground/5 flex items-center gap-3.5 rounded-[16px] px-[17px] py-[15px]">
            <div
              className={cn(
                'flex size-6.5 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold',
                uploadedFile
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-foreground/12 text-foreground/55',
              )}
            >
              2
            </div>
            <div className={cn('text-sm', uploadedFile ? 'text-foreground' : 'text-foreground/55')}>
              {t('account.import_from_splitwise_details.choose_file')}
            </div>
          </div>
        </div>

        <label
          htmlFor="splitwise-json"
          className="border-foreground/18 mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-[16px] border-[1.5px] border-dashed py-7 active:opacity-80"
        >
          <UploadCloud className="text-foreground/45 h-6 w-6" strokeWidth={1.8} />
          <p className="text-foreground/50 text-[13.5px]">
            {uploadedFile
              ? uploadedFile.name
              : t('account.import_from_splitwise_details.no_file_chosen')}
          </p>
          <Input
            onChange={handleFileChange}
            id="splitwise-json"
            type="file"
            accept=".json"
            className="hidden"
          />
        </label>

        <Button
          onClick={onImport}
          disabled={!uploadedFile || importMutation.isPending}
          className="bg-primary text-primary-foreground mt-4 w-full rounded-[14px] py-3.5 text-[15px] font-bold active:scale-[.98] disabled:opacity-40"
        >
          {importMutation.isPending ? <LoadingSpinner /> : t('actions.import')}
        </Button>

        <div className="text-foreground/45 mt-4 text-sm">
          {t('account.import_from_splitwise_details.note')}
        </div>

        {uploadedFile ? (
          <>
            <div className="mt-8 font-semibold">
              {t('actors.friends')} ({usersWithBalance.length})
            </div>
            {usersWithBalance.length ? (
              <div className="mt-4 flex flex-col gap-3">
                {usersWithBalance.map((user, index) => (
                  <div key={user.id} className="">
                    <div key={user.id} className="flex items-center justify-between gap-4">
                      <div className="flex shrink-0 items-center gap-2">
                        <Checkbox
                          checked={selectedUsers[user.id]}
                          onCheckedChange={(checked) => {
                            setSelectedUsers({ ...selectedUsers, [user.id]: checked });
                          }}
                        />
                        <div className="flex">
                          <p>
                            {user.first_name}
                            {user.last_name ? ` ${user.last_name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {user.balance.map((b, index) => (
                          <span
                            key={b.currency_code}
                            className={`text-sm ${0 < Number(b.amount) ? 'text-green-500' : 'text-orange-600'}`}
                          >
                            {b.currency_code} {Math.abs(Number(b.amount)).toFixed(2)}
                            <span className="text-xs text-gray-300">
                              {index !== user.balance.length - 1 ? ' + ' : ''}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3">
                      {index !== usersWithBalance.length - 1 ? <Separator /> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-8 font-semibold">
              {t('actors.groups')} ({groups.length})
            </div>
            {groups.length ? (
              <div className="mt-4 flex flex-col gap-3">
                {groups.map((group, index) => (
                  <div key={group.id}>
                    <div className="flex justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedGroups[group.id]}
                          onCheckedChange={(checked) => {
                            setSelectedGroups({ ...selectedGroups, [group.id]: checked });
                          }}
                        />
                        <div className="flex">
                          <p>{group.name}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {group.members.length} {t('actors.members')}
                      </div>
                    </div>
                    {index !== groups.length - 1 ? <Separator className="mt-3" /> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </MainLayout>
    </>
  );
};

ImportSpliwisePage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default ImportSpliwisePage;
