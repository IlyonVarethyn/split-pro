import { ChevronLeftIcon, Pencil } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { DefaultSplitSettings } from '~/components/DefaultSplit/DefaultSplitSettings';
import { ExpenseList } from '~/components/Expense/ExpenseList';
import { DeleteFriend } from '~/components/Friend/DeleteFriend';
import { Export } from '~/components/Friend/Export';
import { SettleUp } from '~/components/Friend/Settleup';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { type GetServerSideProps } from 'next';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { CumulatedBalances } from '~/components/Expense/CumulatedBalances';
import { deserializeDefaultSplit } from '~/lib/defaultSplit';

const FriendPage: NextPageWithUser = ({ user }) => {
  const { t, displayName } = useTranslationWithUtils();
  const router = useRouter();
  const { friendId } = router.query;

  const _friendId = parseInt(Array.isArray(friendId) ? (friendId[0] ?? '') : (friendId ?? ''));

  const friendQuery = api.user.getFriend.useQuery(
    { friendId: _friendId },
    { enabled: Boolean(_friendId) },
  );

  const expenses = api.expense.getExpensesWithFriend.useQuery(
    { friendId: _friendId },
    { enabled: Boolean(_friendId) },
  );
  const balances = api.user.getBalancesWithFriend.useQuery(
    { friendId: _friendId },
    { enabled: Boolean(_friendId) },
  );
  const upsertFriendDefaultSplitMutation = api.user.upsertFriendDefaultSplit.useMutation();
  const clearFriendDefaultSplitMutation = api.user.clearFriendDefaultSplit.useMutation();

  // Aggregate balances by currency for CumulatedBalances display
  const aggregatedBalances = useMemo(() => {
    if (!balances.data) {
      return undefined;
    }

    const currencyMap = new Map<string, bigint>();
    for (const b of balances.data) {
      const current = currencyMap.get(b.currency) ?? 0n;
      currencyMap.set(b.currency, current + b.amount);
    }

    return Array.from(currencyMap.entries())
      .filter(([, amount]) => 0n !== amount)
      .map(([currency, amount]) => ({ currency, amount }));
  }, [balances.data]);

  return (
    <>
      <Head>
        <title>
          {displayName(friendQuery.data)} | {t('ui.outstanding_balances')}
        </title>
      </Head>
      <MainLayout
        title={
          <div className="flex w-full items-center gap-3">
            <Link
              href="/balances"
              className="bg-foreground/6 flex size-9 shrink-0 items-center justify-center rounded-full active:scale-[.9]"
            >
              <ChevronLeftIcon className="text-foreground/70 size-5" />
            </Link>
            <EntityAvatar entity={friendQuery.data} size={34} />
            <p className="min-w-0 flex-1 truncate text-[21px] font-bold">
              {displayName(friendQuery.data)}
            </p>
            <AppDrawer
              title={t('balances.user_preferences.title')}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!friendQuery.data}
                  className="bg-foreground/6 size-9 shrink-0 rounded-full p-0 active:scale-[.9]"
                >
                  <Pencil className="text-foreground/50 size-3.5" />
                </Button>
              }
            >
              {!friendQuery.data ? null : (
                <div>
                  <p className="font-semibold">{t('group_details.group_info.default_split')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <DefaultSplitSettings
                      participants={[
                        {
                          ...user,
                          emailVerified: null,
                          name: user.name ?? null,
                          email: user.email ?? null,
                          image: user.image ?? null,
                          obapiProviderId: user.obapiProviderId ?? null,
                          bankingId: user.bankingId ?? null,
                          preferredLanguage: user.preferredLanguage ?? '',
                          hiddenFriendIds: user.hiddenFriendIds ?? [],
                          currency: user.currency ?? 'USD',
                          defaultCurrency: user.defaultCurrency ?? null,
                        },
                        friendQuery.data,
                      ]}
                      defaultSplit={friendQuery.data.defaultSplit}
                      triggerLabel={t('group_details.group_info.configure_default_split')}
                      onSave={(defaultSplit) => {
                        upsertFriendDefaultSplitMutation.mutate(
                          {
                            friendId: friendQuery.data!.id,
                            defaultSplit,
                          },
                          {
                            onSuccess: () => {
                              toast.success(t('balances.default_split.updated'));
                              void friendQuery.refetch();
                            },
                            onError: () => {
                              toast.error(t('errors.setting_update_failed'));
                            },
                          },
                        );
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={
                        !deserializeDefaultSplit(friendQuery.data.defaultSplit) ||
                        clearFriendDefaultSplitMutation.isPending
                      }
                      onClick={() => {
                        clearFriendDefaultSplitMutation.mutate(
                          { friendId: friendQuery.data!.id },
                          {
                            onSuccess: () => {
                              toast.success(t('balances.default_split.cleared'));
                              void friendQuery.refetch();
                            },
                            onError: () => {
                              toast.error(t('errors.setting_update_failed'));
                            },
                          },
                        );
                      }}
                    >
                      {t('expense_details.clear')}
                    </Button>
                  </div>
                </div>
              )}
            </AppDrawer>
            <DeleteFriend friendId={_friendId} disabled={!(0 === balances.data?.length)} />
          </div>
        }
        loading={balances.isPending || expenses.isPending || friendQuery.isPending}
      >
        {!friendQuery.data ? null : (
          <div className="mb-28 transition-discrete starting:opacity-0">
            <CumulatedBalances
              entityId={friendQuery.data.id}
              balances={aggregatedBalances}
              name={displayName(friendQuery.data)}
            />
            <div className="mt-[18px] mb-5 flex items-stretch gap-[10px]">
              <SettleUp balances={balances.data} friend={friendQuery.data}>
                <Button
                  className="bg-primary text-primary-foreground w-full flex-1 rounded-[14px] py-[13px] text-[14.5px] font-bold active:scale-[.97] disabled:opacity-40"
                  disabled={!balances.data?.length}
                >
                  {t('actions.settle_up')}
                </Button>
              </SettleUp>
              <Link href={`/add?friendId=${friendQuery.data.id}`} className="flex-1">
                <Button
                  variant="secondary"
                  className="bg-foreground/8 w-full rounded-[14px] py-[13px] text-[14.5px] font-semibold active:scale-[.97]"
                >
                  {t('actions.add_expense')}
                </Button>
              </Link>
              <Export
                expenses={expenses.data}
                fileName={`expenses_with_${displayName(friendQuery.data)}`}
                currentUserId={user.id}
                friendName={displayName(friendQuery.data) ?? ''}
                friendId={friendQuery.data?.id ?? ''}
                disabled={!expenses.data || 0 === expenses.data.length}
              />
            </div>
            <ExpenseList
              expenses={expenses.data}
              contactId={_friendId}
              isLoading={expenses.isPending}
              userId={user.id}
            />
          </div>
        )}
      </MainLayout>
    </>
  );
};

FriendPage.auth = true;

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    ...(await customServerSideTranslations(context.locale, ['common'])),
  },
});

export default FriendPage;
