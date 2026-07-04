import { Plus } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import { useEffect, useMemo } from 'react';
import { CreateGroup } from '~/components/group/CreateGroup';
import { GroupCard } from '~/components/group/GroupCard';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';
import { useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';
import { isCurrencyCode } from '~/lib/currency';

// Helper to transform balances object to array format
function transformBalances(balances: Record<string, bigint>) {
  return Object.entries(balances)
    .filter(([_, amount]) => 0n !== amount)
    .map(([currency, amount]) => ({ currency, amount }));
}

const BalancePage: NextPageWithUser = () => {
  const { t } = useTranslation();
  const groupQuery = api.group.getAllGroupsWithBalances.useQuery();
  const archivedGroupQuery = api.group.getAllGroupsWithBalances.useQuery({ getArchived: true });
  const setGroupDefaultCurrency = useCurrencyPreferenceStore((s) => s.setGroupDefaultCurrency);

  useEffect(() => {
    groupQuery.data?.forEach(({ id, defaultCurrency }) => {
      if (isCurrencyCode(defaultCurrency)) {
        setGroupDefaultCurrency(id, defaultCurrency);
      }
    });
  }, [groupQuery.data, setGroupDefaultCurrency]);

  const actions = useMemo(
    () => (
      <CreateGroup>
        <button
          type="button"
          className="bg-primary/14 text-primary flex size-[38px] items-center justify-center rounded-full transition-transform active:scale-90"
        >
          <Plus className="size-5" strokeWidth={2.2} />
        </button>
      </CreateGroup>
    ),
    [],
  );

  return (
    <>
      <Head>
        <title>{t('navigation.groups')}</title>
      </Head>
      <MainLayout title={t('navigation.groups')} actions={actions} loading={groupQuery.isPending}>
        <div className="mt-7 flex flex-col pb-36">
          {0 === groupQuery.data?.length ? (
            <div className="mt-[30vh] flex flex-col items-center justify-center gap-20">
              <CreateGroup>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('actions.create')}
                </Button>
              </CreateGroup>
            </div>
          ) : (
            <>
              {/* Active Groups */}
              {groupQuery.data?.map((g) => (
                <GroupCard
                  key={g.id}
                  id={g.id}
                  entity={g}
                  balances={transformBalances(g.balances)}
                  memberCount={g.memberCount}
                />
              ))}

              {/* Archived Groups Accordion */}
              {archivedGroupQuery.data && archivedGroupQuery.data.length > 0 && (
                <Accordion type="single" collapsible className="mt-5 w-full">
                  <AccordionItem value="archived-groups" className="border-none">
                    <AccordionTrigger className="text-foreground/45 py-3 text-left text-[13px] font-medium hover:no-underline [&>svg]:transition-transform [&>svg]:duration-250">
                      {t('group_details.group_info.archived')} ({archivedGroupQuery.data.length})
                    </AccordionTrigger>
                    <AccordionContent
                      forceMount
                      className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-60 motion-reduce:transition-none"
                    >
                      <div className="flex min-h-0 flex-col">
                        {archivedGroupQuery.data.map((g) => (
                          <GroupCard
                            key={g.id}
                            id={g.id}
                            entity={g}
                            balances={transformBalances(g.balances)}
                            memberCount={g.memberCount}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </>
          )}
        </div>
      </MainLayout>
    </>
  );
};

BalancePage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default BalancePage;
