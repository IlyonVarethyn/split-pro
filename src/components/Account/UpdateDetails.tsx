import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil } from 'lucide-react';
import Cropper, { type Area } from 'react-easy-crop';
import React, { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { type TFunction, useTranslation } from 'next-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

import { prepareImageForUpload, uploadImage, validateUploadSize } from '~/utils/imageUpload';
import { useAppStore } from '~/store/appStore';
import { isCurrencyCode, parseCurrencyCode } from '~/lib/currency';

import { AppDrawer } from '../ui/drawer';
import { EntityAvatar } from '../ui/avatar';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { CurrencyPicker } from '../AddExpense/CurrencyPicker';

const createImage = async (url: string) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = url;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to load image for cropping'));
  });

  return image;
};

const getCroppedImage = async (imageSrc: string, pixelCrop: Area) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Cannot get canvas context');
  }

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }

        resolve(blob);
      },
      'image/jpeg',
      0.9,
    );
  });
};

const detailsSchema = (t: TFunction) =>
  z.object({
    name: z
      .string({ required_error: t('errors.name_required') })
      .min(1, { message: t('errors.name_required') }),
    image: z.string().nullable().optional(),
    defaultCurrency: z.string().nullable().optional(),
  });

type UpdateDetailsFormValues = z.infer<ReturnType<typeof detailsSchema>>;

