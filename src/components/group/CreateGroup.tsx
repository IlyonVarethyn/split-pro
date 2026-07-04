import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { type TFunction, useTranslation } from 'next-i18next';
import { z } from 'zod';

import { AppDrawer } from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { api } from '~/utils/api';

import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';

const groupSchema = (t: TFunction) =>
  z.object({
    name: z
      .string({ required_error: t('errors.name_required') })
      .min(1, { message: t('errors.name_required') }),
  });

type CreateGroupFormValues = z.infer<ReturnType<typeof groupSchema>>;

export const CreateGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const createGroup = api.group.create.useMutation(undefined);
  const utils = api.useUtils();

  const groupForm = useForm<CreateGroupFormValues>({
    resolver: zodResolver(groupSchema(t)),
  });

  const router = useRouter();

  const onGroupSubmit = useCallback(
    async (values: CreateGroupFormValues) => {
      await createGroup.mutateAsync(
        { name: values.name },
        {
          onSuccess: (data) => {
            utils.group.getAllGroupsWithBalances.refetch().catch(console.error);
            router
              .push(`/groups/${data.id}`)
              .then(() => setDrawerOpen(false))
              .catch(console.error);
          },
        },
      );
    },
    [router, createGroup, utils.group.getAllGroupsWithBalances],
  );

  const handleOpenChange = useCallback(
    (openVal: boolean) => {
      if (openVal !== drawerOpen) {
        setDrawerOpen(openVal);
      }
    },
    [drawerOpen],
  );

  const handleLeftActionClick = useCallback(() => setDrawerOpen(false), []);

  const handleActionClick = useCallback(async () => {
    await groupForm.handleSubmit(onGroupSubmit)();
  }, [groupForm, onGroupSubmit]);

  const field = useCallback(
    ({ field }: any) => (
      <FormItem className="w-full">
        <FormControl>
          <Input
            placeholder={t('group_details.create_group.group_name_placeholder')}
            className="border-foreground/18 focus-visible:border-primary w-full rounded-none border-0 border-b-[1.5px] bg-transparent px-0 text-[16px] font-medium shadow-none focus-visible:ring-0"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    ),
    [t],
  );

  return (
    <>
      <AppDrawer
        open={drawerOpen}
        onOpenChange={handleOpenChange}
        trigger={children}
        leftAction={t('actions.cancel')}
        leftActionOnClick={handleLeftActionClick}
        title={t('group_details.create_group.title')}
        className="h-[70vh]"
        actionTitle={t('actions.create')}
        actionOnClick={handleActionClick}
      >
        <div className="w-full">
          <Form {...groupForm}>
            <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="mt-4 w-full">
              <label className="text-foreground/40 mb-1.5 block text-[11px] tracking-[.05em] uppercase">
                {t('group_details.create_group.group_name_placeholder')}
              </label>
              <FormField control={groupForm.control} name="name" render={field} />
            </form>
          </Form>
        </div>
      </AppDrawer>
    </>
  );
};
