import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import React from 'react';
import { ConvertibleBalance } from '~/components/Expense/ConvertibleBalance';
import { flatAvatarColor } from '~/components/ui/avatar';

export const GroupCard: React.FC<{
  entity: { name?: string | null; image?: string | null; email?: string | null };
  balances?: { currency: string; amount: bigint }[];
  memberCount: number;
  id: number;
}> = ({ entity, balances, memberCount, id }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const currentRoute = router.pathname;

  const name = entity.name ?? '';
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '?';

  return (
    <Link
      className="border-foreground/8 flex items-center justify-between gap-3 border-b py-4 active:opacity-55"
      href={`${currentRoute}/${id}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-[15px] text-[15px] font-bold"
          style={{ backgroundColor: flatAvatarColor(name), color: '#0a0c0d' }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-foreground truncate text-[16.5px] font-semibold">{name}</div>
          <div className="text-foreground/40 mt-0.5 text-[12.5px]">
            {t('group_details.member_count', { count: memberCount })}
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right text-[16px] font-semibold tabular-nums">
        <ConvertibleBalance balances={balances ?? []} entityId={id} entityType="group" />
      </div>
    </Link>
  );
};
