import { useState, useEffect } from 'react';
import { OGDialog, OGDialogContent, OGDialogHeader, OGDialogTitle, Button, Input, Label } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useGetPresetsQuery } from '~/data-provider';
import type { TProject, TPreset } from 'librechat-data-provider';

type EditProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: TProject;
  onSave: (updates: { name?: string; systemPrompt?: string; defaultPresetId?: string }) => Promise<void>;
};

export const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  open,
  onOpenChange,
  project,
  onSave,
}) => {
  const localize = useLocalize();
  const [name, setName] = useState(project.name);
  const [systemPrompt, setSystemPrompt] = useState(project.systemPrompt || '');
  const [defaultPresetId, setDefaultPresetId] = useState(project.defaultPresetId || '');
  const { data: presets } = useGetPresetsQuery();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && project) {
      setName(project.name);
      setSystemPrompt(project.systemPrompt || '');
      setDefaultPresetId(project.defaultPresetId || '');
    }
  }, [open, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        systemPrompt: systemPrompt.trim() || undefined,
        defaultPresetId: defaultPresetId || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent
        className="w-11/12 max-w-lg"
        title={localize('com_ui_edit_project')}
        showCloseButton={true}
      >
        <OGDialogHeader>
          <OGDialogTitle>{localize('com_ui_edit_project')}</OGDialogTitle>
        </OGDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-project-name">{localize('com_ui_project_name')}</Label>
            <Input
              id="edit-project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={localize('com_ui_project_name_placeholder')}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-project-system-prompt">{localize('com_ui_system_prompt')} (Optional)</Label>
            <textarea
              id="edit-project-system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={localize('com_ui_system_prompt_placeholder')}
              className="min-h-[100px] w-full rounded-md border border-border-light bg-surface-primary p-2 text-sm text-text-primary"
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-project-preset">{localize('com_ui_default_preset')} (Optional)</Label>
            <select
              id="edit-project-preset"
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
              disabled={isSaving}
            >
              {localize('com_ui_cancel')}
            </Button>
            <Button type="submit" variant="default" disabled={isSaving || !name.trim()}>
              {isSaving ? localize('com_ui_saving') : localize('com_ui_save')}
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
};
