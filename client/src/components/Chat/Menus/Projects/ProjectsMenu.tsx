import { useRef } from 'react';
import { FolderKanban } from 'lucide-react';
import { Content, Portal, Root, Trigger } from '@radix-ui/react-popover';
import {
  Button,
  OGDialog,
  TooltipAnchor,
  OGDialogTitle,
  OGDialogHeader,
  OGDialogContent,
} from '@librechat/client';
import type { FC } from 'react';
import { ProjectsList } from './ProjectsList';
import useProjects from '~/hooks/Projects/useProjects';
import { useLocalize } from '~/hooks';

const ProjectsMenu: FC = () => {
  const localize = useLocalize();
  const projectsMenuTriggerRef = useRef<HTMLDivElement>(null);
  const { projects, handleDeleteProject, showDeleteDialog, setShowDeleteDialog, projectToDelete, confirmDeleteProject } = useProjects();

  const handleDeleteDialogChange = (open: boolean) => {
    setShowDeleteDialog(open);
    if (!open && projectsMenuTriggerRef.current) {
      setTimeout(() => {
        projectsMenuTriggerRef.current?.focus();
      }, 0);
    }
  };

  return (
    <>
      <Root>
        <Trigger asChild>
          <TooltipAnchor
            ref={projectsMenuTriggerRef}
            description={localize('com_ui_projects')}
            render={
              <Button
                size="icon"
                variant="outline"
                tabIndex={0}
                id="projects-button"
                data-testid="projects-button"
                aria-label={localize('com_ui_projects')}
                className="rounded-xl bg-presentation p-2 duration-0 hover:bg-surface-active-alt"
              >
                <FolderKanban className="icon-lg" aria-hidden="true" />
              </Button>
            }
          />
        </Trigger>
        <Portal>
          <div
            style={{
              position: 'fixed',
              left: '0px',
              top: '0px',
              transform: 'translate3d(268px, 50px, 0px)',
              minWidth: 'max-content',
              zIndex: 'auto',
            }}
          >
            <Content
              side="bottom"
              align="center"
              className="mt-2 max-h-[495px] overflow-x-hidden rounded-lg border border-border-light bg-presentation text-text-primary shadow-lg md:min-w-[400px]"
            >
              <ProjectsList
                projects={projects}
                onDeleteProject={handleDeleteProject}
              />
            </Content>
          </div>
        </Portal>
      </Root>
      {projectToDelete && (
        <OGDialog open={showDeleteDialog} onOpenChange={handleDeleteDialogChange}>
          <OGDialogContent
            title={localize('com_ui_project_delete_confirm')}
            className="w-11/12 max-w-md"
            showCloseButton={false}
          >
            <OGDialogHeader>
              <OGDialogTitle>{localize('com_ui_delete_project')}</OGDialogTitle>
            </OGDialogHeader>
            <div className="w-full truncate">
              {localize('com_ui_delete_confirm_strong', { title: projectToDelete.name })}
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Button
                aria-label="cancel"
                variant="outline"
                onClick={() => handleDeleteDialogChange(false)}
              >
                {localize('com_ui_cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmDeleteProject}>
                {localize('com_ui_delete')}
              </Button>
            </div>
          </OGDialogContent>
        </OGDialog>
      )}
    </>
  );
};

export default ProjectsMenu;
