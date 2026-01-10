import { useState, useEffect } from 'react';
import { OGDialog, OGDialogContent, OGDialogHeader, OGDialogTitle, Button, Input, Label } from '@librechat/client';

type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description?: string, systemPrompt?: string, ragFileIds?: string[]) => Promise<void>;
};

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  open,
  onOpenChange,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setSystemPrompt('');
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
        description.trim() || undefined,
        systemPrompt.trim() || undefined,
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
        title="Create New Project"
        showCloseButton={true}
      >
        <OGDialogHeader>
          <OGDialogTitle>Create New Project</OGDialogTitle>
        </OGDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-description">Description</Label>
            <Input
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-system-prompt">Custom Instructions</Label>
            <textarea
              id="project-system-prompt"
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
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={isCreating || !name.trim()}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
};
