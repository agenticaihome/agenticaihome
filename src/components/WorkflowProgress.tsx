'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { getWorkflowExecution, type WorkflowExecution } from '@/lib/workflows';
import { formatDate } from '@/lib/dateUtils';
import { CheckCircle, Clock, Circle, ArrowRight, Workflow as WorkflowIcon, Target } from 'lucide-react';
import Link from 'next/link';

interface WorkflowProgressProps {
  task: Task;
  className?: string;
}

export default function WorkflowProgress({ task, className = '' }: WorkflowProgressProps) {
  const [workflowExecution, setWorkflowExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWorkflowData = async () => {
      if (!task.workflow_id) {
        setLoading(false);
        return;
      }

      try {
        const execution = await getWorkflowExecution(task.workflow_id);
        setWorkflowExecution(execution);
      } catch (error) {
        console.error('Failed to load workflow data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkflowData();
  }, [task.workflow_id]);

  // Don't render if not a workflow task
  if (!task.workflow_id || !task.workflow_step !== undefined) {
    return null;
  }

  if (loading) {
    return (
      <div className={`bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-purple-500/20 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-purple-500/20 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!workflowExecution) {
    return null;
  }

  const currentStep = task.workflow_step || 0;
  const totalSteps = workflowExecution.tasks.length;
  const completedSteps = workflowExecution.tasks.filter(t => t.status === 'completed').length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  const getTaskStatusIcon = (task: Task, index: number) => {
    if (task.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    } else if (task.status === 'in_progress' || task.status === 'review') {
      return <Clock className="w-5 h-5 text-blue-400" />;
    } else if (task.status === 'open' || task.status === 'funded') {
      return <Target className="w-5 h-5 text-purple-400" />;
    } else if (task.status === 'pending') {
      return <Circle className="w-5 h-5 text-gray-400" />;
    } else {
      return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTaskStatusColor = (task: Task) => {
    if (task.status === 'completed') return 'text-green-400';
    if (task.status === 'in_progress' || task.status === 'review') return 'text-blue-400';
    if (task.status === 'open' || task.status === 'funded') return 'text-purple-400';
    return 'text-gray-400';
  };

  return (
    <div className={`bg-purple-500/10 border border-purple-500/30 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <WorkflowIcon className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="text-white font-semibold">
              {workflowExecution.tasks[0]?.metadata?.workflowName || 'Workflow Pipeline'}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Step {currentStep + 1} of {totalSteps}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-purple-400 font-medium">{progressPercentage}% Complete</div>
          <div className="text-xs text-[var(--text-muted)]">
            {completedSteps} / {totalSteps} steps done
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-[var(--bg-card)] rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="space-y-3">
        {workflowExecution.tasks.map((workflowTask, index) => {
          const isCurrentTask = workflowTask.id === task.id;
          const isDependentTask = workflowTask.depends_on_task_id;
          
          return (
            <div key={workflowTask.id}>
              <div className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                isCurrentTask 
                  ? 'bg-purple-600/20 border border-purple-500/40' 
                  : 'bg-[var(--bg-card)]/30 hover:bg-[var(--bg-card)]/50'
              }`}>
                {/* Step indicator */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0">
                    {getTaskStatusIcon(workflowTask, index)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-medium truncate ${
                        isCurrentTask ? 'text-white' : getTaskStatusColor(workflowTask)
                      }`}>
                        {workflowTask.title}
                      </h4>
                      {isCurrentTask && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full flex-shrink-0">
                          Current
                        </span>
                      )}
                      {isDependentTask && (
                        <span className="text-orange-400 text-xs flex-shrink-0">
                          Depends on #{workflowExecution.tasks.findIndex(t => t.id === isDependentTask) + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] mt-1">
                      <span>Step {index + 1}</span>
                      <span>{workflowTask.budgetErg.toFixed(2)} ERG</span>
                      <span className="capitalize">{workflowTask.status.replace('_', ' ')}</span>
                      {workflowTask.assignedAgentName && (
                        <span>Assigned: {workflowTask.assignedAgentName}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isCurrentTask && (
                    <Link
                      href={`/tasks/detail?id=${workflowTask.id}&workflow=true`}
                      className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-purple-300 border border-[var(--border-color)] hover:border-purple-500/40 rounded-lg transition-colors"
                    >
                      View
                    </Link>
                  )}
                  {workflowTask.status === 'completed' && (
                    <div className="text-green-400 text-xs font-medium">
                      ✓ Done {formatDate(workflowTask.completedAt || '')}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Arrow connector */}
              {index < workflowExecution.tasks.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Workflow Status */}
      <div className="mt-6 pt-4 border-t border-purple-500/20">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-[var(--text-secondary)]">
              Started: {formatDate(workflowExecution.createdAt)}
            </span>
            {workflowExecution.status === 'completed' && workflowExecution.completedAt && (
              <span className="text-green-400">
                Completed: {formatDate(workflowExecution.completedAt)}
              </span>
            )}
          </div>
          <div className="text-[var(--text-secondary)]">
            Total Budget: {workflowExecution.totalBudgetErg.toFixed(2)} ERG
            {workflowExecution.totalBudgetUsd && (
              <span className="text-[var(--text-muted)] ml-1">
                (${workflowExecution.totalBudgetUsd.toFixed(2)})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}