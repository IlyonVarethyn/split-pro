import { ImagePlus, Image as ImageUploaded } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';

import { cn } from '~/lib/utils';
import { useAddExpenseStore } from '~/store/addStore';
import { prepareImageForUpload, uploadImage, validateUploadSize } from '~/utils/imageUpload';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAppStore } from '~/store/appStore';

export const UploadFile: React.FC = () => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const maxUploadFileSizeMB = useAppStore((s) => s.maxUploadFileSizeMB);
  const fileKey = useAddExpenseStore((s) => s.fileKey);
  const { setFileUploading, setFileKey } = useAddExpenseStore((s) => s.actions);

  const handleFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = event.target;

      let file = files?.[0];

      if (!file) {
        return;
      }

      try {
        try {
          file = await prepareImageForUpload(file, maxUploadFileSizeMB);
        } catch (error) {
          console.error('Compression failed:', error);
          toast.error(t('errors.image_compression_failed'));
        }

        if (!validateUploadSize(file, maxUploadFileSizeMB)) {
          toast.error(t('errors.less_than', { size: maxUploadFileSizeMB }));
          return;
        }

        setFile(file);
        setFileUploading(true);

        const key = await uploadImage(file);

        toast.success(t('expense_details.add_expense_details.upload_file.messages.upload_success'));
        setFileKey(key);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(t('errors.uploading_error'));
        setFile(null);
      } finally {
        setFileUploading(false);
      }
    },
    [setFileUploading, setFileKey, maxUploadFileSizeMB, t],
  );

  const isAttached = Boolean(file || fileKey);

  return (
    <Label
      htmlFor="picture"
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold active:scale-95',
        isAttached ? 'bg-primary/14 text-primary' : 'bg-foreground/7 text-foreground/70',
      )}
    >
      {isAttached ? (
        <ImageUploaded className="size-3.5" />
      ) : (
        <ImagePlus className="text-foreground/45 size-3.5" />
      )}
      {t('expense_details.add_expense_details.upload_file.receipt_label')}
      <Input
        onChange={handleFileChange}
        id="picture"
        type="file"
        accept="image/*"
        className="hidden"
      />
    </Label>
  );
};

export default UploadFile;
