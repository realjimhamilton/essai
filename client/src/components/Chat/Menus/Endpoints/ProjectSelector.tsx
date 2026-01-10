import React from 'react';
import { TooltipAnchor } from '@librechat/client';
import { Constants } from 'librechat-data-provider';
import type { ModelSelectorProps } from '~/common';
import { useChatContext } from '~/Providers';
import { useLocalize } from '~/hooks';
import { useGetProjectsQuery, useUpdateConversationMutation } from '~/data-provider';
import { cn } from '~/utils';
import { CustomMenu as Menu } from './CustomMenu';
import type { TProject } from 'librechat-data-provider';

function ProjectSelectorContent() {
  const localize = useLocalize();
  const { conversation, setConversation } = useChatContext();
  const { data: projects = [], isLoading } = useGetProjectsQuery();
  const conversationId = conversation?.conversationId;
  const updateConversationMutation = useUpdateConversationMutation(conversationId || '');

  const selectedProjectId = conversation?.project_id || null;
  const selectedProject = selectedProjectId
    ? projects.find((p: TProject) => p._id === selectedProjectId)
    : null;

  const handleSelectProject = async (projectId: string | null) => {
    if (!conversation) {
      return;
    }

    const isNewConversation = !conversationId || conversationId === Constants.NEW_CONVO;

    if (isNewConversation) {
      // For new conversations, update the conversation state directly
      setConversation({
        ...conversation,
        project_id: projectId,
      });
    } else {
      // For existing conversations, update via API
      try {
        await updateConversationMutation.mutateAsync({
          conversationId,
          project_id: projectId,
        });
      } catch (error) {
        // Error handling is done in the mutation
      }
    }
  };

  const trigger = (
    <TooltipAnchor
      aria-label="Choose Project"
      description="Choose Project"
      render={
        <button
          className="my-1 flex h-10 w-full max-w-[70vw] items-center justify-center gap-2 rounded-xl border border-border-light bg-presentation px-3 py-2 text-sm text-text-primary hover:bg-surface-active-alt"
          aria-label="Choose Project"
        >
          <span className="flex-grow truncate text-left">
            {selectedProject?.name || 'Choose Project'}
          </span>
        </button>
      }
    />
  );

  if (isLoading) {
    return (
      <div className="my-1 flex h-10 w-full max-w-[70vw] items-center justify-center rounded-xl border border-border-light bg-presentation px-3 py-2 text-sm text-text-secondary">
        {localize('com_ui_loading') || 'Loading...'}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="my-1 flex h-10 w-full max-w-[70vw] items-center justify-center rounded-xl border border-border-light bg-presentation px-3 py-2 text-sm text-text-secondary">
        {localize('com_ui_no_projects_available') || 'No projects available'}
      </div>
    );
  }

  return (
    <div className="relative flex w-full max-w-md flex-col items-center gap-2">
      <Menu
        values={{ project_id: selectedProjectId || '' }}
        onValuesChange={(values: Record<string, any>) => {
          if (values.project_id) {
            handleSelectProject(values.project_id);
          }
        }}
        trigger={trigger}
        placement="bottom-start"
      >
        {projects.map((project: TProject) => {
          const isSelected = project._id === selectedProjectId;
          return (
            <div
              key={project._id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-active-alt',
                isSelected && 'bg-surface-active',
              )}
              onClick={() => handleSelectProject(project._id || null)}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-text-primary">{project.name}</span>
                {project.description && (
                  <span className="text-xs text-text-secondary line-clamp-1">
                    {project.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </Menu>
    </div>
  );
}

export default function ProjectSelector({ startupConfig }: ModelSelectorProps) {
  return <ProjectSelectorContent />;
}
