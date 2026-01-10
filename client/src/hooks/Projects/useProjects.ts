import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from 'librechat-data-provider';
import type { TProject } from 'librechat-data-provider';
import {
  useGetProjectsQuery,
} from '~/data-provider/queries';
import {
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useRenameProjectMutation,
  useDeleteProjectMutation,
} from '~/data-provider/mutations';
import { useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';

export default function useProjects() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const projectsQuery = useGetProjectsQuery();
  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();
  const renameMutation = useRenameProjectMutation();
  const deleteMutation = useDeleteProjectMutation();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<TProject | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<TProject | null>(null);

  const createProject = useCallback(
    async (name: string, description?: string, systemPrompt?: string, ragFileIds?: string[]) => {
      try {
        const project = await createMutation.mutateAsync({
          name,
          description: description || null,
          systemPrompt: systemPrompt || null,
          ragFileIds: ragFileIds || [],
        });
        showToast({
          message: 'Project Created',
          showIcon: false,
        });
        return project;
      } catch (error) {
        showToast({
          message: localize('com_ui_project_create_error'),
          showIcon: true,
          status: 'error',
        });
        throw error;
      }
    },
    [createMutation, showToast, localize],
  );

  const renameProject = useCallback(
    async (projectId: string, newName: string) => {
      try {
        const project = await renameMutation.mutateAsync({ projectId, name: newName });
        showToast({
          message: localize('com_ui_project_renamed', { name: project.name }),
          showIcon: false,
        });
        return project;
      } catch (error) {
        showToast({
          message: localize('com_ui_project_rename_error'),
          showIcon: true,
          status: 'error',
        });
        throw error;
      }
    },
    [renameMutation, showToast, localize],
  );

  const updateProject = useCallback(
    async (
      projectId: string,
      updates: { description?: string; systemPrompt?: string; ragFileIds?: string[] },
    ) => {
      try {
        const project = await updateMutation.mutateAsync({ projectId, payload: updates });
        showToast({
          message: localize('com_ui_project_updated'),
          showIcon: false,
        });
        return project;
      } catch (error) {
        showToast({
          message: localize('com_ui_project_update_error'),
          showIcon: true,
          status: 'error',
        });
        throw error;
      }
    },
    [updateMutation, showToast, localize],
  );

  const handleDeleteProject = useCallback(
    (project: TProject) => {
      setProjectToDelete(project);
      setShowDeleteDialog(true);
    },
    [],
  );

  const confirmDeleteProject = useCallback(async () => {
    if (!projectToDelete?._id) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(projectToDelete._id);
      showToast({
        message: localize('com_ui_project_deleted', { name: projectToDelete.name }),
        showIcon: false,
      });
      setShowDeleteDialog(false);
      setProjectToDelete(null);
    } catch (error) {
      showToast({
        message: localize('com_ui_project_delete_error'),
        showIcon: true,
        status: 'error',
      });
    }
  }, [projectToDelete, deleteMutation, showToast, localize]);

  const handleEditProject = useCallback((project: TProject) => {
    setProjectToEdit(project);
    setShowEditDialog(true);
  }, []);

  return {
    projectsQuery,
    projects: projectsQuery.data || [],
    createProject,
    renameProject,
    updateProject,
    handleDeleteProject,
    handleEditProject,
    showDeleteDialog,
    setShowDeleteDialog,
    projectToDelete,
    confirmDeleteProject,
    showEditDialog,
    setShowEditDialog,
    projectToEdit,
    isLoading: createMutation.isLoading || updateMutation.isLoading || deleteMutation.isLoading,
  };
}
