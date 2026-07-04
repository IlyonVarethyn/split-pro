import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { EntityAvatar } from '../ui/avatar';
import { ConvertibleBalance } from './ConvertibleBalance';

const emptyBalances: { currency: string; amount: bigint }[] = [];

export const BalanceEntry: React.FC<{
  entity: { name?: string | null; image?: string | null; email?: string | null };
  balances?: { currency: string; amount: bigint }[];
  id: number;
}> = ({ entity, balances = emptyBalances, id }) => {
  const { displayName } = useTranslationWithUtils();
  const router = useRouter();

  const currentRoute = router.pathname;

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return (
    <Link
      className="border-foreground/8 flex items-center gap-3.5 border-b py-[15px] active:opacity-55"
      href={`${currentRoute}/${id}`}
    >
      <EntityAvatar entity={entity} size={42} />
      <div className="text-foreground min-w-0 flex-1 truncate text-[16px] font-medium">
        {displayName(entity)}
      </div>
      <div className="shrink-0 text-right" onClick={stopPropagation}>
        <ConvertibleBalance withText balances={balances} entityId={id} />
      </div>
    </Link>
  );
};
