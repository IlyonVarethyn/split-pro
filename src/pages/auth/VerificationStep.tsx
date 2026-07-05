// oxlint-disable no-html-link-for-pages
import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { Mail } from 'lucide-react';
import { type TFunction, useTranslation } from 'next-i18next';
import { type FC, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '~/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp';

const otpSchema = (t: TFunction) =>
  z.object({
    otp: z
      .string({ required_error: t('errors.otp_required') })
      .length(5, { message: t('errors.otp_invalid') }),
  });

type OTPFormValues = z.infer<ReturnType<typeof otpSchema>>;

interface VerificationStepProps {
  feedbackEmail?: string;
  email: string;
  callbackUrl?: string;
  onBack: () => void;
}

const VerificationStep: FC<VerificationStepProps> = ({
  feedbackEmail,
  email,
  callbackUrl,
  onBack,
}) => {
  const { t } = useTranslation();

  const otpForm = useForm<OTPFormValues>({
    resolver: zodResolver(otpSchema(t)),
  });

  const onOTPSubmit = useCallback(() => {
    if (!email) {
      toast.error(t('errors.email_invalid'));
      return;
    }

    window.location.href = `/api/auth/callback/email?email=${encodeURIComponent(
      email,
    )}&token=${otpForm.getValues().otp}${callbackUrl ? `&callbackUrl=${callbackUrl}` : ''}`;
  }, [email, otpForm, callbackUrl, t]);

  const feedbackEmailLink = useMemo(() => `mailto:${feedbackEmail}`, [feedbackEmail]);

  return (
    <>
      <main className="screen-enter-push flex h-full flex-col items-center px-6 pt-[100px] pb-14 text-center">
        <div className="bg-primary/12 text-primary flex size-14 shrink-0 items-center justify-center rounded-full">
          <Mail className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <p className="mt-3.5 text-[23px] font-bold">{t('auth.verify_email_title')}</p>
        <p className="text-foreground/50 mt-2 max-w-[260px] text-sm leading-snug">
          {t('auth.otp_sent_short')} <span className="text-foreground font-semibold">{email}</span>
        </p>
        <Form {...otpForm}>
          <form
            onSubmit={otpForm.handleSubmit(onOTPSubmit)}
            className="mt-6 flex w-full max-w-[300px] flex-col items-center gap-8"
          >
            <FormField control={otpForm.control} name="otp" render={OTPInput} />

            <Button className="bg-primary text-primary-foreground w-full rounded-[14px] py-[15px] text-[15.5px] font-bold active:scale-[.98]">
              {t('actions.submit')}
            </Button>
          </form>
        </Form>

        <button
          type="button"
          onClick={onBack}
          className="text-foreground/50 mt-2 rounded-[14px] py-2.5 text-[13.5px] active:opacity-60"
        >
          {t('auth.use_another_email')}
        </button>

        {feedbackEmail && (
          <p className="text-foreground/45 mt-6 w-[300px] text-center text-sm">
            {t('auth.trouble_logging_in')}
            <br />
            {/* oxlint-disable-next-line next/no-html-link-for-pages */}
            <a className="underline" href={feedbackEmailLink}>
              {feedbackEmail ?? ''}
            </a>
          </p>
        )}
      </main>
    </>
  );
};

// @ts-expect-error form types are not very handy
const OTPInput = ({ field }) => (
  <FormItem>
    <FormControl>
      <InputOTP
        containerClassName="w-full justify-between"
        maxLength={5}
        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
        inputMode="text"
        autoFocus
        {...field}
      >
        <InputOTPGroup className="w-full justify-between">
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
        </InputOTPGroup>
      </InputOTP>
    </FormControl>

    <FormMessage />
  </FormItem>
);

export default VerificationStep;
