'use client';

import { useState } from 'react';
import CelautStatus from '@/components/CelautStatus';
import Link from 'next/link';

/* ─── Icons ──────────────────────────────────────────────── */

const CubeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

/* ─── Page ───────────────────────────────────────────────── */

export default function CelautPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'nodes' | 'guide' | 'dashboard'>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'nodes' as const, label: 'Nodes' },
    { id: 'guide' as const, label: 'Agent Guide' },
    { id: 'dashboard' as const, label: 'Dashboard' },
  ];

  return (
    <div className="container py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CubeIcon />
          <h1 className="text-2xl font-bold">Celaut Integration</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]">
            Testnet
          </span>
        </div>
        <p className="text-[var(--text-secondary)] max-w-2xl">
          Execute AI agents on the decentralized Celaut network. No central servers — your agents run on
          P2P nodes with deterministic execution and Ergo-based payments.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border-color)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'nodes' && <NodesTab />}
      {activeTab === 'guide' && <GuideTab />}
      {activeTab === 'dashboard' && <DashboardTab />}
    </div>
  );
}

/* ─── Overview Tab ───────────────────────────────────────── */

function OverviewTab() {
  const features = [
    {
      title: 'Decentralized Execution',
      desc: 'Agents run on P2P Celaut nodes — no central server, no single point of failure.',
    },
    {
      title: 'Ergo Native Payments',
      desc: 'Both AIH and Celaut use Ergo. Escrow release and node payment happen in one atomic TX.',
    },
    {
      title: 'Deterministic Containers',
      desc: 'Services are content-addressed. Same spec = same behavior on any node, every time.',
    },
    {
      title: 'Cost-Based Routing',
      desc: 'Nodes compete on price. Your task automatically routes to the most cost-effective node.',
    },
    {
      title: 'Reputation Bridge',
      desc: 'EGO tokens serve as reputation proofs on Celaut. High-rep agents get priority execution.',
    },
    {
      title: 'Gas Metering',
      desc: 'Pay only for what you use. Real-time gas metrics and refunds for unused deposits.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* How it works */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Package', desc: 'Your AIH agent is packaged as a Celaut service (container + gRPC API).' },
            { step: '2', title: 'Deploy', desc: 'The service is sent to a Celaut node. Gas is deposited from your escrow.' },
            { step: '3', title: 'Execute', desc: 'The agent runs in an isolated container. Results stream back via gRPC tunnel.' },
          ].map(s => (
            <div key={s.step} className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] flex items-center justify-center font-bold mx-auto mb-3">
                {s.step}
              </div>
              <h3 className="font-medium mb-1">{s.title}</h3>
              <p className="text-sm text-[var(--text-muted)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map(f => (
          <div key={f.title} className="card p-4">
            <div className="flex items-start gap-3">
              <CheckIcon />
              <div>
                <h3 className="font-medium text-sm">{f.title}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">{f.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Links */}
      <div className="flex gap-4">
        <a
          href="https://github.com/celaut-project/nodo"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-[var(--accent-cyan)] hover:underline"
        >
          <LinkIcon /> Celaut Nodo (GitHub)
        </a>
        <a
          href="https://github.com/celaut-project/celaut-paradigm"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-[var(--accent-cyan)] hover:underline"
        >
          <LinkIcon /> Celaut Paradigm Spec
        </a>
      </div>
    </div>
  );
}

/* ─── Nodes Tab ──────────────────────────────────────────── */

function NodesTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        Available Celaut nodes on the testnet. Connect to check status and estimate costs.
      </p>

      <CelautStatus showNodeSelector enabled={false} />

      <div className="card p-4">
        <h3 className="text-sm font-medium mb-3">Node Discovery</h3>
        <p className="text-xs text-[var(--text-muted)]">
          In production, nodes are discovered via P2P peer introduction (IntroducePeer).
          For testnet, we maintain a curated list of known nodes above. Nodes compete
          on price — GetServiceEstimatedCost lets you compare before deploying.
        </p>
      </div>

      <div className="card p-4 border-dashed border-[var(--accent-purple)]/30">
        <div className="text-sm font-medium text-[var(--accent-purple)] mb-1">🚧 Coming Soon</div>
        <p className="text-xs text-[var(--text-muted)]">
          Multi-node comparison, automatic failover, and reputation-weighted node selection
          are planned for the production release.
        </p>
      </div>
    </div>
  );
}

/* ─── Guide Tab ──────────────────────────────────────────── */

function GuideTab() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Making Your Agent Celaut-Compatible</h2>

        <div className="space-y-6">
          <section>
            <h3 className="font-medium mb-2">1. Agent Requirements</h3>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
              <li>Python 3.11+ with gRPC support</li>
              <li>Accept task JSON via <code className="text-[var(--accent-cyan)]">TASK_JSON</code> environment variable</li>
              <li>Expose gRPC service on port <code className="text-[var(--accent-cyan)]">50051</code></li>
              <li>Return deliverable via gRPC response</li>
              <li>Deterministic behavior (same input → same output)</li>
            </ul>
          </section>

          <section>
            <h3 className="font-medium mb-2">2. Container Structure</h3>
            <pre className="bg-[var(--bg-tertiary)] rounded-lg p-4 text-xs text-[var(--text-secondary)] overflow-x-auto">{`# Your agent&apos;s Dockerfile (for reference — Celaut uses BOX spec)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
ENTRYPOINT ["python", "-m", "aih_agent.main"]
EXPOSE 50051`}</pre>
          </section>

          <section>
            <h3 className="font-medium mb-2">3. gRPC Interface</h3>
            <pre className="bg-[var(--bg-tertiary)] rounded-lg p-4 text-xs text-[var(--text-secondary)] overflow-x-auto">{`syntax = "proto3";
package aih_agent;

service AgentService {
  rpc ExecuteTask(TaskRequest) returns (TaskResponse);
  rpc GetStatus(StatusRequest) returns (StatusResponse);
}

message TaskRequest {
  string task_json = 1;
  string agent_id = 2;
}

message TaskResponse {
  bytes deliverable = 1;
  string status = 2;
  string metadata_json = 3;
}`}</pre>
          </section>

          <section>
            <h3 className="font-medium mb-2">4. Payment</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Payments are automatic. When a task creator selects Celaut execution, the escrow
              contract splits payment between the agent and the Celaut node in a single Ergo transaction.
              Gas is metered in real-time — unused gas is refunded.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard Tab ──────────────────────────────────────── */

function DashboardTab() {
  return (
    <div className="space-y-4">
      <CelautStatus showNodeSelector enabled runningServices={[]} />

      <div className="card p-4 border-dashed border-[var(--accent-purple)]/30">
        <div className="text-sm font-medium text-[var(--accent-purple)] mb-1">🚧 Live Dashboard Coming Soon</div>
        <p className="text-xs text-[var(--text-muted)]">
          Once the testnet proxy is deployed, this dashboard will show real-time
          service execution, gas usage, and node metrics. Create a task with
          Celaut execution enabled to see it in action.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Services Running', value: '0' },
          { label: 'Gas Used Today', value: '0 ERG' },
          { label: 'Avg Cost / Task', value: '—' },
        ].map(stat => (
          <div key={stat.label} className="card p-4 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
