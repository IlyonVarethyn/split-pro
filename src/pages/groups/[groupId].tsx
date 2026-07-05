import {
  BarChartHorizontal,
  ChevronLeft,
  Info,
  PlusIcon,
  Share,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { type GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { BalanceList } from '~/components/Expense/BalanceList';
import { ExpenseList } from '~/components/Expense/ExpenseList';
import AddMembers from '~/components/group/AddMembers';
import { AvatarStack } from '~/components/group/AvatarStack';
import GroupMyBalance from '~/components/group/GroupMyBalance';
import NoMembers from '~/components/group/NoMembers';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { SimpleConfirmationDialog } from '~/components/SimpleConfirmationDialog';
import { DefaultSplitSettings } from '~/components/DefaultSplit/DefaultSplitSettings';
import { Switch } from '~/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { UpdateName } from '~/components/Account/UpdateDetails';
import { CurrencyPicker } from '~/components/AddExpense/CurrencyPicker';
import { env } from '~/env';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { deserializeDefaultSplit } from '~/lib/defaultSplit';
import { isCurrencyCode, parseCurrencyCode } from '~/lib/currency';
import { db } from '~/server/db';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';

const BalancePage: NextPageWithUser<{
  enableSendingInvites: boolean;
}> = ({ user, enableSendingInvites }) => {
  const { displayName, toUIDate, t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const router = useRouter();
  const groupId = parseInt(router.query.groupId as string);

  const setGroupDefaultCurrency = useCurrencyPreferenceStore((s) => s.setGroupDefaultCurrency);

  const groupDetailQuery = api.group.getGroupDetails.useQuery({ groupId });
  const groupTotalQuery = api.group.getGroupTotals.useQuery({ groupId });
  const expensesQuery = api.expense.getGroupExpenses.useQuery({ groupId });
  const deleteGroupMutation = api.group.delete.useMutation();
  const leaveGroupMutation = api.group.leaveGroup.useMutation();
  const toggleArchiveMutation = api.group.toggleArchive.useMutation();
  const toggleSimplifyDebtsMutation = api.group.toggleSimplifyDebts.useMutation();
  const updateGroupDetailsMutation = api.group.updateGroupDetails.useMutation();
  const upsertDefaultSplitMutation = api.group.upsertDefaultSplit.useMutation();
  const clearDefaultSplitMutation = api.group.clearDefaultSplit.useMutation();
  const inviteFriendMutation = api.user.inviteFriend.useMutation();
  const addMembersMutation = api.group.addMembers.useMutation();

  const [memberEmail, setMemberEmail] = useState('');

  const inviteMembers = useCallback(async () => {
    if (!groupDetailQuery.data) {
      return;
    }
    const inviteUrl = `/join-group?groupId=${groupDetailQuery.data.publicId}`;
    const inviteLink = `${window.location.origin}${inviteUrl}`;

    if (navigator.share) {
      navigator
        .share({
          title: `${t('invite_message.join_to')} ${groupDetailQuery.data.name} ${t('invite_message.in_splitpro')}`,
          text: t('invite_message.text'),
          url: inviteLink,
        })
        .then(() => console.info('Successful share'))
        .catch((error) => console.error('Error sharing', error));
    } else {
      await navigator.clipboard.writeText(inviteLink);
      toast.success(t('group_details.copied'), {
        action: {
          label: t('ui.preview'),
          onClick: () => router.push(inviteUrl),
        },
      });
    }
  }, [groupDetailQuery.data, t, router]);

  const isAdmin = groupDetailQuery.data?.userId === user.id;
  const isArchived = Boolean(groupDetailQuery.data?.archivedAt);
  const canDeleteOrArchive =
    groupDetailQuery.data?.userId === user.id &&
    !groupDetailQuery.data?.groupBalances.find((bal) => 0n !== bal.amount);
  const canLeave = !groupDetailQuery.data?.groupBalances.find(
    (bal) => 0n !== bal.amount && bal.userId === user.id,
  );

  const onGroupDelete = useCallback(() => {
    deleteGroupMutation.mutate(
      { groupId },
      {
        onSuccess: () => {
          router.replace('/groups').catch(console.error);
        },
        onError: (e) => {
          toast.error(t('errors.something_went_wrong'));
          console.error(e);
        },
      },
    );
  }, [groupId, deleteGroupMutation, router, t]);

  const onGroupLeave = useCallback(
    (userId?: number) => {
      leaveGroupMutation.mutate(
        { groupId, userId },
        {
          onSuccess: () => {
            if (!userId) {
              router.replace('/groups').catch(console.error);
            } else {
              groupDetailQuery.refetch().catch(console.error);
            }
          },
          onError: (e) => {
            toast.error(t('errors.something_went_wrong'));
            console.error(e);
          },
        },
      );
    },
    [groupId, leaveGroupMutation, groupDetailQuery, router, t],
  );

  const isValidMemberEmail = z.string().email().safeParse(memberEmail).success;

  const onAddMemberByEmail = useCallback(() => {
    if (!isValidMemberEmail) {
      return;
    }

    inviteFriendMutation.mutate(
      { email: memberEmail.toLowerCase(), sendInviteEmail: enableSendingInvites },
      {
        onSuccess: (addedUser) => {
          addMembersMutation.mutate(
            { groupId, userIds: [addedUser.id] },
            {
              onSuccess: () => {
                setMemberEmail('');
                void groupDetailQuery.refetch();
              },
              onError: () => {
                toast.error(t('errors.something_went_wrong'));
              },
            },
          );
        },
        onError: () => {
          toast.error(t('errors.something_went_wrong'));
        },
      },
    );
  }, [
    isValidMemberEmail,
    memberEmail,
    enableSendingInvites,
    inviteFriendMutation,
    addMembersMutation,
    groupId,
    groupDetailQuery,
    t,
  ]);

  useEffect(() => {
    if (isCurrencyCode(groupDetailQuery.data?.defaultCurrency)) {
      setGroupDefaultCurrency(groupId, groupDetailQuery.data.defaultCurrency);
    }
  }, [groupDetailQuery.data?.defaultCurrency, setGroupDefaultCurrency, groupId]);

  return (
    <>
      <Head>
        <title>
          {groupDetailQuery.data?.name} | {t('group_details.title')}
        </title>
      </Head>
      <MainLayout
        title={
          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              onClick={() => router.replace(`/groups`)}
              className="bg-foreground/6 flex size-9 shrink-0 items-center justify-center rounded-full active:scale-[.9]"
            >
              <ChevronLeft className="text-foreground/70 size-5" />
            </button>
            <p className="min-w-0 flex-1 truncate text-[21px] font-bold tracking-[-0.3px]">
              {groupDetailQuery.data?.name}
            </p>
          </div>
        }
        actions={
          <div className="flex gap-2">
            <AppDrawer
              title={t('group_details.group_statistics.title')}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-foreground/6 size-9 shrink-0 rounded-full p-0 active:scale-[.9]"
                >
                  <BarChartHorizontal className="text-foreground/50 size-[15px]" />
                </Button>
              }
              className="h-[85vh]"
            >
              <div className="flex flex-col">
                <div className="border-foreground/6 flex items-baseline justify-between border-b px-1 py-[13px]">
                  <span className="text-foreground/55 text-[14px]">
                    {t('group_details.group_statistics.total_expenses')}
                  </span>
                  <span className="text-[15px] font-bold tabular-nums">
                    {groupTotalQuery.data?.some((total) => null != total._sum.amount)
                      ? groupTotalQuery.data
                          .filter((total) => null != total._sum.amount)
                          .map((total) =>
                            getCurrencyHelpersCached(total.currency).toUIString(total._sum.amount!),
                          )
                          .join(' + ')
                      : '–'}
                  </span>
                </div>
                <div className="border-foreground/6 flex items-baseline justify-between border-b px-1 py-[13px]">
                  <span className="text-foreground/55 text-[14px]">
                    {t('group_details.group_statistics.number_of_expenses')}
                  </span>
                  <span className="text-[15px] font-bold tabular-nums">
                    {expensesQuery.data?.length ?? '–'}
                  </span>
                </div>
                <div className="border-foreground/6 flex items-baseline justify-between border-b px-1 py-[13px]">
                  <span className="text-foreground/55 text-[14px]">
                    {t('group_details.group_statistics.first_expense')}
                  </span>
                  <span className="text-[15px] font-semibold">
                    {expensesQuery.data?.length
                      ? toUIDate(expensesQuery.data[expensesQuery.data.length - 1]!.createdAt, {
                          year: true,
                        })
                      : '–'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between px-1 py-[13px]">
                  <span className="text-foreground/55 text-[14px]">
                    {t('group_details.group_info.group_created')}
                  </span>
                  <span className="text-[15px] font-semibold">
                    {groupDetailQuery.data?.createdAt
                      ? toUIDate(groupDetailQuery.data.createdAt, { year: true })
                      : '–'}
                  </span>
                </div>
              </div>
            </AppDrawer>
            <AppDrawer
              title={t('group_details.group_info.title')}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-foreground/6 size-9 shrink-0 rounded-full p-0 active:scale-[.9]"
                >
                  <Info className="text-foreground/50 size-[15px]" />
                </Button>
              }
              className="h-[85vh]"
            >
              <div className="flex flex-col">
                <div className="border-foreground/6 flex items-center justify-between border-b py-3">
                  <div className="min-w-0">
                    <div className="text-foreground/40 mb-[3px] text-[11px] tracking-[.05em] uppercase">
                      {t('account.edit_name.name_label')}
                    </div>
                    <div className="truncate text-[15.5px] font-semibold">
                      {groupDetailQuery.data?.name ?? ''}
                    </div>
                  </div>
                  <div className="bg-foreground/6 flex size-[34px] shrink-0 items-center justify-center rounded-full active:scale-[.9]">
                    <UpdateName
                      className="text-foreground/50 size-[13px]"
                      defaultName={groupDetailQuery.data?.name ?? ''}
                      defaultImage={groupDetailQuery.data?.image ?? null}
                      onNameSubmit={async (values) => {
                        try {
                          await updateGroupDetailsMutation.mutateAsync({
                            groupId,
                            name: values.name,
                            image: values.image,
                          });
                          toast.success(t('group_details.messages.group_name_updated'), {
                            duration: 1500,
                          });
                          await groupDetailQuery.refetch();
                        } catch (error) {
                          toast.error(t('errors.group_name_update_failed'));
                          console.error(error);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="border-foreground/8 flex items-center justify-between border-b py-[15px]">
                  <span className="text-[15px] font-medium">
                    {t('group_details.group_info.default_balance_currency')}
                  </span>
                  <CurrencyPicker
                    currentCurrency={
                      groupDetailQuery.data?.defaultCurrency &&
                      isCurrencyCode(groupDetailQuery.data.defaultCurrency)
                        ? parseCurrencyCode(groupDetailQuery.data.defaultCurrency)
                        : null
                    }
                    allowClear
                    onCurrencyPick={(currency) => {
                      if (!groupDetailQuery.data) {
                        return;
                      }

                      updateGroupDetailsMutation.mutate(
                        {
                          groupId,
                          name: groupDetailQuery.data.name,
                          image: groupDetailQuery.data.image,
                          defaultCurrency: currency,
                        },
                        {
                          onSuccess: () => {
                            toast.success(
                              t('group_details.messages.default_balance_currency_updated'),
                            );
                            setGroupDefaultCurrency(groupId, currency);
                            void groupDetailQuery.refetch();
                          },
                          onError: () => {
                            toast.error(t('errors.setting_update_failed'));
                          },
                        },
                      );
                    }}
                  />
                </div>

                <div className="border-foreground/8 flex items-center justify-between gap-3 border-b py-[15px]">
                  <span className="shrink-0 text-[15px] font-medium">
                    {t('group_details.group_info.default_split')}
                  </span>
                  <div className="flex min-w-0 items-center gap-2">
                    <DefaultSplitSettings
                      participants={
                        groupDetailQuery.data?.groupUsers.map((groupUser) => groupUser.user) ?? []
                      }
                      defaultSplit={groupDetailQuery.data?.defaultSplit}
                      triggerLabel={t('group_details.group_info.configure_default_split')}
                      disabled={isArchived || !groupDetailQuery.data}
                      onSave={(defaultSplit) => {
                        upsertDefaultSplitMutation.mutate(
                          { groupId, defaultSplit },
                          {
                            onSuccess: () => {
                              toast.success(t('group_details.messages.default_split_updated'));
                              void groupDetailQuery.refetch();
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
                        isArchived ||
                        !deserializeDefaultSplit(groupDetailQuery.data?.defaultSplit) ||
                        clearDefaultSplitMutation.isPending
                      }
                      onClick={() => {
                        clearDefaultSplitMutation.mutate(
                          { groupId },
                          {
                            onSuccess: () => {
                              toast.success(t('group_details.messages.default_split_cleared'));
                              void groupDetailQuery.refetch();
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

                <Label className="border-foreground/8 flex cursor-pointer items-center justify-between gap-4 border-b py-[15px]">
                  <p>
                    <span className="block text-[15px] font-medium">
                      {t('group_details.group_info.simplify_debts')}
                    </span>
                    <span className="text-foreground/40 mt-0.5 block text-[12px]">
                      {t('group_details.group_info.simplify_debts_subtitle')}
                    </span>
                  </p>
                  <Switch
                    id="simplify-debts"
                    disabled={isArchived}
                    checked={groupDetailQuery.data?.simplifyDebts ?? false}
                    onCheckedChange={() => {
                      toggleSimplifyDebtsMutation.mutate(
                        { groupId },
                        {
                          onSuccess: () => {
                            void groupDetailQuery.refetch();
                          },
                          onError: () => {
                            toast.error(t('errors.setting_update_failed'));
                          },
                        },
                      );
                    }}
                  />
                </Label>
                <Label className="border-foreground/8 flex cursor-pointer items-center justify-between gap-4 border-b py-[15px]">
                  <p>
                    <span className="block text-[15px] font-medium">
                      {t('group_details.group_info.archive_group')}
                    </span>
                    <span className="text-foreground/40 mt-0.5 block text-[12px]">
                      {t('group_details.group_info.archive_group_subtitle')}
                    </span>
                  </p>
                  <Switch
                    id="archive-group"
                    checked={groupDetailQuery.data?.archivedAt !== null}
                    onCheckedChange={() => {
                      toggleArchiveMutation.mutate(
                        { groupId },
                        {
                          onSuccess: () => {
                            void groupDetailQuery.refetch();
                          },
                          onError: (error) => {
                            toast.error(error.message);
                          },
                        },
                      );
                    }}
                  />
                </Label>
                {isAdmin ? (
                  <SimpleConfirmationDialog
                    title={
                      canDeleteOrArchive
                        ? t('group_details.group_info.delete_group_details.title')
                        : ''
                    }
                    description={
                      canDeleteOrArchive
                        ? t('group_details.group_info.delete_group_details.can_delete')
                        : t('group_details.group_info.delete_group_details.cant_delete')
                    }
                    hasPermission={canDeleteOrArchive}
                    onConfirm={onGroupDelete}
                    loading={deleteGroupMutation.isPending}
                    variant="destructive"
                  >
                    <button
                      type="button"
                      className="text-negative block w-full py-[15px] text-left text-[15px] font-medium active:opacity-60"
                    >
                      {t('group_details.group_info.delete_group')}
                    </button>
                  </SimpleConfirmationDialog>
                ) : (
                  <SimpleConfirmationDialog
                    title={canLeave ? t('group_details.group_info.leave_group_details.title') : ''}
                    description={
                      canLeave
                        ? t('group_details.group_info.leave_group_details.can_leave')
                        : t('group_details.group_info.leave_group_details.cant_leave')
                    }
                    hasPermission={canLeave}
                    onConfirm={onGroupLeave}
                    loading={leaveGroupMutation.isPending}
                    variant="destructive"
                  >
                    <button
                      type="button"
                      className="text-negative block w-full py-[15px] text-left text-[15px] font-medium active:opacity-60"
                    >
                      {t('group_details.group_info.leave_group')}
                    </button>
                  </SimpleConfirmationDialog>
                )}
              </div>
            </AppDrawer>
          </div>
        }
        loading={groupDetailQuery.isPending}
      >
        {1 === groupDetailQuery.data?.groupUsers.length && !expensesQuery.data?.length ? (
          <div className="h-[85vh]">
            <NoMembers group={groupDetailQuery.data} enableSendingInvites={enableSendingInvites} />
          </div>
        ) : (
          <div className="flex flex-col gap-[22px] transition-discrete starting:opacity-0">
            {isArchived && (
              <div className="flex justify-center gap-2 overflow-y-auto">
                <p>
                  {t('group_details.group_info.archived')} {t('ui.on')}{' '}
                  {toUIDate(groupDetailQuery.data!.archivedAt!)}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              {groupDetailQuery.data ? (
                <AvatarStack members={groupDetailQuery.data.groupUsers.map((gu) => gu.user)} />
              ) : (
                <div />
              )}
              <div className="flex shrink-0 gap-2">
                <AppDrawer
                  title={t('group_details.group_info.members')}
                  trigger={
                    <Button
                      variant="ghost"
                      className="bg-foreground/7 text-foreground/75 h-auto gap-1.5 rounded-full px-[13px] py-2 text-[12px] font-semibold active:scale-[.95]"
                    >
                      <Users className="size-[13px]" />
                      {t('group_details.group_info.members')}
                    </Button>
                  }
                  className="h-[70vh]"
                >
                  <div className="flex flex-col">
                    {groupDetailQuery.data?.groupUsers.map((groupUser) => (
                      <div
                        key={groupUser.userId}
                        className="border-foreground/6 flex items-center gap-[13px] border-b py-[11px] last:border-b-0"
                      >
                        <EntityAvatar entity={groupUser.user} size={38} />
                        <p className="min-w-0 flex-1 truncate text-[15px] font-medium">
                          {displayName(groupUser.user)}
                        </p>
                        {groupUser.userId === groupDetailQuery.data?.userId ? (
                          <span className="text-foreground/40 shrink-0 text-[12px]">
                            {t('actors.owner')}
                          </span>
                        ) : (
                          isAdmin &&
                          (() => {
                            const memberCanLeave = !groupDetailQuery.data?.groupBalances.find(
                              (b) => 0n !== b.amount && b.userId === groupUser.userId,
                            );

                            return (
                              <SimpleConfirmationDialog
                                title={
                                  memberCanLeave
                                    ? t('group_details.group_info.remove_member_details.title')
                                    : ''
                                }
                                description={
                                  memberCanLeave
                                    ? t('group_details.group_info.remove_member_details.can_remove')
                                    : t(
                                        'group_details.group_info.remove_member_details.cant_remove',
                                      )
                                }
                                hasPermission={memberCanLeave}
                                onConfirm={() => onGroupLeave(groupUser.userId)}
                                loading={leaveGroupMutation.isPending}
                                variant="destructive"
                              >
                                <button
                                  type="button"
                                  className="bg-foreground/6 flex size-[30px] shrink-0 items-center justify-center rounded-full active:scale-[.9]"
                                >
                                  <X className="text-negative size-[11px]" strokeWidth={2.5} />
                                </button>
                              </SimpleConfirmationDialog>
                            );
                          })()
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-end gap-[10px]">
                    <Input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder={t('group_details.no_members.add_members_details.placeholder')}
                      disabled={isArchived}
                      className="border-foreground/18 focus-visible:border-primary text-foreground/90 h-auto flex-1 rounded-none border-0 border-b-[1.5px] bg-transparent px-0 pb-2.5 text-[14.5px] ring-offset-0 focus-visible:ring-0"
                    />
                    <Button
                      onClick={onAddMemberByEmail}
                      disabled={
                        isArchived ||
                        !isValidMemberEmail ||
                        inviteFriendMutation.isPending ||
                        addMembersMutation.isPending
                      }
                      className="h-auto shrink-0 rounded-full px-[18px] py-[11px] text-[13.5px] font-bold active:scale-[.95] disabled:opacity-40"
                    >
                      {t('actions.add')}
                    </Button>
                  </div>
                </AppDrawer>
                <Button
                  variant="ghost"
                  onClick={inviteMembers}
                  disabled={isArchived}
                  className="bg-foreground/7 text-foreground/75 h-auto gap-1.5 rounded-full px-[13px] py-2 text-[12px] font-semibold active:scale-[.95] disabled:opacity-40"
                >
                  <Share className="size-[13px]" />
                  {t('actions.invite')}
                </Button>
              </div>
            </div>

            <GroupMyBalance
              userId={user.id}
              groupBalances={groupDetailQuery.data?.groupBalances}
              groupId={groupId}
            />

            <div className="border-foreground/8 flex justify-center gap-2 overflow-y-auto border-b pb-4">
              <Link href={`/add?groupId=${groupId}`}>
                <Button size="sm" className="w-40 gap-1 text-sm lg:w-[180px]" disabled={isArchived}>
                  <PlusIcon className="size-4" /> {t('actions.add_expense')}
                </Button>
              </Link>

              <AddMembers group={groupDetailQuery.data} enableSendingInvites={enableSendingInvites}>
                <Button size="sm" responsiveIcon variant="secondary" disabled={isArchived}>
                  <UserPlus className="size-4" /> {t('group_details.add_members')}
                </Button>
              </AddMembers>
            </div>

            <Tabs defaultValue="expenses">
              <TabsList className="mx-auto grid w-full max-w-96 grid-cols-2">
                <TabsTrigger value="expenses">{t('group_details.tabs.expenses')}</TabsTrigger>
                <TabsTrigger value="balances">{t('group_details.tabs.balances')}</TabsTrigger>
              </TabsList>
              <TabsContent value="expenses">
                <ExpenseList
                  userId={user.id}
                  expenses={expensesQuery.data}
                  contactId={groupId}
                  isLoading={expensesQuery.isPending}
                  isGroup
                />
              </TabsContent>
              <TabsContent value="balances">
                <BalanceList
                  groupBalances={groupDetailQuery.data?.groupBalances}
                  users={groupDetailQuery.data?.groupUsers.map((gu) => gu.user)}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </MainLayout>
    </>
  );
};

BalancePage.auth = true;

export default BalancePage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const group = await db.group.findFirst({
    where: {
      id: Number(context.query.groupId),
    },
  });

  if (!group) {
    return {
      redirect: {
        destination: '/groups',
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...(await customServerSideTranslations(context.locale, ['common', 'currencies'])),
      enableSendingInvites: env.ENABLE_SENDING_INVITES,
    },
  };
};
