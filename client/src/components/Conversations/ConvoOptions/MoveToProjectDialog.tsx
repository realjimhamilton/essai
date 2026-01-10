import { useState, useEffect } from 'react';
import { OGDialog, OGDialogContent, OGDialogHeader, OGDialogTitle, Button } from '@librechat/client';
import { useGetProjectsQuery } from '~/data-provider/queries';
import type { TProject } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';

type MoveToProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (projectId: string | null) => void;
  currentProjectId?: string | null;
  conversationTitle?: string;
};

export const MoveToProjectDialog: React.FC<MoveToProjectDialogProps> = ({
  open,
  onOpenChange,
  onMove,
  currentProjectId,
  conversationTitle,
}) => {
  const localize = useLocalize();
  const { data: projects = [] } = useGetProjectsQuery();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedProjectId(currentProjectId || null);
    }
  }, [open, currentProjectId]);

  const handleMove = async () => {
    setIsMoving(true);
    try {
      await onMove(selectedProjectId);
      onOpenChange(false);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent
        className="w-11/12 max-w-md"
        title="Move to Project"
        showCloseButton={true}
      >
        <OGDialogHeader>
          <OGDialogTitle>Move to Project</OGDialogTitle>
        </OGDialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-secondary">
              {conversationTitle
                ? `Move "${conversationTitle}" to a project:`
                : 'Select a project to move this conversation to:'}
            </p>
          </div>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            <button
              onClick={() => setSelectedProjectId(null)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                selectedProjectId === null
                  ? 'bg-surface-active-alt text-text-primary'
                  : 'text-text-secondary hover:bg-surface-active-alt hover:text-text-primary'
              }`}
            >
              <span className="text-sm">No Project</span>
            </button>
            {projects.map((project: TProject) => (
              <button
                key={project._id}
                onClick={() => setSelectedProjectId(project._id || null)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedProjectId === project._id
                    ? 'bg-surface-active-alt text-text-primary'
                    : 'text-text-secondary hover:bg-surface-active-alt hover:text-text-primary'
                }`}
              >
                <span className="text-sm">{project.name}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isMoving}
            >
              Cancel
            </Button>
            <Button type="button" variant="default" onClick={handleMove} disabled={isMoving}>
              {isMoving ? 'Moving...' : 'Move'}
            </Button>
          </div>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
};
