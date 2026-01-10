import { useState, useCallback } from 'react';
import { Plus, FolderKanban, Pencil, Trash2 } from 'lucide-react';
import { Button, OGDialog, OGDialogContent, OGDialogHeader, OGDialogTitle } from '@librechat/client';
import type { TProject } from 'librechat-data-provider';
import { useGetProjectsQuery } from '~/data-provider/queries';
import useProjects from '~/hooks/Projects/useProjects';
import { useLocalize } from '~/hooks';
import { CreateProjectDialog } from '~/components/Chat/Menus/Projects/CreateProjectDialog';
import { EditProjectDialog } from '~/components/Chat/Menus/Projects/EditProjectDialog';
import { cn } from '~/utils';

const ProjectsPanel = () => {
  const localize = useLocalize();
  const { data: projects = [] } = useGetProjectsQuery();
  const { createProject, renameProject, updateProject, handleDeleteProject, showDeleteDialog, setShowDeleteDialog, projectToDelete, confirmDeleteProject } = useProjects();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<TProject | null>(null);

  const handleCreate = useCallback(() => {
    setShowCreateDialog(true);
  }, []);

  const handleEdit = useCallback((project: TProject) => {
    setEditingProject(project);
  }, []);

  return (
    <div className="h-auto max-w-full overflow-x-visible p-3">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{localize('com_ui_projects')}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreate}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {localize('com_ui_create_project')}
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="py-8 text-center text-sm text-text-secondary">
          <FolderKanban className="mx-auto mb-2 h-12 w-12 text-text-tertiary" />
          <p>{localize('com_ui_no_projects')}</p>
          <p className="mt-2 text-xs text-text-tertiary">
            {localize('com_ui_create_project_to_get_started')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project._id}
              className="group flex items-center justify-between rounded-lg border border-border-light bg-surface-primary p-3 hover:bg-surface-secondary"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FolderKanban className="h-5 w-5 flex-shrink-0" style={{ color: '#43b7a1' }} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-text-primary truncate">{project.name}</h3>
                  {project.systemPrompt && (
                    <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                      {project.systemPrompt.substring(0, 60)}...
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(project)}
                  className="h-8 w-8"
                  aria-label={localize('com_ui_edit')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteProject(project)}
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  aria-label={localize('com_ui_delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateDialog && (
        <CreateProjectDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreate={async (name, systemPrompt, defaultPresetId) => {
            await createProject(name, systemPrompt, defaultPresetId);
            setShowCreateDialog(false);
          }}
        />
      )}

      {editingProject && (
        <EditProjectDialog
          open={!!editingProject}
          onOpenChange={(open) => {
            if (!open) {
              setEditingProject(null);
            }
          }}
          project={editingProject}
          onSave={async (updates) => {
            if (editingProject?._id) {
              if (updates.name && updates.name !== editingProject.name) {
                await renameProject(editingProject._id, updates.name);
              }
              await updateProject(editingProject._id, {
                systemPrompt: updates.systemPrompt,
                defaultPresetId: updates.defaultPresetId,
              });
            }
            setEditingProject(null);
          }}
        />
      )}

      {projectToDelete && (
        <OGDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
                onClick={() => setShowDeleteDialog(false)}
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
    </div>
  );
};

export default ProjectsPanel;
