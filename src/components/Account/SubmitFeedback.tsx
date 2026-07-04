import { zodResolver } from '@hookform/resolvers/zod';
import React, { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { type TFunction, useTranslation } from 'next-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

import { api } from '~/utils/api';

import { AccountButton } from './AccountButton';
import { AppDrawer } from '../ui/drawer';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';
import { Textarea } from '../ui/textarea';

const feedbackSchema = (t: TFunction) =>
  z.object({
    feedback: z
      .string({ required_error: t('errors.feedback_required') })
      .min(10, { message: t('errors.feedback_min_length') }),
  });

type FeedbackFormValues = z.infer<ReturnType<typeof feedbackSchema>>;

export const SubmitFeedback: React.FC = () => {
  const { t } = useTranslation();
  const submitFeedbackMutation = api.user.submitFeedback.useMutation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const feedbackForm = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema(t)),
  });

  const onGroupSubmit = useCallback(
    async (values: FeedbackFormValues) => {
      try {
        await submitFeedbackMutation.mutateAsync({ feedback: values.feedback });
        feedbackForm.reset();
        toast.success(t('ui.messages.submit_success'), { duration: 1500 });
      } catch (e) {
        console.info(e);
        toast.error(t('ui.messages.submit_error'));
      }
      setFeedbackOpen(false);
    },
    [submitFeedbackMutation, feedbackForm, t],
  );

  const handleClose = useCallback(() => setFeedbackOpen(false), []);

  const trigger = useMemo(
    () => <AccountButton label={t('account.submit_feedback')} value={t('actions.open')} />,
    [t],
  );

  const handleActionClick = useCallback(async () => {
    await feedbackForm.handleSubmit(onGroupSubmit)();
  }, [feedbackForm, onGroupSubmit]);

  const field = useCallback(
    ({ field }: any) => (
      <FormItem className="w-full">
        <FormControl>
          <Textarea
            className="bg-foreground/5 placeholder:text-foreground/35 min-h-[110px] rounded-[14px] border-0 px-4 py-3.5 text-[14.5px]"
            placeholder={t('account.submit_feedback_details.placeholder')}
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    ),
    [t],
  );

  return (
    <AppDrawer
      trigger={trigger}
      open={feedbackOpen}
      onOpenChange={setFeedbackOpen}
      onClose={handleClose}
      leftAction={t('actions.close')}
      title={t('account.submit_feedback_details.title')}
      className="h-[70vh]"
      shouldCloseOnAction={false}
      actionTitle={t('actions.submit')}
      actionOnClick={handleActionClick}
    >
      <div>
        <p className="text-foreground/50 mt-4 text-[13.5px] leading-relaxed">
          {t('account.submit_feedback_details.intro')}
        </p>
        <Form {...feedbackForm}>
          <form
            onSubmit={feedbackForm.handleSubmit(onGroupSubmit)}
            className="mt-3.5 flex w-full items-start gap-4"
          >
            <FormField control={feedbackForm.control} name="feedback" render={field} />
          </form>
        </Form>
      </div>
    </AppDrawer>
  );
};
