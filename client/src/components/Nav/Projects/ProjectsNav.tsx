import { useState, useCallback } from 'react';
import { FolderKanban } from 'lucide-react';
import { TooltipAnchor, Button } from '@librechat/client';
import type { FC } from 'react';
import useProjects from '~/hooks/Projects/useProjects';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { CreateProjectDialog } from '~/components/Chat/Menus/Projects/CreateProjectDialog';

type ProjectsNavProps = {
  // No props needed - this is just a button to create projects
};

const ProjectsNav: FC<ProjectsNavProps> = () => {
  const localize = useLocalize();
  const { createProject } = useProjects();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleClick = useCallback(() => {
    setShowCreateDialog(true);
  }, []);

  return (
    <>
      <TooltipAnchor
        description="New Project"
        render={
          <Button
            id="projects-nav-menu-button"
            size="icon"
            variant="outline"
            aria-label="New Project"
            className={cn(
              'flex items-center justify-center',
              'rounded-full border-none bg-transparent duration-0 hover:bg-surface-active-alt md:rounded-xl',
            )}
            data-testid="projects-menu"
            onClick={handleClick}
          >
            <FolderKanban 
              aria-hidden="true" 
              className="h-6 w-6 projects-nav-icon" 
              style={{ color: '#43b7a1' }} 
              strokeWidth={2.5} 
            />
          </Button>
        }
      />

      {showCreateDialog && (
        <CreateProjectDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreate={async (name, description, systemPrompt) => {
            await createProject(name, description, systemPrompt);
            setShowCreateDialog(false);
          }}
        />
      )}
    </>
  );
};

export default ProjectsNav;
