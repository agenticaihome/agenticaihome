'use client';

import { useState } from 'react';
import { Agent } from '@/lib/types';
import EgoScore from '@/components/EgoScore';
import AgentIdentityBadge from '@/components/AgentIdentityBadge';
import { X, Briefcase, Star, Clock, Award, ExternalLink } from 'lucide-react';

interface AgentCardModalProps {
  agent: Agent;
  isOwner: boolean;
  onClose: () => void;
  onHire?: () => void;
}

function getTierInfo(egoScore: number) {
  if (egoScore >= 1000) return { tier: 'Legendary', color: 'text-yellow-400', bg: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/40' };
  if (egoScore >= 750) return { tier: 'Elite', color: 'text-purple-400', bg: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/40' };
  if (egoScore >= 500) return { tier: 'Established', color: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/40' };
  if (egoScore >= 250) return { tier: 'Rising', color: 'text-emerald-400', bg: 'from-emerald-500/20 to-green-500/20', border: 'border-emerald-500/40' };
  return { tier: 'Newcomer', color: 'text-gray-400', bg: 'from-gray-500/20 to-slate-500/20', border: 'border-gray-500/40' };
}

export default function AgentCardModal({ agent, isOwner, onClose, onHire }: AgentCardModalProps) {
  const tier = getTierInfo(agent.egoScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Card */}
      <div 
        className={`relative w-full max-w-md bg-gradient-to-b ${tier.bg} bg-slate-900/95 border ${tier.border} rounded-2xl overflow-hidden shadow-2xl transform transition-all`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div className={`h-1 bg-gradient-to-r ${
          agent.egoScore >= 1000 ? 'from-yellow-400 via-amber-500 to-yellow-400' :
          agent.egoScore >= 750 ? 'from-purple-400 via-pink-500 to-purple-400' :
          agent.egoScore >= 500 ? 'from-blue-400 via-cyan-500 to-blue-400' :
          agent.egoScore >= 250 ? 'from-emerald-400 via-green-500 to-emerald-400' :
          'from-gray-400 via-slate-500 to-gray-400'
        }`} />

        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors z-10">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 text-center">
          {/* Avatar placeholder - will be replaced with AgentAvatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-400 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4 shadow-lg">
            {agent.name.charAt(0).toUpperCase()}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1">{agent.name}</h2>
          
          <div className="flex items-center justify-center gap-2 mb-3">
            <AgentIdentityBadge identityTokenId={agent.identityTokenId} />
            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${tier.color} bg-black/30`}>
              <Award className="w-3 h-3 inline mr-1" />
              {tier.tier}
            </span>
          </div>

          {/* EGO Score - large */}
          <div className="mb-4">
            <EgoScore score={agent.egoScore} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-px bg-slate-700/30 mx-6 rounded-lg overflow-hidden mb-4">
          <div className="bg-slate-800/80 p-3 text-center">
            <div className="text-lg font-bold text-white">{agent.tasksCompleted}</div>
            <div className="text-xs text-gray-400">Tasks Done</div>
          </div>
          <div className="bg-slate-800/80 p-3 text-center">
            <div className="text-lg font-bold text-emerald-400">Σ{agent.hourlyRateErg}</div>
            <div className="text-xs text-gray-400">ERG/hr</div>
          </div>
          <div className="bg-slate-800/80 p-3 text-center">
            <div className="text-lg font-bold text-yellow-400">{agent.rating.toFixed(1)}</div>
            <div className="text-xs text-gray-400">Rating</div>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 mb-4">
          <p className="text-gray-300 text-sm leading-relaxed">{agent.description}</p>
        </div>

        {/* Skills */}
        <div className="px-6 mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Skills</h4>
          <div className="flex flex-wrap gap-1.5">
            {agent.skills.map(skill => (
              <span key={skill} className="px-2.5 py-1 bg-slate-700/50 text-gray-300 text-xs rounded-full border border-slate-600/50">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Address */}
        <div className="px-6 mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Wallet</h4>
          <code className="text-xs text-gray-400 break-all">{agent.ownerAddress}</code>
        </div>

        {/* Actions */}
        <div className="p-6 pt-4 border-t border-slate-700/50 flex gap-3">
          {!isOwner && onHire ? (
            <button
              onClick={onHire}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all"
            >
              <Briefcase className="w-4 h-4" />
              Hire This Agent
            </button>
          ) : isOwner ? (
            <a
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all"
            >
              Manage Agent
            </a>
          ) : null}
          <a
            href={`/agents/${agent.id}`}
            className="flex items-center gap-2 px-4 py-3 border border-slate-600 hover:border-slate-500 text-gray-300 rounded-lg transition-all"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
