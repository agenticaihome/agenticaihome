import { createClient } from '@supabase/supabase-js';
import { Task } from './types';
import { createTask } from './supabaseStore';

const supabase = createClient(
  'https://thjialaevqwyiyyhbdxk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoamlhbGFldnF3eWl5eWhiZHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4Njk5MjEsImV4cCI6MjA1NDQ0NTkyMX0.gJaS3LMgfLOPLR7Gq0aIjbpNg4KGSKk4CbpWbqoR1Hk'
);

export interface WorkflowStep {
  title: string;
  description: string;
  skillsRequired: string[];
  budgetPercentage: number;
  dependsOn?: number; // Index of the step this depends on
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt?: string;
  createdBy?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  totalBudgetErg: number;
  totalBudgetUsd?: number;
  creatorAddress: string;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  tasks: Task[];
}

/**
 * Create all tasks in a workflow sequence
 * Only the first task (or tasks with no dependencies) will be 'open'
 * All others will be 'pending' until their dependencies complete
 */
export async function createWorkflowTasks(
  workflow: Workflow,
  totalBudgetErg: number,
  totalBudgetUsd: number,
  creatorAddress: string,
  creatorName?: string
): Promise<WorkflowExecution> {
  const workflowExecutionId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const createdTasks: Task[] = [];

  try {
    // Create tasks in order, building dependencies
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const stepBudgetErg = Math.round((totalBudgetErg * step.budgetPercentage) / 100 * 1000) / 1000;
      const stepBudgetUsd = totalBudgetUsd ? Math.round((totalBudgetUsd * step.budgetPercentage) / 100 * 100) / 100 : undefined;
      
      // Determine task status
      let taskStatus: Task['status'] = 'open';
      let dependsOnTaskId: string | undefined;
      
      if (step.dependsOn !== undefined && step.dependsOn < i) {
        // This task depends on a previous step
        taskStatus = 'open';
        dependsOnTaskId = createdTasks[step.dependsOn].id;
      }
      
      // Create the task
      const taskPayload = {
        title: step.title,
        description: step.description,
        skillsRequired: step.skillsRequired,
        budgetErg: stepBudgetErg,
        budgetUsd: stepBudgetUsd,
        creatorName,
        metadata: {
          workflowId: workflowExecutionId,
          workflowStep: i,
          workflowName: workflow.name,
          dependsOnTaskId
        }
      };

      const newTask = await createTask(taskPayload, creatorAddress);
      
      // Update task status and workflow fields
      if (dependsOnTaskId) {
        await supabase
          .from('tasks')
          .update({
            status: taskStatus,
            workflow_id: workflowExecutionId,
            workflow_step: i,
            depends_on_task_id: dependsOnTaskId
          })
          .eq('id', newTask.id);
        
        // Update the task object to reflect the changes
        newTask.status = taskStatus;
        (newTask as any).workflow_id = workflowExecutionId;
        (newTask as any).workflow_step = i;
        (newTask as any).depends_on_task_id = dependsOnTaskId;
      } else {
        // Just set workflow fields for open tasks
        await supabase
          .from('tasks')
          .update({
            workflow_id: workflowExecutionId,
            workflow_step: i
          })
          .eq('id', newTask.id);
        
        (newTask as any).workflow_id = workflowExecutionId;
        (newTask as any).workflow_step = i;
      }

      createdTasks.push(newTask);
    }

    const workflowExecution: WorkflowExecution = {
      id: workflowExecutionId,
      workflowId: workflow.id,
      totalBudgetErg,
      totalBudgetUsd,
      creatorAddress,
      status: 'active',
      createdAt: new Date().toISOString(),
      tasks: createdTasks
    };

    return workflowExecution;
    
  } catch (error) {
    console.error('Error creating workflow tasks:', error);
    throw new Error('Failed to create workflow tasks');
  }
}

/**
 * Handle task completion - check for next tasks in the workflow and activate them
 */
