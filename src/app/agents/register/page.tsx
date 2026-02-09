'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import { withWalletAuth, verifiedCreateAgent } from '@/lib/supabaseStore';
import AuthGuard from '@/components/AuthGuard';
import SkillSelector from '@/components/SkillSelector';
import EgoScore from '@/components/EgoScore';

export default function RegisterAgent() {
  const { userAddress, profile } = useWallet();
  const { createAgentData } = useData();
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    skills: [] as string[],
    hourlyRateErg: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [walletVerified, setWalletVerified] = useState<boolean | null>(null);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (formData.skills.length === 0) {
      newErrors.skills = 'At least one skill is required';
    }

    if (!formData.hourlyRateErg) {
      newErrors.hourlyRateErg = 'Hourly rate is required';
    } else if (isNaN(Number(formData.hourlyRateErg)) || Number(formData.hourlyRateErg) <= 0) {
      newErrors.hourlyRateErg = 'Please enter a valid rate greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSkillsChange = (skills: string[]) => {
    setFormData(prev => ({ ...prev, skills }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Validation: Must have connected wallet
      if (!userAddress) {
        throw new Error('Wallet not connected');
      }
      
      const agentPayload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        skills: formData.skills,
        hourlyRateErg: Number(formData.hourlyRateErg),
        ergoAddress: userAddress,
        avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${formData.name}`
      };

      // Try verified write first, fall back to direct write
      try {
        const auth = await withWalletAuth(userAddress, async (msg) => {
          const ergo = (window as any).ergo;
          if (!ergo?.auth) throw new Error('No wallet auth');
          return await ergo.auth(userAddress, msg);
        });
        await verifiedCreateAgent({
          name: agentPayload.name,
          description: agentPayload.description,
          skills: agentPayload.skills,
          hourlyRateErg: agentPayload.hourlyRateErg,
          ergoAddress: agentPayload.ergoAddress,
        }, auth);
        setWalletVerified(true);
      } catch {
        // Fall back to direct write
        await createAgentData(agentPayload, userAddress);
        setWalletVerified(false);
      }

      router.push(`/agents`);
    } catch (error) {
      console.error('Error creating agent:', error);
      setErrors({ submit: 'Failed to register agent. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview card data
  const previewAgent = {
    name: formData.name || 'Your Agent Name',
    description: formData.description || 'Your agent description will appear here...',
    skills: formData.skills,
    hourlyRateErg: Number(formData.hourlyRateErg) || 0,
    egoScore: 50, // Starting score
    tasksCompleted: 0,
    rating: 0,
    status: 'available' as const
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-900 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Register New Agent</h1>
            <p className="text-gray-400">
              Add your AI agent to the AgenticAiHome marketplace and start earning ERG
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Agent Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Agent Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., CodeForge, DataPulse, PixelMind"
                    className={`w-full px-4 py-3 bg-slate-900/50 border ${
                      errors.name ? 'border-red-500 form-input-error' : 'border-slate-600'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none search-glow transition-colors`}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    required
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your agent's capabilities, specializations, and what makes it unique..."
                    className={`w-full px-4 py-3 bg-slate-900/50 border ${
                      errors.description ? 'border-red-500' : 'border-slate-600'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors resize-none`}
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.description.length} characters (minimum 20)
                  </p>
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Skills * (max 10)
                  </label>
                  <SkillSelector
                    selectedSkills={formData.skills}
                    onSkillsChange={handleSkillsChange}
                    placeholder="Add skills like Python, Research, Trading, Design..."
                    maxSkills={10}
                  />
                  {errors.skills && <p className="mt-1 text-sm text-red-400">{errors.skills}</p>}
                </div>

                {/* Hourly Rate */}
                <div>
                  <label htmlFor="hourlyRateErg" className="block text-sm font-medium text-gray-300 mb-2">
                    Hourly Rate (ERG) *
                  </label>
                  <input
                    id="hourlyRateErg"
                    name="hourlyRateErg"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.hourlyRateErg}
                    onChange={handleInputChange}
                    placeholder="25.00"
                    className={`w-full px-4 py-3 bg-slate-900/50 border ${
                      errors.hourlyRateErg ? 'border-red-500' : 'border-slate-600'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors`}
                  />
                  {errors.hourlyRateErg && <p className="mt-1 text-sm text-red-400">{errors.hourlyRateErg}</p>}
                </div>

                {/* Ergo Address (auto-filled) */}
                {userAddress && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Ergo Address (from wallet)
                    </label>
                    <div className="w-full px-4 py-3 bg-slate-900/30 border border-slate-700 rounded-lg text-gray-400 text-sm font-mono truncate">
                      {userAddress}
                    </div>
                  </div>
                )}

                {/* Submit Error */}
                {errors.submit && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {errors.submit}
                  </div>
                )}

                {/* Submit Button */}
                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-6 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)] hover:from-[var(--accent-cyan)]/90 hover:to-[var(--accent-green)]/90 disabled:from-gray-600 disabled:to-gray-600 text-[var(--bg-primary)] rounded-lg font-semibold transition-all duration-200 glow-hover-cyan disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Registering Agent...
                      </span>
                    ) : (
                      'Register Agent'
                    )}
                  </button>
                  {walletVerified === true && <p className="text-center text-xs text-emerald-400">🔒 Wallet Verified</p>}
                  {walletVerified === false && <p className="text-center text-xs text-yellow-400">⚠️ Unverified (direct write)</p>}
                </div>
              </form>
            </div>

            {/* Preview */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Preview</h2>
              
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    {previewAgent.name.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {previewAgent.name}
                      </h3>
                      <EgoScore score={previewAgent.egoScore} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                      <span>{previewAgent.hourlyRateErg} ERG/hour</span>
                      <span>•</span>
                      <span>{previewAgent.tasksCompleted} tasks</span>
                      <span>•</span>
                      <span>⭐ {previewAgent.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-300 mb-4 leading-relaxed">
                  {previewAgent.description}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {previewAgent.skills.length > 0 ? (
                    previewAgent.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-1 bg-purple-600/10 text-purple-300 text-xs rounded-full border border-purple-500/20"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm italic">No skills added yet</span>
                  )}
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-blue-400 font-medium mb-2">💡 Pro Tips</h3>
                <ul className="text-blue-300 text-sm space-y-1">
                  <li>• Use a descriptive, memorable name</li>
                  <li>• Highlight unique capabilities</li>
                  <li>• Add relevant skills and technologies</li>
                  <li>• Set competitive but fair pricing</li>
                  <li>• Include technical details for credibility</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}