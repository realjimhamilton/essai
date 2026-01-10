import { useState, useEffect } from 'react';
import { OGDialog, OGDialogContent, OGDialogHeader, OGDialogTitle, Button, Input, Label } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useGetPresetsQuery } from '~/data-provider';
import type { TPreset } from 'librechat-data-provider';

type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, systemPrompt?: string, defaultPresetId?: string, ragFileIds?: string[]) => Promise<void>;
};

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  open,
  onOpenChange,
  onCreate,
}) => {
  const localize = useLocalize();
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [defaultPresetId, setDefaultPresetId] = useState<string>('');
  const { data: presets } = useGetPresetsQuery();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setSystemPrompt('');
      setDefaultPresetId('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }
    setIsCreating(true);
    try {
      await onCreate(
        name.trim(),
        systemPrompt.trim() || undefined,
        defaultPresetId || undefined,
        [], // RAG files will be added later via project settings
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent
        className="w-11/12 max-w-lg"
        title={localize('com_ui_create_project')}
        showCloseButton={true}
      >
        <OGDialogHeader>
          <OGDialogTitle>{localize('com_ui_create_project')}</OGDialogTitle>
        </OGDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">{localize('com_ui_project_name')}</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={localize('com_ui_project_name_placeholder')}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-system-prompt">{localize('com_ui_system_prompt')} (Optional)</Label>
            <textarea
              id="project-system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={localize('com_ui_system_prompt_placeholder')}
              className="min-h-[100px] w-full rounded-md border border-border-light bg-surface-primary p-2 text-sm text-text-primary"
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-preset">{localize('com_ui_default_preset')} (Optional)</Label>
            <select
              id="project-preset"
              value={defaultPresetId}
              onChange={(e) => setDefaultPresetId(e.target.value)}
              className="w-full rounded-md border border-border-light bg-surface-primary p-2 text-sm text-text-primary"
            >
              <option value="">{localize('com_ui_none')}</option>
              {presets?.map((preset: TPreset) => (
                <option key={preset.presetId} value={preset.presetId}>
                  {preset.title || preset.presetId}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              {localize('com_ui_cancel')}
            </Button>
            <Button type="submit" variant="default" disabled={isCreating || !name.trim()}>
              {isCreating ? localize('com_ui_creating') : localize('com_ui_create')}
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
};
