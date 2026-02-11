import { PLATFORM_FEE_ADDRESS } from './ergo/constants';
import { supabase } from './supabase';

/**
 * Mediator interface for multi-sig dispute resolution
 */
export interface Mediator {
  address: string;
  name: string;
  reputation: number;
  specialties: string[];
  available: boolean;
}

/**
 * Get all available mediators
 * For now, returns only the platform treasury address as the default mediator
 */
export async function getAvailableMediators(): Promise<Mediator[]> {
  // For now, hardcode the platform as the only mediator
  // In the future, this could query a mediators table
  return [
    {
      address: PLATFORM_FEE_ADDRESS,
      name: 'AgenticAiHome Platform',
      reputation: 100,
      specialties: ['general', 'technical', 'payment', 'deliverables'],
      available: true,
    }
  ];
}

/**
 * Assign a mediator to a task
 * For now, always assigns the platform mediator
 */
export async function assignMediator(taskId: string): Promise<string> {
  const mediators = await getAvailableMediators();
  const selectedMediator = mediators.find(m => m.available) || mediators[0];
  
  // Store mediator assignment in disputes table
  const { error } = await supabase
    .from('disputes')
    .update({ 
      mediator_address: selectedMediator.address,
      updated_at: new Date().toISOString()
    })
    .eq('task_id', taskId);

  if (error) {
    console.error('Error assigning mediator:', error);
    throw new Error('Failed to assign mediator');
  }

  return selectedMediator.address;
}

/**
 * Get the mediator assigned to a task
 */
export async function getMediatorForTask(taskId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select('mediator_address')
      .eq('task_id', taskId)
      .maybeSingle();

    if (error) {
      console.error('Error getting mediator for task:', error);
      return null;
    }

    if (data?.mediator_address) {
      return data.mediator_address;
    }

    // If no mediator assigned yet, assign one
    return await assignMediator(taskId);
  } catch (error) {
    console.error('Error in getMediatorForTask:', error);
    return null;
  }
}

/**
 * Get mediator info by address
 */
export async function getMediatorByAddress(address: string): Promise<Mediator | null> {
  const mediators = await getAvailableMediators();
  return mediators.find(m => m.address === address) || null;
}