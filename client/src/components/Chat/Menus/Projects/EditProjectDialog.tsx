import { useState, useEffect } from 'react';
import { OGDialog, OGDialogContent, OGDialogHeader, OGDialogTitle, Button, Input, Label } from '@librechat/client';
import type { TProject } from 'librechat-data-provider';

type EditProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: TProject;
  onSave: (updates: { name?: string; description?: string; systemPrompt?: string }) => Promise<void>;
};

export const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  open,
  onOpenChange,
  project,
  onSave,
}) => {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [systemPrompt, setSystemPrompt] = useState(project.systemPrompt || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && project) {
      setName(project.name);
      setDescription(project.description || '');
      setSystemPrompt(project.systemPrompt || '');
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
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent
        className="w-11/12 max-w-lg"
        title="Edit Project"
        showCloseButton={true}
      >
        <OGDialogHeader>
          <OGDialogTitle>Edit Project</OGDialogTitle>
        </OGDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-project-name">Project Name</Label>
            <Input
              id="edit-project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-project-description">Description</Label>
            <Input
              id="edit-project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-project-system-prompt">Custom Instructions</Label>
            <textarea
              id="edit-project-system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-[100px] w-full rounded-md border border-border-light bg-surface-primary p-2 text-sm text-text-primary"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={isSaving || !name.trim()}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
};
