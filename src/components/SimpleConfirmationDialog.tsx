import { type VariantProps } from 'class-variance-authority';
import { type FormEvent, useCallback, useState } from 'react';
import { useTranslation } from 'next-i18next';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { Button, type buttonVariants } from './ui/button';

export const SimpleConfirmationDialog: React.FC<
  {
    title: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onCancel?: () => void;
    description: React.ReactNode;
    hasPermission: boolean;
    onConfirm: () => void | Promise<void>;
    loading: boolean;
    children?: React.ReactNode;
  } & VariantProps<typeof buttonVariants>
> = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCancel,
  title,
  description,
  hasPermission,
  onConfirm,
  loading,
  children,
}) => {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const handleConfirm = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      await onConfirm();
      setOpen(false);
    },
    [onConfirm, setOpen],
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent className="max-w-xs">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[16.5px] font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/55 text-[13.5px] leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-5 flex-row gap-2.5 sm:space-x-0">
          <AlertDialogCancel
            onClick={onCancel}
            className="bg-foreground/7 h-auto flex-1 rounded-[12px] border-none py-3 text-sm font-semibold"
          >
            {hasPermission ? t('actions.cancel') : t('actions.understood')}
          </AlertDialogCancel>
          {hasPermission && (
            <form className="flex-1" onSubmit={handleConfirm}>
              <Button
                type="submit"
                className="bg-negative/14 text-negative hover:bg-negative/20 w-full rounded-[12px] py-3 text-sm font-bold"
                disabled={loading}
                loading={loading}
              >
                {t('actions.confirm')}
              </Button>
            </form>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
