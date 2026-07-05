import { type GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect } from 'react';

import { AvatarStack } from '~/components/group/AvatarStack';
import { Button } from '~/components/ui/button';
import { LoadingSpinner } from '~/components/ui/spinner';
import { getServerAuthSession } from '~/server/auth';
import type { NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';

const getInitials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

const JoinGroupPage: NextPageWithUser = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const groupId = typeof router.query.groupId === 'string' ? router.query.groupId : undefined;

  const previewQuery = api.group.getGroupPreview.useQuery(
    { groupId: groupId ?? '' },
    { enabled: !!groupId, retry: false },
  );
  const joinGroupMutation = api.group.joinGroup.useMutation();

  const handleNotNow = useCallback(() => {
    router.push('/groups').catch(console.error);
  }, [router]);

  const handleJoin = useCallback(() => {
    if (!groupId) {
      return;
    }
    joinGroupMutation.mutate(
      { groupId },
      {
        onSuccess: (group) => {
          router.push(`/groups/${group.id}`).catch(console.error);
        },
      },
    );
  }, [groupId, joinGroupMutation, router]);

  const handleOpen = useCallback(() => {
    if (previewQuery.data) {
      router.push(`/groups/${previewQuery.data.id}`).catch(console.error);
    }
  }, [previewQuery.data, router]);

  useEffect(() => {
    if (!groupId || previewQuery.isError) {
      router.replace('/groups').catch(console.error);
    }
  }, [groupId, previewQuery.isError, router]);

  if (!groupId || previewQuery.isError || previewQuery.isLoading || !previewQuery.data) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner className="text-primary" />
      </div>
    );
  }

  const group = previewQuery.data;

  return (
    <main className="screen-enter-push flex h-full flex-col items-center px-6 pt-[130px] pb-14 text-center">
      <div className="bg-primary/15 text-primary flex size-[72px] shrink-0 items-center justify-center rounded-[20px] text-2xl font-bold">
        {getInitials(group.name)}
      </div>
      <h1 className="mt-4 text-[23px] leading-[1.3] font-bold">
        {t('join_group.invited_title', { name: group.name })}
      </h1>
      <p className="text-foreground/50 mt-2 text-sm">
        {t('join_group.meta', { count: group.members.length, creator: group.createdByName })}
      </p>
      <div className="mt-3.5">
        <AvatarStack members={group.members} size={34} />
      </div>
      <div className="mt-auto flex w-full max-w-[300px] flex-col gap-2.5 pt-8">
        {group.isMember ? (
          <Button
            onClick={handleOpen}
            className="bg-primary text-primary-foreground w-full rounded-[14px] py-[15px] text-[15.5px] font-bold active:scale-[.98]"
          >
            {t('join_group.open')}
          </Button>
        ) : (
          <Button
            onClick={handleJoin}
            disabled={joinGroupMutation.isPending}
            className="bg-primary text-primary-foreground w-full rounded-[14px] py-[15px] text-[15.5px] font-bold active:scale-[.98] disabled:opacity-40"
          >
            {joinGroupMutation.isPending ? <LoadingSpinner /> : t('join_group.join')}
          </Button>
        )}
        <button
          onClick={handleNotNow}
          className="text-foreground/50 rounded-[14px] py-2.5 text-[13.5px] active:opacity-60"
        >
          {t('join_group.not_now')}
        </button>
      </div>
    </main>
  );
};

JoinGroupPage.auth = true;

export default JoinGroupPage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);

  if (!session) {
    return {
      redirect: {
        destination: `/auth/signin?callbackUrl=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...(await customServerSideTranslations(context.locale, ['common'])),
    },
  };
};
