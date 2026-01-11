import React, { useMemo } from 'react';
import { TooltipAnchor } from '@librechat/client';
import { SystemRoles } from 'librechat-data-provider';
import type { ModelSelectorProps } from '~/common';
import { useAgentsMapContext, useChatContext } from '~/Providers';
import { useAuthContext, useLocalize, useSelectAgent } from '~/hooks';
import { cn } from '~/utils';
import { CustomMenu as Menu } from './CustomMenu';

// Fixed order for agents
const AGENT_ORDER = [
  'Avatar Bot',
  'Voice Cloning Bot',
  'Email Storyselling Bot',
  'Ad Copy Bot',
  'Thank You Page Funnel Bot',
];

function BotSelectorContent() {
  const localize = useLocalize();
  const { conversation, getMessages, latestMessage } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const { user } = useAuthContext();
  const { onSelect } = useSelectAgent();

  const isAdmin = user?.role === SystemRoles.ADMIN;

  // Check if conversation has messages (has started)
  // Use latestMessage as a proxy - if it exists, conversation has started
  const hasMessages = useMemo(() => {
    if (!getMessages) return false;
    const messages = getMessages() || [];
    return messages.length > 0;
  }, [getMessages, latestMessage?.messageId, conversation?.conversationId]);

  // Filter to only show deployed agents for non-admin users
  const deployedAgents = useMemo(() => {
    if (!agentsMap || typeof agentsMap !== 'object') return {};
    if (isAdmin) return agentsMap; // Admins see all agents

    const filtered: typeof agentsMap = {};
    for (const [id, agent] of Object.entries(agentsMap)) {
      if (agent && agent.isDeployed) {
        filtered[id] = agent;
      }
    }
    return filtered;
  }, [agentsMap, isAdmin]);

  const agentList = useMemo(() => {
    const agents = Object.values(deployedAgents || {});
    
    // Create a map for quick lookup
    const agentMap = new Map(agents.map(agent => [(agent.name || '').trim().toLowerCase(), agent]));
    const orderedAgents: typeof agents = [];
    
    // Add agents in the exact order specified in AGENT_ORDER
    for (const orderName of AGENT_ORDER) {
      const agent = agentMap.get(orderName.toLowerCase());
      if (agent) {
        orderedAgents.push(agent);
        agentMap.delete(orderName.toLowerCase());
      }
    }
    
    // Add any remaining agents (not in AGENT_ORDER) sorted alphabetically
    const remainingAgents = Array.from(agentMap.values()).sort((a, b) => {
      const nameA = (a.name || '').trim();
      const nameB = (b.name || '').trim();
      return nameA.localeCompare(nameB);
    });
    orderedAgents.push(...remainingAgents);
    
    console.log('Agent list BEFORE reverse:', orderedAgents.map(a => a.name));
    const reversed = [...orderedAgents].reverse();
    console.log('Agent list AFTER reverse:', reversed.map(a => a.name));
    return reversed;
  }, [deployedAgents]);

  const selectedAgentId = conversation?.agent_id;
  const selectedAgent = selectedAgentId ? deployedAgents?.[selectedAgentId] : null;

  const handleSelectAgent = (agentId: string) => {
    if (hasMessages) {
      return; // Prevent agent switching after conversation has started
    }
    onSelect(agentId);
  };

  const trigger = (
    <TooltipAnchor
      aria-label={localize('com_ui_select_bot')}
      description={localize('com_ui_select_bot')}
      render={
        <button
          className={cn(
            "my-1 flex h-10 w-full max-w-[70vw] items-center justify-center gap-2 rounded-xl border border-border-light bg-presentation px-3 py-2 text-sm text-text-primary",
            hasMessages ? "opacity-50 cursor-not-allowed" : "hover:bg-surface-active-alt"
          )}
          aria-label={localize('com_ui_select_bot')}
          disabled={hasMessages}
        >
          {selectedAgent?.avatar ? (
            <img
              src={selectedAgent.avatar.source || selectedAgent.avatar.filepath}
              alt={selectedAgent.name || ''}
              className="h-6 w-6 rounded"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-200 text-gray-600">
              <span className="text-xs">🤖</span>
            </div>
          )}
          <span className="flex-grow truncate text-left">
            {selectedAgent?.name || localize('com_ui_select_bot')}
          </span>
        </button>
      }
    />
  );

  if (agentList.length === 0) {
    return (
      <div className="my-1 flex h-10 w-full max-w-[70vw] items-center justify-center rounded-xl border border-border-light bg-presentation px-3 py-2 text-sm text-text-secondary">
        {localize('com_ui_no_bots_available')}
      </div>
    );
  }

  return (
    <div className="relative flex w-full max-w-md flex-col items-center gap-2">
      {hasMessages ? (
        <div className="w-full">
          {trigger}
        </div>
      ) : (
        <Menu
          values={{ agent_id: selectedAgentId || '' }}
          onValuesChange={(values: Record<string, any>) => {
            if (values.agent_id) {
              handleSelectAgent(values.agent_id);
            }
          }}
          trigger={trigger}
        >
        {agentList.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          return (
            <div
              key={agent.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-active-alt',
                isSelected && 'bg-surface-active',
              )}
              onClick={() => handleSelectAgent(agent.id)}
            >
              {agent.avatar ? (
                <img
                  src={agent.avatar.source || agent.avatar.filepath}
                  alt={agent.name || ''}
                  className="h-8 w-8 rounded"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-200 text-gray-600">
                  <span className="text-sm">🤖</span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-text-primary">{agent.name}</span>
                {agent.description && (
                  <span className="text-xs text-text-secondary line-clamp-1">{agent.description}</span>
                )}
              </div>
            </div>
          );
        })}
        </Menu>
      )}
    </div>
  );
}

export default function BotSelector({ startupConfig }: ModelSelectorProps) {
  const { user } = useAuthContext();
  const isAdmin = user?.role === SystemRoles.ADMIN;

  // For non-admin users, show BotSelector instead of ModelSelector
  if (isAdmin || !user) {
    return null; // Admins will use ModelSelector, or return null if not authenticated
  }

  return <BotSelectorContent />;
}
