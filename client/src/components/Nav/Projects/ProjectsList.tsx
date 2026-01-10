import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, FolderKanban, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button, OGDialog, OGDialogContent, OGDialogHeader, OGDialogTitle } from '@librechat/client';
import type { TProject, TConversation } from 'librechat-data-provider';
import { useGetProjectsQuery, useConversationsInfiniteQuery } from '~/data-provider/queries';
import useProjects from '~/hooks/Projects/useProjects';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { CreateProjectDialog } from '~/components/Chat/Menus/Projects/CreateProjectDialog';
import { EditProjectDialog } from '~/components/Chat/Menus/Projects/EditProjectDialog';
import Convo from '~/components/Conversations/Convo';
import { useNavigate } from 'react-router-dom';

type ProjectsListProps = {
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
  toggleNav?: () => void;
};

const ProjectsList: React.FC<ProjectsListProps> = ({ selectedProjectId, setSelectedProjectId, toggleNav }) => {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { data: projects = [] } = useGetProjectsQuery();
  const { createProject, renameProject, updateProject, handleDeleteProject, showDeleteDialog, setShowDeleteDialog, projectToDelete, confirmDeleteProject } = useProjects();
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<TProject | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    setShowCreateDialog(true);
  }, []);

  const handleEdit = useCallback((project: TProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
  }, []);

  const handleDelete = useCallback((project: TProject, e: React.MouseEvent) => {
    e.stopPropagation();
    handleDeleteProject(project);
  }, [handleDeleteProject]);

  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const retainView = useCallback(() => {
    // This is called when a conversation is clicked to maintain scroll position
  }, []);

  return (
    <>
      <div className="mb-2 border-b border-border-light pb-2">
        <div
          className="group flex items-center justify-between px-2 py-1.5 hover:bg-surface-active-alt rounded-lg cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-text-secondary" />
            ) : (
              <ChevronRight className="h-4 w-4 text-text-secondary" />
            )}
            <FolderKanban className="h-4 w-4" style={{ color: '#43b7a1' }} strokeWidth={2.5} />
            <span className="text-sm font-medium text-text-primary">Projects</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              handleCreate();
            }}
            aria-label={localize('com_ui_create_project') || 'Create Project'}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-1 space-y-0.5">
            {projects.map((project) => {
              const projectId = project._id || '';
              const isProjectExpanded = expandedProjects.has(projectId);
              const isSelected = selectedProjectId === projectId;
              
              return (
                <ProjectItem
                  key={projectId}
                  project={project}
                  isExpanded={isProjectExpanded}
                  isSelected={isSelected}
                  onToggle={() => toggleProject(projectId)}
                  onSelect={() => setSelectedProjectId(projectId === selectedProjectId ? null : projectId)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  hoveredProject={hoveredProject}
                  setHoveredProject={setHoveredProject}
                  toggleNav={toggleNav}
                  retainView={retainView}
                />
              );
            })}
          </div>
        )}
      </div>

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
    </>
  );
};

type ProjectItemProps = {
  project: TProject;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onEdit: (project: TProject, e: React.MouseEvent) => void;
  onDelete: (project: TProject, e: React.MouseEvent) => void;
  hoveredProject: string | null;
  setHoveredProject: (projectId: string | null) => void;
  toggleNav?: () => void;
  retainView: () => void;
};

const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  hoveredProject,
  setHoveredProject,
  toggleNav,
  retainView,
}) => {
  const localize = useLocalize();
  const projectId = project._id || '';
  
  const { data, isLoading } = useConversationsInfiniteQuery(
    {
      project_id: projectId,
    },
    {
      enabled: isExpanded && !!projectId,
      staleTime: 30000,
    },
  );

  const conversations = React.useMemo(() => {
    return data ? data.pages.flatMap((page) => page.conversations).filter(Boolean) as TConversation[] : [];
  }, [data]);

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'group flex items-center justify-between px-2 py-1.5 text-sm rounded-lg transition-colors',
          isSelected
            ? 'bg-surface-active-alt text-text-primary'
            : 'text-text-secondary hover:bg-surface-active-alt hover:text-text-primary'
        )}
        onMouseEnter={() => setHoveredProject(projectId)}
        onMouseLeave={() => setHoveredProject(null)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0" onClick={onToggle}>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
          )}
          <FolderKanban className="h-3 w-3 flex-shrink-0" style={{ color: '#43b7a1' }} strokeWidth={2.5} />
          <span className="truncate flex-1" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
            {project.name}
          </span>
        </div>
        {hoveredProject === projectId && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => onEdit(project, e)}
              aria-label={localize('com_ui_edit') || 'Edit'}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-600 hover:text-red-700"
              onClick={(e) => onDelete(project, e)}
              aria-label={localize('com_ui_delete') || 'Delete'}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="ml-4 mt-0.5 space-y-0.5">
          {isLoading ? (
            <div className="px-2 py-1 text-xs text-text-secondary">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="px-2 py-1 text-xs text-text-secondary opacity-50">No conversations</div>
          ) : (
            conversations.map((conversation) => (
              <Convo
                key={conversation.conversationId}
                conversation={conversation}
                retainView={retainView}
                toggleNav={toggleNav}
                isGenerating={false}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectsList;
