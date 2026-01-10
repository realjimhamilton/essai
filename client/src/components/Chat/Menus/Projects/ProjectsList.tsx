import { useState, type FC } from 'react';
import { Plus } from 'lucide-react';
import { MenuItem, MenuSeparator, TitleButton } from '../UI';
import type { TProject } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import useProjects from '~/hooks/Projects/useProjects';
import { CreateProjectDialog } from './CreateProjectDialog';
import { EditProjectDialog } from './EditProjectDialog';

type ProjectsListProps = {
  projects: TProject[];
  onDeleteProject: (project: TProject) => void;
};

export const ProjectsList: FC<ProjectsListProps> = ({ projects, onDeleteProject }) => {
  const localize = useLocalize();
  const { handleEditProject, createProject, renameProject, updateProject } = useProjects();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<TProject | null>(null);

  const handleEdit = (project: TProject) => {
    setEditingProject(project);
  };

  const handleCreate = () => {
    setShowCreateDialog(true);
  };

  return (
    <>
      <div
        role="menuitem"
        className="pointer-none group m-1.5 flex h-8 min-w-[170px] gap-2 rounded px-5 py-2.5 !pr-3 text-sm !opacity-100 focus:ring-0 radix-disabled:pointer-events-none radix-disabled:opacity-50 md:min-w-[240px]"
        tabIndex={-1}
      >
        <div className="flex h-full grow items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCreate}
            className="flex cursor-pointer items-center gap-2 rounded bg-transparent px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:ring-ring dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            aria-label={localize('com_ui_create_project')}
          >
            <Plus className="size-4" />
            {localize('com_ui_create_project')}
          </button>
        </div>
      </div>
      <MenuSeparator />
      {projects.length === 0 ? (
        <div
          role="menuitem"
          className="pointer-none group m-1.5 flex h-8 min-w-[170px] gap-2 rounded px-5 py-2.5 !pr-3 text-sm !opacity-100 focus:ring-0 radix-disabled:pointer-events-none radix-disabled:opacity-50 md:min-w-[240px]"
          tabIndex={-1}
        >
          <div className="flex h-full grow items-center justify-end gap-2 text-gray-600 dark:text-gray-300">
            {localize('com_ui_no_projects')}
          </div>
        </div>
      ) : (
        projects.map((project, index) => (
          <div key={project._id || index}>
            <MenuItem
              textClassName="text-xs max-w-[150px] sm:max-w-[200px] truncate md:max-w-full"
              title={project.name}
              onClick={() => {
                // Navigate to project conversations - will be handled by parent
              }}
              selected={false}
            >
              <div className="flex h-full items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(project);
                  }}
                  className="flex cursor-pointer items-center rounded bg-transparent px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:ring-ring dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                  aria-label={localize('com_ui_edit')}
                >
                  {localize('com_ui_edit')}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project);
                  }}
                  className="flex cursor-pointer items-center rounded bg-transparent px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-red-700 focus:ring-ring dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-red-700"
                  aria-label={localize('com_ui_delete')}
                >
                  {localize('com_ui_delete')}
                </button>
              </div>
            </MenuItem>
            {index < projects.length - 1 && <MenuSeparator />}
          </div>
        ))
      )}
      {showCreateDialog && (
        <CreateProjectDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreate={async (name, systemPrompt, defaultPresetId, ragFileIds) => {
            await createProject(name, systemPrompt, defaultPresetId, ragFileIds);
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
    </>
  );
};