export const UpdateDetails: React.FC<{
  className?: string;
  /**
   * `profile` (default) is the full personal-account editor: centered avatar,
   * name field and the personal default-currency row, titled "Profile".
   * `compact` is used to rename any other entity (e.g. a group): same avatar +
   * name editor, but no currency section and a bare pencil trigger sized via
   * `className`, matching the pre-redesign `UpdateName` behaviour.
   */
  variant?: 'profile' | 'compact';
  defaultName: string;
  defaultImage?: string | null;
  defaultCurrency?: string | null;
  onNameSubmit: (values: {
    name: string;
    image?: string | null;
    defaultCurrency?: string | null;
  }) => void | Promise<void>;
}> = ({
  className,
  variant = 'profile',
  defaultName,
  defaultImage,
  defaultCurrency,
  onNameSubmit,
}) => {
  const isCompact = 'compact' === variant;
  const showCurrency = !isCompact;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const maxUploadFileSizeMB = useAppStore((s) => s.maxUploadFileSizeMB);

  const { t } = useTranslation();

  const detailForm = useForm<UpdateDetailsFormValues>({
    resolver: zodResolver(detailsSchema(t)),
    defaultValues: {
      name: defaultName,
      image: defaultImage,
      defaultCurrency,
    },
  });

  React.useEffect(() => {
    detailForm.reset({
      name: defaultName,
      image: defaultImage,
      defaultCurrency,
    });
  }, [defaultCurrency, defaultImage, defaultName, detailForm]);

  React.useEffect(
    () => () => {
      if (imageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    },
    [imageSrc],
  );

  const handleOpenChange = useCallback(
    (openVal: boolean) => {
      if (openVal !== drawerOpen) {
        if (!openVal && imageSrc?.startsWith('blob:')) {
          URL.revokeObjectURL(imageSrc);
          setImageSrc(null);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setCroppedAreaPixels(null);
        }
        setDrawerOpen(openVal);
      }
    },
    [drawerOpen, imageSrc],
  );

  const handleOnActionClick = useCallback(async () => {
    const isValid = await detailForm.trigger();
    if (!isValid) {
      return;
    }

    await detailForm.handleSubmit(async (values) => {
      let nextImage = values.image;

      if (imageSrc && croppedAreaPixels) {
        try {
          const croppedBlob = await getCroppedImage(imageSrc, croppedAreaPixels);
          let croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });

          try {
            croppedFile = await prepareImageForUpload(croppedFile, maxUploadFileSizeMB);
          } catch (error) {
            console.error('Compression failed:', error);
            toast.error(t('errors.image_compression_failed'));
          }

          if (!validateUploadSize(croppedFile, maxUploadFileSizeMB)) {
            toast.error(t('errors.less_than', { size: maxUploadFileSizeMB }));
            return;
          }

          nextImage = await uploadImage(croppedFile);
          toast.success(
            t('expense_details.add_expense_details.upload_file.messages.upload_success'),
          );
        } catch (error) {
          console.error('Crop/upload error:', error);
          toast.error(t('errors.uploading_error'));
          return;
        }
      }

      await onNameSubmit({
        ...values,
        image: nextImage,
        defaultCurrency: values.defaultCurrency,
      });
      setDrawerOpen(false);
      if (imageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    })();
  }, [croppedAreaPixels, detailForm, imageSrc, maxUploadFileSizeMB, onNameSubmit, t]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) {
        return;
      }

      const objectUrl = URL.createObjectURL(selectedFile);
      if (imageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }

      setImageSrc(objectUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      event.target.value = '';
    },
    [imageSrc],
  );

  const handleClearImage = useCallback(() => {
    if (imageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(imageSrc);
    }

    detailForm.setValue('image', null, { shouldDirty: true });
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [detailForm, imageSrc]);

  const handleSelectDefaultCurrency = useCallback(
    (currency: string | null) => {
      detailForm.setValue('defaultCurrency', currency, { shouldDirty: true });
    },
    [detailForm],
  );

  const trigger = useMemo(
    () =>
      isCompact ? (
        <Pencil className={className} />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="bg-foreground/6 h-[34px] w-[34px] rounded-full p-0"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    [className, isCompact],
  );

  const field = useCallback(
    ({ field }: any) => (
      <FormItem className="w-full">
        <div className="text-foreground/40 mb-1.5 text-[11px] tracking-[.05em] uppercase">
          {t('account.edit_name.name_label')}
        </div>
        <FormControl>
          <Input
            className="border-foreground/18 focus-visible:border-primary h-auto rounded-none border-0 border-b-[1.5px] bg-transparent px-0 pb-2.5 text-[16px] font-medium ring-offset-0 focus-visible:ring-0"
            placeholder={t('account.edit_name.placeholder')}
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    ),
    [t],
  );

  const defaultCurrencyValue = detailForm.watch('defaultCurrency');

  const hasImage = null !== detailForm.watch('image') && undefined !== detailForm.watch('image');

  return (
    <AppDrawer
      trigger={trigger}
      open={drawerOpen}
      onOpenChange={handleOpenChange}
      leftAction={t('actions.close')}
      title={isCompact ? t('account.edit_name.title') : t('account.profile.title')}
      shouldCloseOnAction={false}
      className="h-[80vh]"
      actionTitle={t('actions.save')}
      actionOnClick={handleOnActionClick}
    >
      <Form {...detailForm}>
        <form className="mt-4 flex w-full flex-col gap-6" onSubmit={handleOnActionClick}>
          {!imageSrc ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative h-[76px] w-[76px]">
                <EntityAvatar
                  entity={{
                    name: detailForm.watch('name'),
                    image: detailForm.watch('image'),
                  }}
                  size={76}
                />
                <Label
                  htmlFor="profile-image-input"
                  className="border-surface-sheet bg-foreground/10 absolute -right-[3px] -bottom-[3px] flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 active:scale-[.92]"
                >
                  <Pencil className="text-foreground/70 h-3 w-3" />
                  <Input
                    onChange={handleFileChange}
                    id="profile-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                  />
                </Label>
              </div>
              {hasImage ? (
                <button
                  type="button"
                  className="text-foreground/40 text-[11.5px] active:opacity-60"
                  onClick={handleClearImage}
                >
                  {t('account.edit_name.remove_avatar')}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-foreground/5 relative h-64 w-full overflow-hidden rounded-[18px]">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="bg-foreground/5 rounded-[18px] px-[18px] py-4">
                <Label className="mb-4 block" htmlFor="zoom-slider">
                  {t('account.edit_name.zoom')}
                </Label>
                <Slider
                  id="zoom-slider"
                  min={1}
                  max={3}
                  step={0.1}
                  value={[zoom]}
                  onValueChange={(val) => setZoom(val[0] ?? 1)}
                />
              </div>
            </div>
          )}

          <FormField control={detailForm.control} name="name" render={field} />

          {showCurrency ? (
            <div className="border-foreground/8 flex items-center justify-between border-b py-[15px]">
              <span className="text-[15px] font-medium">
                {t('account.default_balance_currency')}
              </span>
              <CurrencyPicker
                currentCurrency={
                  defaultCurrencyValue && isCurrencyCode(defaultCurrencyValue)
                    ? parseCurrencyCode(defaultCurrencyValue)
                    : null
                }
                allowClear
                onCurrencyPick={handleSelectDefaultCurrency}
              />
            </div>
          ) : null}
        </form>
      </Form>
    </AppDrawer>
  );
};

export const UpdateName: React.FC<{
  className?: string;
  defaultName: string;
  defaultImage?: string | null;
  onNameSubmit: (values: {
    name: string;
    image?: string | null;
    defaultCurrency?: string | null;
  }) => void | Promise<void>;
}> = (props) => <UpdateDetails {...props} variant="compact" />;
