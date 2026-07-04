import { useTranslation } from 'next-i18next';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '~/store/appStore';
import { api } from '~/utils/api';

import { AccountButton } from './AccountButton';
import { AppDrawer } from '../ui/drawer';
import { Switch } from '../ui/switch';

const base64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(b64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const SubscribeNotification: React.FC = () => {
  const { t } = useTranslation();
  const updatePushSubscription = api.user.updatePushNotification.useMutation();
  const deletePushSubscription = api.user.deletePushNotification.useMutation();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [open, setOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const webPushPublicKey = useAppStore((s) => s.webPushPublicKey);

  useEffect(() => {
    if ('undefined' !== typeof window && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.pushManager
            .getSubscription()
            .then((sub) => {
              if (sub) {
                setIsSubscribed(true);
              }
            })
            .catch(console.error);
        })
        .catch(console.error);
    }
  }, []);

  const onRequestNotification = useCallback(async () => {
    try {
      const result = await Notification.requestPermission();
      if ('granted' === result) {
        toast.success(t('account.notifications.messages.notification_granted'));
        await navigator.serviceWorker.ready
          .then(async (reg) => {
            if (!webPushPublicKey) {
              toast.error(t('errors.notification_not_supported'));
              return;
            }

            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: base64ToUint8Array(webPushPublicKey),
            });

            setIsSubscribed(true);
            updatePushSubscription.mutate({ subscription: JSON.stringify(sub) });
          })
          .catch((e) => {
            console.info(e);
            toast.error(t('errors.subscribe_error'));
          });
      }
    } catch (e) {
      console.info(e);
      toast.error(t('errors.request_error'));
    }
  }, [t, updatePushSubscription, webPushPublicKey]);

  const unSubscribeNotification = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription.mutateAsync({ subscription: JSON.stringify(sub) });
        await sub.unsubscribe();
        setIsSubscribed(false);
      }
    } catch (e) {
      console.info(e);
      toast.error(t('errors.unsubscribe_error'));
    }
  }, [deletePushSubscription, t]);

  const handleToggle = useCallback(
    async (checked: boolean) => {
      setToggling(true);
      try {
        await (checked ? onRequestNotification() : unSubscribeNotification());
      } finally {
        setToggling(false);
      }
    },
    [onRequestNotification, unSubscribeNotification],
  );

  const trigger = useMemo(
    () => (
      <AccountButton
        label={t('account.notifications.title')}
        value={
          isSubscribed ? t('account.notifications.enabled') : t('account.notifications.disabled')
        }
      />
    ),
    [isSubscribed, t],
  );

  if (!webPushPublicKey) {
    return null;
  }

  return (
    <AppDrawer
      trigger={trigger}
      open={open}
      onOpenChange={setOpen}
      leftAction={t('actions.close')}
      title={t('account.notifications.title')}
      className="h-[45vh]"
    >
      <div className="mt-4 flex items-center justify-between gap-4 py-1.5">
        <div className="min-w-0">
          <div className="text-[15px] font-medium">{t('account.notifications.title')}</div>
          <div className="text-foreground/40 mt-[3px] max-w-[230px] text-[12.5px] leading-[1.45]">
            {t('account.notifications.description')}
          </div>
        </div>
        <Switch
          checked={isSubscribed}
          disabled={toggling}
          onCheckedChange={(checked) => void handleToggle(checked)}
        />
      </div>
    </AppDrawer>
  );
};
