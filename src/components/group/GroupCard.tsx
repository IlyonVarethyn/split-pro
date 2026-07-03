import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import React from 'react';
import { ConvertibleBalance } from '~/components/Expense/ConvertibleBalance';
import { EntityAvatar } from '~/components/ui/avatar';

export const GroupCard: React.FC<{
  entity: { name?: string | null; image?: string | null; email?: string | null };
  balances?: { currency: string; amount: bigint }[];
  memberCount: number;
  id: number;
}> = ({ entity, balances, memberCount, id }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const currentRoute = router.pathname;

  return (
    <Link
      className="bg-foreground/5 flex items-center justify-between gap-3 rounded-[0.875rem] px-4 py-3.5"
      href={`${currentRoute}/${id}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <EntityAvatar entity={entity} size={44} />
        <div className="min-w-0">
          <div className="text-foreground truncate text-base font-medium">{entity.name}</div>
          <div className="text-foreground/40 text-xs">
            {t('group_details.member_count', { count: memberCount })}
          </div>
        </div>
      </div>
      <ConvertibleBalance withText balances={balances ?? []} entityId={id} />
    </Link>
  );
};