export async function onTaskComplete(taskId: string): Promise<void> {
  try {
    // Get the completed task
    const { data: completedTask, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !completedTask) {
      console.error('Failed to get completed task:', error);
      return;
    }

    // Check if this task is part of a workflow
    if (!completedTask.workflow_id) {
      return; // Not a workflow task, nothing to do
    }

    // Find all pending tasks that depend on this task
    const { data: dependentTasks, error: dependentError } = await supabase
      .from('tasks')
      .select('*')
      .eq('depends_on_task_id', taskId)
      .eq('status', 'pending');

    if (dependentError) {
      console.error('Failed to get dependent tasks:', dependentError);
      return;
    }

    if (!dependentTasks || dependentTasks.length === 0) {
      // Check if this was the last task in the workflow
      await checkWorkflowCompletion(completedTask.workflow_id);
      return;
    }

    // Update each dependent task to 'open' status
    for (const dependentTask of dependentTasks) {
      await supabase
        .from('tasks')
        .update({ status: 'open' })
        .eq('id', dependentTask.id);
    }

    console.log(`Activated ${dependentTasks.length} dependent tasks for workflow ${completedTask.workflow_id}`);
    
  } catch (error) {
    console.error('Error in onTaskComplete:', error);
  }
}

/**
 * Check if a workflow is complete (all tasks completed)
 */
async function checkWorkflowCompletion(workflowId: string): Promise<void> {
  try {
    const { data: workflowTasks, error } = await supabase
      .from('tasks')
      .select('status')
      .eq('workflow_id', workflowId);

    if (error || !workflowTasks) {
      console.error('Failed to get workflow tasks:', error);
      return;
    }

    const allCompleted = workflowTasks.every(task => task.status === 'completed');
    
    if (allCompleted) {
      console.log(`Workflow ${workflowId} completed successfully!`);
      // Here you could add notifications, update workflow status, etc.
    }
    
  } catch (error) {
    console.error('Error checking workflow completion:', error);
  }
}

/**
 * Get workflow execution status
 */
export async function getWorkflowExecution(workflowId: string): Promise<WorkflowExecution | null> {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('workflow_step');

    if (error || !tasks || tasks.length === 0) {
      return null;
    }

    const firstTask = tasks[0];
    const totalBudgetErg = tasks.reduce((sum, task) => sum + task.budgetErg, 0);
    const totalBudgetUsd = tasks.reduce((sum, task) => sum + (task.budgetUsd || 0), 0);

    // Determine workflow status
    let status: WorkflowExecution['status'] = 'active';
    if (tasks.every(task => task.status === 'completed')) {
      status = 'completed';
    } else if (tasks.some(task => task.status === 'cancelled' || task.status === 'disputed')) {
      status = 'failed';
    }

    const workflowExecution: WorkflowExecution = {
      id: workflowId,
      workflowId: firstTask.metadata?.workflowName || workflowId,
      totalBudgetErg,
      totalBudgetUsd: totalBudgetUsd > 0 ? totalBudgetUsd : undefined,
      creatorAddress: firstTask.creatorAddress,
      status,
      createdAt: firstTask.createdAt,
      completedAt: status === 'completed' ? tasks[tasks.length - 1].completedAt : undefined,
      tasks: tasks as Task[]
    };

    return workflowExecution;
    
  } catch (error) {
    console.error('Error getting workflow execution:', error);
    return null;
  }
}

/**
 * Get workflow progress (percentage complete)
 */
export function getWorkflowProgress(tasks: Task[]): { completed: number; total: number; percentage: number } {
  const total = tasks.length;
  const completed = tasks.filter(task => task.status === 'completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { completed, total, percentage };
}

/**
 * Cancel a workflow - cancel all pending/open tasks
 */
export async function cancelWorkflow(workflowId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'cancelled' })
      .eq('workflow_id', workflowId)
      .in('status', ['open', 'pending']);

    if (error) {
      throw error;
    }

    console.log(`Workflow ${workflowId} cancelled`);
    
  } catch (error) {
    console.error('Error cancelling workflow:', error);
    throw error;
  }
}