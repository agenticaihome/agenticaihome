'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Banknote, BarChart3, Bell, Briefcase, CheckCircle, ChevronRight, ClipboardList, Clock, Copy, DollarSign, ExternalLink, Eye, FileText, Flame, Lightbulb, Link2, Lock, Mail, PartyPopper, Phone, RefreshCw, Rocket, Settings, Star, Target, TrendingUp, Trophy, Users } from 'lucide-react';
import Link from 'next/link';

interface Lesson {
  id: number;
  title: string;
  description: string;
  readTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  icon: React.ComponentType<any>;
  content: React.ReactNode;
}

const CopyPrompt = ({ prompt, title }: { prompt: string; title: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] border-b border-[var(--border-color)]">
        <span className="text-sm font-medium text-slate-300"><ClipboardList className="w-4 h-4 text-slate-400 inline" /> {title}</span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            copied 
              ? 'bg-green-600 text-white' 
              : 'bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80 text-white'
          }`}
        >
          {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-4">
        <pre className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
          {prompt}
        </pre>
      </div>
    </div>
  );
};

const TryThis = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
        <TrendingUp size={14} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-purple-400 text-sm mb-2">Action Step</h4>
        <div className="text-sm text-slate-300">
          {children}
        </div>
      </div>
    </div>
  </div>
);

const ROIBox = ({ title, savings, description }: { title: string; savings: string; description: string }) => (
  <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
    <div className="flex items-start gap-3">
      <DollarSign className="text-green-400 flex-shrink-0 mt-1" size={20} />
      <div>
        <h4 className="font-semibold text-green-400 mb-1">{title}</h4>
        <div className="text-white font-bold mb-1">{savings}</div>
        <p className="text-slate-300 text-sm">{description}</p>
      </div>
    </div>
  </div>
);

const lessons: Lesson[] = [
  {
    id: 1,
    title: "The AI Chief of Staff",
    description: "Daily briefings, email triage, and priority management for executives and business owners.",
    readTime: "12 min",
    difficulty: "Intermediate",
    icon: Briefcase,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
          <div className="flex items-start gap-4">
            <Eye className="text-purple-400 flex-shrink-0 mt-1" size={20} />
            <div>
              <h3 className="text-purple-400 font-semibold mb-2">What Your Chief of Staff Does</h3>
              <div className="bg-black/40 rounded-lg p-3 text-sm space-y-1">
                <p><strong className="text-white">Morning Briefing:</strong> Weather, calendar, priorities, urgent emails</p>
                <p><strong className="text-white">Email Triage:</strong> Urgent flagging, draft replies, archive recommendations</p>
                <p><BarChart3 className="w-4 h-4 text-blue-400 inline" /> <strong className="text-white">Daily Review:</strong> What's done, what's pending, tomorrow's focus</p>
                <p><strong className="text-white">Crisis Mode:</strong> Emergency prioritization and rapid response</p>
              </div>
            </div>
          </div>
        </div>

        <ROIBox
          title="Time Saved"
          savings="2-3 hours daily"
          description="Email management, calendar optimization, and priority setting typically consume 25% of executive time"
        />

        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Set Up Your Chief of Staff</h3>
          
          <div className="space-y-6">
            <CopyPrompt
              title="Chief of Staff Agent"
              prompt={`You are my AI Chief of Staff. Your job is to help me start each day focused and prepared.

**Your daily responsibilities:**

1. **Morning Briefing** (send at 7:00 AM)
   - Weather for [YOUR CITY] and what to wear
   - My top 3 priorities for today (ask me if calendar isn't connected)
   - Any deadlines or important dates this week
   - One thing I'm likely to forget

2. **Email Triage** (when I share my inbox)
   - Flag urgent emails that need immediate response
   - Draft suggested replies for routine emails
   - Identify which emails can wait or be deleted
   - Summarize long threads in 2-3 sentences

3. **End of Day Review** (when I ask)
   - What got done today
   - What's rolling over to tomorrow
   - Any balls I might be dropping

**Rules:**
- Keep everything concise — I'm busy
- Use bullet points, not paragraphs
- If you need info, ask ONE question at a time
- Flag things by urgency: [!] Urgent, [~] Today, [+] This Week

**About my business:**
[DESCRIBE YOUR BUSINESS IN 1-2 SENTENCES]

Start by asking me: What city are you in, and what does your business do?`}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Email Triage Workflow</h4>
                <CopyPrompt
                  title="Email Triage Assistant"
                  prompt={`I'm going to paste emails from my inbox. For each one, tell me:

1. **Priority:** [!] Urgent / [~] Today / [+] This Week / [ ] Delete/Ignore
2. **Summary:** One sentence max
3. **Action:** What I should do (Reply, Delegate, Schedule, Archive)
4. **Draft:** If it needs a reply, write a 2-3 sentence draft

Keep it tight. I have 50 more emails to go through.

Here are the emails:
[PASTE EMAILS HERE]`}
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-white">  Weekly Planning Session</h4>
                <CopyPrompt
                  title="Strategic Planning Agent"
                  prompt={`Help me plan my week. I'll tell you what's on my plate, and you help me prioritize.

**The Framework:**
- <Target className="w-4 h-4 text-red-400 inline" /> **Big 3**: The 3 things that would make this week a win
-   **Time Blocks**: When I'll do focused work vs. meetings vs. admin
- **Risks**: What might derail me and how to prevent it
- <Trophy className="w-4 h-4 text-yellow-400 inline" /> **Quick Wins**: Easy tasks I can knock out to build momentum

**My context:**
- Business type: [YOUR BUSINESS]
- Biggest challenge right now: [YOUR CHALLENGE]
- Hours I can dedicate to business: [X HOURS/WEEK]

What do you have on your plate this week?`}
                />
              </div>
            </div>
          </div>
        </div>

        <TryThis>
          <p>Start with the morning briefing only. Use it for one week to establish the routine, then add email triage. Don't try to implement everything at once — build the habit first.</p>
          <p className="mt-2 text-purple-300 font-medium">Pro tip: Connect your Google Calendar to ChatGPT for automatic schedule awareness.</p>
        </TryThis>

        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-amber-400 mb-2"><Lock className="w-4 h-4 text-slate-400 inline" /> Privacy Note</h4>
          <p className="text-slate-300 text-sm">
            Never share sensitive customer data, financial details, or confidential information with AI agents. 
            Use general descriptions and remove specific names/details when needed.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Sales & Marketing Agent",
    description: "Lead generation, content creation, social media management, and customer follow-up automation.",
    readTime: "14 min", 
    difficulty: "Intermediate",
    icon: TrendingUp,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Automate Your Revenue Generation</h3>
          <p className="text-slate-300 mb-6">
            Stop manually creating content, following up with leads, and managing social media. 
            This agent handles the repetitive marketing tasks so you can focus on closing deals.
          </p>
        </div>

        <ROIBox
          title="Revenue Impact"
          savings="30% more leads, 50% faster follow-up"
          description="Consistent content and immediate lead response typically increases conversion rates by 35-50%"
        />

        <div className="space-y-6">
          <CopyPrompt
            title="Marketing Manager Agent"
            prompt={`You are my AI Marketing Manager. Help me create a week of social media content.

**My Business:**
[DESCRIBE YOUR BUSINESS IN 1-2 SENTENCES]

**My Target Audience:**
[WHO ARE YOUR IDEAL CUSTOMERS?]

**My Brand Voice:**
[Professional/Casual/Friendly/Expert/etc.]

**Task: Create 7 days of social media posts**

For each day, give me:
1. **Hook** (first line that stops the scroll)
2. **Body** (2-3 sentences of value)
3. **CTA** (what you want them to do)
4. **Hashtags** (5-7 relevant ones)

**Content Mix:**
- Day 1: Educational tip
- Day 2: Behind-the-scenes / personal
- Day 3: Customer success story or testimonial
- Day 4: Industry insight or trend
- Day 5: Problem/Solution post
- Day 6: Engagement question
- Day 7: Promotional (soft sell)

Keep each post under 150 words. Make them sound human, not corporate.`}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-white">Email Campaign Creator</h4>
              <CopyPrompt
                title="Email Marketing Agent"
                prompt={`Write a 3-email welcome sequence for new subscribers to my [BUSINESS TYPE] email list.

**Goal:** Turn new subscribers into customers

**My Business:**
[BRIEF DESCRIPTION]

**What I'm selling:**
[PRODUCT/SERVICE + PRICE RANGE]

**Email Sequence:**
- Email 1 (Day 0): Welcome + immediate value
- Email 2 (Day 3): Social proof + case study
- Email 3 (Day 7): Soft pitch with special offer

**Requirements:**
- Subject lines that get opened
- Valuable content in each email
- Natural progression to the sale
- Personal tone, not corporate
- Include clear CTAs

Keep each email under 200 words.`}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">Lead Follow-Up System</h4>
              <CopyPrompt
                title="Lead Response Agent"
                prompt={`You are my Lead Follow-Up Agent. Help me respond to potential customers quickly and professionally.

**My Business:** [DESCRIPTION]
**Services:** [LIST MAIN OFFERINGS]
**Typical Process:** [HOW YOU USUALLY WORK WITH CLIENTS]

**When someone inquires, create:**
1. **Immediate Response** (within 5 minutes)
2. **Questions to Qualify** (budget, timeline, needs)
3. **Next Steps** (call, meeting, proposal)
4. **Follow-up Sequence** if they don't respond

**My Style:** [Professional/Casual/Consultative/etc.]

**Templates needed:**
- Initial response email
- Follow-up for non-responders
- Meeting scheduling message
- Post-call thank you

Here's the lead inquiry:
[PASTE INQUIRY HERE]`}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white"><BarChart3 className="w-4 h-4 text-blue-400 inline" /> Content Strategy Agent</h4>
            <CopyPrompt
              title="Content Planning Assistant"
              prompt={`Create a month-long content calendar for my [BUSINESS TYPE].

**My Business:** [DESCRIPTION]
**Target Audience:** [WHO THEY ARE]
**Main Goals:** [BRAND AWARENESS/LEAD GENERATION/SALES/etc.]

**Content Platforms:**
- [LINKEDIN/INSTAGRAM/FACEBOOK/TWITTER/etc.]

**Content Types I Can Create:**
- [PHOTOS/VIDEOS/CAROUSELS/TEXT POSTS/etc.]

**Time Available:** [X HOURS PER WEEK for content]

**Give Me:**
1. **4 weeks of post ideas** (7 posts per week)
2. **Content themes** for each week
3. **Posting schedule** (best days/times for my audience)
4. **Repurposing opportunities** (turn 1 idea into 3 posts)
5. **Engagement strategies** (how to get people commenting)

Focus on content that builds trust and generates leads.`}
            />
          </div>
        </div>

        <TryThis>
          <p>Start by having your agent create next week's social media content. Schedule it all in one sitting using a tool like Buffer or Later. Then set up the lead response templates.</p>
          <p className="mt-2 text-purple-300 font-medium">Tip: Repurpose your best-performing content across different platforms with slight variations.</p>
        </TryThis>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-blue-400 mb-2"><RefreshCw className="w-4 h-4 text-blue-400 inline" /> Content Automation Loop</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span className="text-slate-300">AI creates content → You review and approve → Schedule posting</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span className="text-slate-300">Content generates leads → AI sends follow-up templates → You customize and send</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span className="text-slate-300">AI analyzes performance → Suggests improvements → Refines future content</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Operations Agent",
    description: "Process automation, reporting, task management, and workflow optimization for smooth operations.",
    readTime: "10 min",
    difficulty: "Intermediate",
    icon: Settings,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Streamline Your Business Operations</h3>
          <p className="text-slate-300 mb-6">
            Turn your business into a well-oiled machine. This agent helps you create processes, 
            track performance, and optimize workflows so everything runs without your constant oversight.
          </p>
        </div>

        <ROIBox
          title="Efficiency Gain"
          savings="20-30% time reduction in admin tasks"
          description="Standardized processes and automated reporting eliminate repetitive decision-making and manual tracking"
        />

        <div className="space-y-6">
          <CopyPrompt
            title="Operations Manager Agent"
            prompt={`You are my Operations Manager AI. Help me create systems and processes that make my business run smoothly.

**My Business Context:**
- Type: [DESCRIPTION]
- Team size: [NUMBER] people
- Biggest operational challenge: [WHAT'S BROKEN OR INEFFICIENT]
- Current tools: [SOFTWARE/SYSTEMS YOU USE]

**Areas I Need Help With:**
□ Standard Operating Procedures (SOPs)
□ Performance tracking and KPIs  
□ Project management
□ Quality control
□ Team workflows
□ Customer delivery process

**Your Tasks:**
1. **Process Documentation** — Create step-by-step SOPs
2. **KPI Dashboards** — What metrics to track and why
3. **Workflow Optimization** — Remove bottlenecks and inefficiencies
4. **Quality Checklists** — Ensure consistent delivery
5. **Team Coordination** — Clear roles and responsibilities

Start by asking: What's the #1 process that causes you the most headaches?`}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-white"><BarChart3 className="w-4 h-4 text-blue-400 inline" /> KPI Tracking Agent</h4>
              <CopyPrompt
                title="Performance Dashboard Creator"
                prompt={`Help me create a simple KPI dashboard for my [BUSINESS TYPE].

**My Business Goals:**
- Primary goal: [REVENUE/GROWTH/EFFICIENCY/etc.]
- Current biggest challenge: [DESCRIPTION]
- Time I can spend on tracking: [X MINUTES PER WEEK]

**Create for me:**
1. **5 Key Metrics** to track weekly
2. **How to measure** each one simply
3. **What "good" looks like** (target numbers)
4. **Red flags** — when to worry
5. **Monthly review questions** — what to ask myself

**Make it simple:** I want to check my business health in under 10 minutes per week.

**Constraints:**
- Must be trackable with basic tools (spreadsheet, simple apps)
- Numbers I can actually influence
- Clear connection to business results

What metrics should I focus on?`}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white"><ClipboardList className="w-4 h-4 text-slate-400 inline" /> SOP Creator</h4>
              <CopyPrompt
                title="Process Documentation Agent"
                prompt={`Help me create a Standard Operating Procedure (SOP) for [SPECIFIC PROCESS/TASK].

**Process Details:**
- What it is: [BRIEF DESCRIPTION]
- Who does it: [ROLE/PERSON]
- How often: [FREQUENCY]
- Current problems: [WHAT GOES WRONG]

**SOP Requirements:**
1. **Step-by-step instructions** — Clear enough for anyone to follow
2. **Quality checkpoints** — How to know it's done right
3. **Tools needed** — Software, templates, resources
4. **Time estimate** — How long it should take
5. **Troubleshooting** — Common problems and solutions

**Format:** Simple checklist format that can be printed or shared digitally

**Goal:** Someone new should be able to complete this process successfully using only your SOP.

Current process to document:`}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white"><RefreshCw className="w-4 h-4 text-blue-400 inline" /> Workflow Optimizer</h4>
            <CopyPrompt
              title="Process Improvement Agent"
              prompt={`Analyze my current workflow and suggest improvements.

**Current Process:** [DESCRIBE HOW YOU CURRENTLY DO SOMETHING]

**Pain Points:**
- Takes too long: [WHAT'S SLOW]
- Error-prone: [WHAT GOES WRONG]
- Requires too much oversight: [WHAT YOU HAVE TO BABYSIT]

**Constraints:**
- Budget: [TIGHT/MODERATE/FLEXIBLE]
- Tech comfort: [LOW/MEDIUM/HIGH]
- Team size: [NUMBER]
- Available time for changes: [HOURS PER WEEK]

**Optimization Goals:**
□ Reduce time spent
□ Improve quality/consistency  
□ Reduce errors
□ Require less oversight
□ Make it easier to delegate

**Give me:**
1. **Quick wins** — Changes I can make this week
2. **Process redesign** — A better way to structure this
3. **Tool recommendations** — Software that could help
4. **Implementation plan** — Steps to make the transition

What's the biggest bottleneck in this process?`}
            />
          </div>
        </div>

        <TryThis>
          <p>Pick your most painful business process and document it first. Even if it's broken, write down exactly how you do it now. Then ask your agent to optimize it. You can't improve what you haven't defined.</p>
          <p className="mt-2 text-purple-300 font-medium">Start with processes that touch customers or generate revenue — highest impact improvements.</p>
        </TryThis>

        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-green-400 mb-2"><Lightbulb className="w-4 h-4 text-yellow-400 inline" /> Automation Pyramid</h4>
          <p className="text-slate-300 text-sm mb-3">Build automation in this order for maximum impact:</p>
          <div className="space-y-2 text-sm">
            <div className="bg-green-800/20 rounded p-2">
              <strong className="text-green-300">Level 1:</strong> Document everything (SOPs)
            </div>
            <div className="bg-green-800/30 rounded p-2">
              <strong className="text-green-300">Level 2:</strong> Standardize processes (checklists)
            </div>
            <div className="bg-green-800/40 rounded p-2">
              <strong className="text-green-300">Level 3:</strong> Measure performance (KPIs)
            </div>
            <div className="bg-green-800/50 rounded p-2">
              <strong className="text-green-300">Level 4:</strong> Automate with tools
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Customer Service Agent",
    description: "24/7 support, FAQ automation, complaint resolution, and customer satisfaction management.",
    readTime: "11 min",
    difficulty: "Beginner", 
    icon: Users,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Delight Customers Around the Clock</h3>
          <p className="text-slate-300 mb-6">
            Never miss a customer inquiry again. This agent provides instant support, 
            resolves common issues, and escalates complex problems to you when needed.
          </p>
        </div>

        <ROIBox
          title="Customer Impact"
          savings="24/7 availability, 80% faster response time"
          description="Immediate responses improve customer satisfaction by 40-60% and reduce support workload by 70%"
        />

        <div className="space-y-6">
          <CopyPrompt
            title="Customer Support Agent"
            prompt={`You are my Customer Support Agent. Help customers quickly and professionally.

**My Business:**
- What we do: [DESCRIPTION]
- Main products/services: [LIST]
- Typical customer: [WHO THEY ARE]
- Support hours: [WHEN I'M AVAILABLE]

**Common Customer Issues:**
1. [MOST FREQUENT PROBLEM]
2. [SECOND MOST COMMON]
3. [THIRD MOST COMMON]

**Support Guidelines:**
- Response tone: [Friendly/Professional/Casual]
- Refund policy: [YOUR POLICY]
- Escalation triggers: [WHEN TO GET YOU INVOLVED]

**For each customer inquiry:**
1. **Acknowledge** their concern immediately
2. **Clarify** what they need if unclear
3. **Solve** if you can, or **escalate** if complex
4. **Follow up** to ensure satisfaction

**Templates I need:**
- Initial response
- Common solutions
- Escalation message
- Follow-up check-in

What's our most frequent customer support challenge?`}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-white">FAQ Generator</h4>
              <CopyPrompt
                title="FAQ Creation Agent"
                prompt={`Create a comprehensive FAQ for my [BUSINESS TYPE] website.

**My Business:** [DESCRIPTION]
**Target Customers:** [WHO THEY ARE]

**FAQ Categories needed:**
□ Product/Service Information
□ Pricing and Payment
□ Shipping/Delivery (if applicable)
□ Returns/Refunds
□ Account/Technical Issues
□ Getting Started

**For each question:**
1. **Question** (how customers actually ask it)
2. **Answer** (clear, concise, helpful)
3. **Next step** (what to do if this doesn't help)

**Style:** Friendly and helpful, not corporate speak

**Goal:** Answer 80% of customer questions before they contact support

Based on my business, what are the top 15 questions customers ask?`}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white"><Flame className="w-4 h-4 text-orange-400 inline" /> Crisis Response Agent</h4>
              <CopyPrompt
                title="Complaint Resolution Assistant"
                prompt={`You are my Complaint Resolution Agent. Help me turn upset customers into happy ones.

**My Business Values:**
- Customer satisfaction: [HIGH PRIORITY/MODERATE/etc.]
- Resolution approach: [FLEXIBLE/BY THE BOOK/etc.]
- Compensation authority: [WHAT I'M WILLING TO OFFER]

**For angry customers:**
1. **Acknowledge** their frustration
2. **Apologize** genuinely (even if not our fault)
3. **Action plan** — specific steps to fix it
4. **Compensation** if appropriate
5. **Follow-up** to ensure resolution

**Escalation Rules:**
- Immediate escalation: [LEGAL THREATS/SOCIAL MEDIA/etc.]
- Manager involvement: [REFUND OVER $X/etc.]
- My direct attention: [REPEAT ISSUES/VIP CUSTOMERS/etc.]

**Templates needed:**
- Acknowledgment response
- Resolution proposals
- Compensation offers
- Follow-up messages

Here's an upset customer message:
[PASTE COMPLAINT HERE]`}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white">Phone Support Script</h4>
            <CopyPrompt
              title="Phone Support Agent"
              prompt={`Create phone support scripts for my [BUSINESS TYPE].

**Call Flow:**
1. **Greeting:** Professional but warm
2. **Identify issue:** Get to the problem quickly
3. **Resolve or escalate:** Fix it or get help
4. **Confirm satisfaction:** Make sure they're happy
5. **Close professionally:** End on positive note

**Key Info to Capture:**
- Customer name and contact
- Order/account number (if applicable)
- Issue description
- Resolution provided
- Follow-up needed

**Common Scenarios:**
- New customer questions
- Existing customer issues
- Billing/payment problems
- Technical support
- Cancellation requests

**My Business Context:**
- Services: [WHAT YOU OFFER]
- Typical call duration: [TARGET TIME]
- Support hours: [AVAILABILITY]

Create scripts that sound natural, not robotic.`}
            />
          </div>
        </div>

        <TryThis>
          <p>Create your FAQ first — it prevents 70% of support inquiries. Then set up your initial response templates. Test them with a friend to make sure they sound natural and helpful.</p>
          <p className="mt-2 text-purple-300 font-medium">Pro tip: Track your most common questions weekly and update your FAQ based on real customer needs.</p>
        </TryThis>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-blue-400 mb-2"><Star className="w-4 h-4 text-yellow-400 inline" /> Customer Delight Strategy</h4>
          <div className="space-y-2 text-sm">
            <p className="text-slate-300 mb-2">Turn support interactions into growth opportunities:</p>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></span>
              <span className="text-slate-300">Quick response = impressed customer = positive review</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></span>
              <span className="text-slate-300">Proactive solutions = customer tells friends</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></span>
              <span className="text-slate-300">Follow-up care = repeat customers</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Finance Agent",
    description: "Invoicing automation, expense tracking, cash flow forecasting, and financial reporting.",
    readTime: "9 min",
    difficulty: "Intermediate",
    icon: DollarSign,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Master Your Business Finances</h3>
          <p className="text-slate-300 mb-6">
            Stop losing money to poor financial tracking. This agent helps you invoice promptly, 
            track expenses, forecast cash flow, and understand your business's financial health.
          </p>
        </div>

        <ROIBox
          title="Financial Impact"
          savings="15-20% better cash flow, 90% faster invoicing"
          description="Prompt invoicing and expense tracking typically improve cash flow by 15-20% and reduce accounting costs by 60%"
        />

        <div className="space-y-6">
          <CopyPrompt
            title="Finance Manager Agent"
            prompt={`You are my Finance Manager AI. Help me stay on top of money coming in and going out.

**My Business:**
- Type: [SERVICE/PRODUCT/BOTH]
- Revenue model: [PROJECT-BASED/RECURRING/SALES/etc.]
- Average transaction: $[AMOUNT]
- Payment terms: [NET 30/IMMEDIATE/etc.]

**Financial Challenges:**
□ Invoicing delays
□ Expense tracking
□ Cash flow gaps
□ Pricing decisions
□ Tax preparation
□ Financial reporting

**Tools I use:**
- Accounting software: [QUICKBOOKS/XERO/NONE/etc.]
- Banking: [BUSINESS ACCOUNT SETUP]
- Payment processing: [STRIPE/PAYPAL/etc.]

**Help me with:**
1. **Invoicing workflows** — Get paid faster
2. **Expense categorization** — Track spending better  
3. **Cash flow forecasting** — Predict money gaps
4. **Financial health checks** — Monthly business review
5. **Pricing strategies** — What to charge

What's your biggest money management headache right now?`}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-white"><Banknote className="w-4 h-4 text-emerald-400 inline" /> Expense Tracker</h4>
              <CopyPrompt
                title="Expense Management Agent"
                prompt={`Help me create a simple expense tracking system for my [BUSINESS TYPE].

**Current Situation:**
- Monthly business expenses: ~$[AMOUNT]
- Biggest expense categories: [RENT/SOFTWARE/MARKETING/etc.]
- Current tracking method: [RECEIPTS IN SHOEBOX/SPREADSHEET/etc.]
- Tax preparation: [DIY/ACCOUNTANT]

**Create for me:**
1. **Expense categories** — 8-12 main buckets
2. **Quick recording method** — How to track daily
3. **Monthly review process** — What to analyze
4. **Tax-ready organization** — Keep accountant happy
5. **Red flag alerts** — When spending is off

**Requirements:**
- 5 minutes per week maximum
- Works with [PHONE/COMPUTER/BOTH]
- Clear enough for tax time
- Helps spot overspending quickly

**Goals:**
- Know where money goes
- Reduce unnecessary expenses
- Simplify tax preparation
- Make better spending decisions

What categories should I track?`}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white"><BarChart3 className="w-4 h-4 text-blue-400 inline" /> Cash Flow Forecaster</h4>
              <CopyPrompt
                title="Cash Flow Planning Agent"
                prompt={`Create a 3-month cash flow forecast for my [BUSINESS TYPE].

**Current Financial Picture:**
- Monthly revenue: $[AMOUNT] (average)
- Monthly expenses: $[AMOUNT]
- Current cash on hand: $[AMOUNT]
- Seasonal patterns: [DESCRIBE ANY PATTERNS]

**Upcoming Events:**
- Large expenses: [TAX PAYMENTS/EQUIPMENT/etc.]
- Revenue changes: [NEW CLIENTS/LOST CLIENTS/etc.]
- Payment terms: [HOW CUSTOMERS PAY/WHEN]

**Help me forecast:**
1. **Monthly cash position** — End of month balance
2. **Danger zones** — When money gets tight
3. **Action triggers** — When to worry/act
4. **Growth opportunities** — When I can invest
5. **Safety margins** — How much buffer I need

**Format:** Simple table I can update monthly

**Goal:** Never be surprised by cash flow problems

Based on this info, what should I watch for?`}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white"><FileText className="w-4 h-4 text-slate-400 inline" /> Invoicing Automation</h4>
            <CopyPrompt
              title="Invoice Management Agent"
              prompt={`Streamline my invoicing process to get paid faster.

**Current Process:**
- How I invoice: [EMAIL/SOFTWARE/PAPER/etc.]
- Payment terms: [NET 30/IMMEDIATE/etc.]
- Average time to get paid: [X DAYS]
- Late payment rate: [X% OF INVOICES]

**Service/Product Details:**
- What I sell: [DESCRIPTION]
- Pricing structure: [HOURLY/FIXED/PACKAGES/etc.]
- Typical project: [SIZE AND SCOPE]

**Create for me:**
1. **Invoice templates** — Professional and clear
2. **Follow-up sequences** — When payments are late
3. **Payment terms** — Protect my cash flow
4. **Process checklist** — Never forget to invoice
5. **Client communication** — Set payment expectations

**Goals:**
- Send invoices within 24 hours of work completion
- Get paid 50% faster
- Reduce late payments
- Look professional
- Minimize awkward money conversations

What's slowing down my current process?`}
            />
          </div>
        </div>

        <TryThis>
          <p>Set up your expense categories and start tracking for one week. Don't worry about being perfect — just capture where money goes. Then create your invoice template and payment terms.</p>
          <p className="mt-2 text-purple-300 font-medium">Quick win: Send all outstanding invoices within 48 hours. You'll see immediate cash flow improvement.</p>
        </TryThis>

        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-red-400 mb-2">Cash Flow Warning Signs</h4>
          <p className="text-slate-300 text-sm mb-3">Your agent should alert you when:</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="text-slate-300">Cash balance below 30 days of expenses</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="text-slate-300">More than 15% of invoices over 45 days old</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="text-slate-300">Expenses growing faster than revenue for 2+ months</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: "HR Agent",
    description: "Recruiting automation, onboarding workflows, team communication, and culture building.",
    readTime: "8 min",
    difficulty: "Intermediate",
    icon: Users,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Build Your Dream Team</h3>
          <p className="text-slate-300 mb-6">
            Stop wasting time on recruiting admin work. This agent handles job posts, candidate screening, 
            onboarding checklists, and team communication so you can focus on finding great people.
          </p>
        </div>

        <ROIBox
          title="Hiring Efficiency"
          savings="60% less time per hire, 40% better candidate quality"
          description="Structured screening and onboarding typically reduce time-to-hire by 60% and improve new hire success rates"
        />

        <div className="space-y-6">
          <CopyPrompt
            title="HR Manager Agent"
            prompt={`You are my HR Manager AI. Help me find, hire, and onboard great people.

**My Company:**
- Size: [NUMBER] employees
- Industry: [DESCRIPTION]
- Culture: [CASUAL/FORMAL/REMOTE/etc.]
- Growth stage: [STARTUP/GROWING/ESTABLISHED]

**Current HR Challenges:**
□ Finding qualified candidates
□ Screening applications efficiently
□ Onboarding new hires
□ Team communication
□ Performance management
□ Company culture

**Typical Roles I Hire:**
- [ROLE 1]: [DESCRIPTION]
- [ROLE 2]: [DESCRIPTION]
- [ROLE 3]: [DESCRIPTION]

**Help me with:**
1. **Job descriptions** — Attract right candidates
2. **Screening questions** — Filter efficiently  
3. **Interview guides** — Consistent evaluation
4. **Onboarding checklists** — Smooth first weeks
5. **Team communication** — Clear, regular updates

What's your biggest people challenge right now?`}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-white"><FileText className="w-4 h-4 text-slate-400 inline" /> Job Description Creator</h4>
              <CopyPrompt
                title="Job Posting Agent"
                prompt={`Create a compelling job description for [JOB TITLE] at my [COMPANY TYPE].

**Role Details:**
- Department: [WHERE THEY'LL WORK]
- Reports to: [MANAGER/ROLE]
- Salary range: $[X] - $[Y]
- Location: [REMOTE/OFFICE/HYBRID]

**Must-have skills:**
- [SKILL 1]
- [SKILL 2] 
- [SKILL 3]

**Nice-to-have:**
- [BONUS SKILL 1]
- [BONUS SKILL 2]

**Company Culture:**
- [VALUES/ENVIRONMENT DESCRIPTION]
- [WHAT MAKES YOU UNIQUE]

**Create:**
1. **Compelling title** — Gets clicks
2. **Hook** — Why someone would want this job
3. **Responsibilities** — What they'll actually do
4. **Requirements** — Must-haves vs. nice-to-haves
5. **Benefits** — What's in it for them
6. **Next steps** — How to apply

**Goal:** Attract quality candidates, filter out poor fits

What makes this role exciting?`}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white"><Target className="w-4 h-4 text-red-400 inline" /> Candidate Screening</h4>
              <CopyPrompt
                title="Application Reviewer Agent"
                prompt={`Help me screen candidates for [JOB TITLE] efficiently.

**Role Requirements:**
- Must-have skills: [LIST]
- Deal-breakers: [THINGS THAT DISQUALIFY]
- Salary range: $[X] - $[Y]
- Start date: [WHEN NEEDED]

**Screening Criteria:**
1. **Experience match** — Do they have what we need?
2. **Culture fit indicators** — Will they thrive here?
3. **Red flags** — Reasons to pass
4. **Interview potential** — Worth 30 minutes of my time?

**For each resume/application, tell me:**
- **Score:** 1-10 (10 = interview immediately)
- **Strengths:** What they do well
- **Concerns:** What might not work
- **Questions:** What to ask in interview

**Format:** Quick summary I can scan in 30 seconds

**Goal:** Identify top 20% of candidates for interviews

Here are the applications:
[PASTE CANDIDATE INFO]`}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white"><PartyPopper className="w-4 h-4 text-yellow-400 inline" /> Onboarding Checklist</h4>
            <CopyPrompt
              title="New Hire Onboarding Agent"
              prompt={`Create a complete onboarding checklist for new [JOB TITLE] at my [COMPANY TYPE].

**Company Details:**
- Size: [NUMBER] employees
- Remote/Office: [SETUP]
- Tools we use: [SOFTWARE/SYSTEMS]
- Culture: [DESCRIPTION]

**Onboarding Goals:**
- Productive by: [WEEK/MONTH]
- Feels welcomed and informed
- Understands role and expectations
- Knows who to ask for help

**Create timeline for:**

**Week 1 (Getting Settled):**
- Administrative setup
- Tool access and training
- Meet the team
- Company overview

**Week 2-4 (Learning the Role):**
- Job-specific training
- First projects/assignments  
- Regular check-ins
- Culture integration

**Month 2-3 (Full Integration):**
- Performance expectations
- Growth opportunities
- Feedback and adjustment

**Format:** Day-by-day checklist with owner assignments

What does success look like after 90 days?`}
            />
          </div>
        </div>

        <TryThis>
          <p>Start with your onboarding checklist — even if you're not hiring now. Most companies lose good people in the first 90 days because of poor onboarding. Having a system ready gives you a huge advantage.</p>
          <p className="mt-2 text-purple-300 font-medium">Pro tip: Ask your current team what they wish they'd known in their first month. Build those insights into your process.</p>
        </TryThis>

        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-green-400 mb-2"><Target className="w-4 h-4 text-red-400 inline" /> Hiring Success Formula</h4>
          <div className="space-y-2 text-sm">
            <p className="text-slate-300 mb-2">Great hires come from this sequence:</p>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-green-800/30 text-green-300 text-xs font-bold flex items-center justify-center">1</span>
              <span className="text-slate-300">Clear job description attracts right people</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-green-800/30 text-green-300 text-xs font-bold flex items-center justify-center">2</span>
              <span className="text-slate-300">Consistent screening eliminates poor fits early</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-green-800/30 text-green-300 text-xs font-bold flex items-center justify-center">3</span>
              <span className="text-slate-300">Structured interviews reveal true capabilities</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-green-800/30 text-green-300 text-xs font-bold flex items-center justify-center">4</span>
              <span className="text-slate-300">Thorough onboarding ensures early success</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 7,
    title: "Building Your Agent Team",
    description: "Orchestrate multiple agents, create workflows, scale your AI automation, and measure success.",
    readTime: "15 min",
    difficulty: "Advanced",
    icon: Settings,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Your Complete AI Business System</h3>
          <p className="text-slate-300 mb-6">
            Now you'll connect all your agents into a coordinated team that runs your business 
            24/7. Learn to orchestrate workflows, handle handoffs, and scale your automation.
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
          <h4 className="font-semibold text-purple-400 mb-3"><Link2 className="w-4 h-4 text-blue-400 inline" /> Your AI Business Ecosystem</h4>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">CS</div>
                <span className="text-slate-300">Chief of Staff → Daily coordination</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">MK</div>
                <span className="text-slate-300">Marketing → Lead generation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xs">OP</div>
                <span className="text-slate-300">Operations → Process management</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">CX</div>
                <span className="text-slate-300">Customer Service → Support</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs">FN</div>
                <span className="text-slate-300">Finance → Money management</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 flex items-center justify-center text-white font-bold text-xs">HR</div>
                <span className="text-slate-300">HR → Team building</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <CopyPrompt
            title="Master Orchestrator Agent"
            prompt={`You are my Master Business Orchestrator. You coordinate all my AI agents to run my business smoothly.

**My AI Team:**
- Chief of Staff: Daily briefings, email triage, priority management
- Marketing Agent: Content creation, lead generation, social media
- Operations Agent: Process optimization, KPI tracking, workflow management  
- Customer Service: Support, FAQ, complaint resolution
- Finance Agent: Invoicing, expense tracking, cash flow
- HR Agent: Recruiting, onboarding, team communication

**Your Responsibilities:**
1. **Daily Coordination** — Ensure agents work together, not in silos
2. **Workflow Management** — Design handoffs between agents
3. **Performance Monitoring** — Track what's working, what needs fixing
4. **Escalation Handling** — When human intervention is needed
5. **Strategic Planning** — Weekly/monthly optimization

**Key Workflows to Orchestrate:**
- Lead generation → Customer service → Sales follow-up
- New hire → Onboarding → Performance tracking
- Customer complaint → Resolution → Follow-up
- Content creation → Social posting → Lead nurturing
- Invoice generation → Payment tracking → Cash flow analysis

**Communication Style:**
- Daily: Brief status updates
- Weekly: Performance summary and optimization suggestions  
- Monthly: Strategic recommendations for business growth

This week's priorities and challenges:`}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-white"><RefreshCw className="w-4 h-4 text-blue-400 inline" /> Workflow Automation</h4>
              <div className="space-y-3 text-sm">
                <div className="bg-[var(--bg-card)]/50 rounded-lg p-3 border border-[var(--border-color)]">
                  <div className="font-medium text-white mb-1">Lead to Customer Flow</div>
                  <div className="text-slate-300">Marketing Agent → Customer Service → Sales Follow-up → Finance</div>
                </div>
                <div className="bg-[var(--bg-card)]/50 rounded-lg p-3 border border-[var(--border-color)]">
                  <div className="font-medium text-white mb-1">Content Distribution</div>
                  <div className="text-slate-300">Marketing Agent → Social Posting → Lead Capture → CRM Updates</div>
                </div>
                <div className="bg-[var(--bg-card)]/50 rounded-lg p-3 border border-[var(--border-color)]">
                  <div className="font-medium text-white mb-1">New Employee Journey</div>
                  <div className="text-slate-300">HR Agent → Onboarding → Operations → Performance Tracking</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white"><BarChart3 className="w-4 h-4 text-blue-400 inline" /> Success Metrics</h4>
              <CopyPrompt
                title="AI Team Performance Tracker"
                prompt={`Track the performance of my AI agent team and suggest improvements.

**Agent Performance Metrics:**

**Chief of Staff:**
- Daily briefings sent: [X/7 per week]
- Emails triaged: [X per day]
- Time saved: [X hours per week]

**Marketing Agent:**
- Content pieces created: [X per week]
- Leads generated: [X per month]
- Social engagement rate: [X%]

**Customer Service:**
- Response time: [X minutes average]
- Resolution rate: [X% first contact]
- Customer satisfaction: [X/10 average]

**Overall Business Impact:**
- Time saved: [X hours per week]
- Revenue impact: [$ per month]
- Efficiency gains: [X% improvement]

**Weekly Review Questions:**
1. Which agents are performing best?
2. Where are the bottlenecks?
3. What workflows need optimization?
4. What new automation opportunities exist?

This week's metrics:`}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white"><Rocket className="w-4 h-4 text-blue-400 inline" /> Scaling Strategy</h4>
            <CopyPrompt
              title="AI Business Growth Agent"
              prompt={`Help me scale my AI agent team as my business grows.

**Current Business Status:**
- Monthly revenue: $[AMOUNT]
- Team size: [NUMBER] people
- Customer volume: [NUMBER] per month
- Growth rate: [X% per month]

**AI Automation Maturity:**
- Basic agents running: [LIST CURRENT AGENTS]
- Workflows automated: [LIST CURRENT WORKFLOWS]
- Time saved: [X HOURS PER WEEK]

**Growth Challenges:**
- [CURRENT BOTTLENECK #1]
- [CURRENT BOTTLENECK #2]
- [CURRENT BOTTLENECK #3]

**Scaling Plan Needed:**
1. **Next automation priorities** — What to automate next
2. **Capacity planning** — When agents need upgrades
3. **Quality maintenance** — Keep personalization as you scale
4. **ROI optimization** — Best investments for growth
5. **Risk management** — Backup plans for AI dependencies

**Goal:** Handle 3x current volume without hiring 3x more people

What should I automate next for maximum impact?`}
            />
          </div>
        </div>

        <TryThis>
          <p>Don't try to build the complete system at once. Start with 2-3 agents that work together (like Chief of Staff + Marketing), perfect that workflow, then add the next agent. Build slowly and test each connection.</p>
          <p className="mt-2 text-purple-300 font-medium">Master rule: Every agent should save you at least 2 hours per week or generate measurable revenue impact.</p>
        </TryThis>

        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-amber-400 mb-2"><AlertTriangle className="w-4 h-4 text-yellow-400 inline" /> Scaling Pitfalls to Avoid</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0"></span>
              <span className="text-slate-300"><strong>Over-automation:</strong> Don't automate every tiny task. Focus on high-impact areas.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0"></span>
              <span className="text-slate-300"><strong>Lost personal touch:</strong> Maintain human connection in customer-facing processes.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0"></span>
              <span className="text-slate-300"><strong>Complex dependencies:</strong> Keep workflows simple enough that you understand them.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0"></span>
              <span className="text-slate-300"><strong>No backup plans:</strong> Always have manual processes ready when AI fails.</span>
            </div>
          </div>
        </div>

        <ROIBox
          title="Complete System ROI"
          savings="15-25 hours/week saved, 40-60% efficiency gain"
          description="A fully orchestrated AI agent team typically replaces 0.5-1.0 FTE worth of admin work while improving consistency and response times"
        />
      </div>
    )
  }
];

export default function LearnBusinessPage() {
  const [currentLesson, setCurrentLesson] = useState(1);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);

  useEffect(() => {
    // Load progress from localStorage
    const saved = localStorage.getItem('learn_progress_business');
    if (saved) {
      setCompletedLessons(JSON.parse(saved));
    }
  }, []);

  const markComplete = (lessonId: number) => {
    if (!completedLessons.includes(lessonId)) {
      const newCompleted = [...completedLessons, lessonId];
      setCompletedLessons(newCompleted);
      localStorage.setItem('learn_progress_business', JSON.stringify(newCompleted));
    }
  };

  const currentLessonData = lessons.find(l => l.id === currentLesson);
  const progress = (completedLessons.length / lessons.length) * 100;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <section className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/30">
        <div className="container container-2xl section-padding">
          <div className="max-w-4xl mx-auto">
            <Link 
              href="/learn" 
              className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-purple)] transition-colors mb-6"
            >
              <ArrowLeft size={16} />
              <span>Back to Learning Hub</span>
            </Link>
            
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
                AI Agents for Business
                <span className="block text-lg font-normal text-[var(--text-secondary)] mt-2">
                  Build an AI-powered team that runs your business 24/7
                </span>
              </h1>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--text-muted)]">Your Progress</span>
                  <span className="text-[var(--accent-purple)]">{completedLessons.length} of {lessons.length} lessons</span>
                </div>
                <div className="w-full bg-[var(--bg-card)] rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[var(--accent-purple)] to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container container-2xl section-padding">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar - Lesson Navigation */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <h3 className="font-semibold text-white mb-4">Lessons</h3>
                <div className="space-y-2">
                  {lessons.map((lesson) => {
                    const isCompleted = completedLessons.includes(lesson.id);
                    const isCurrent = currentLesson === lesson.id;
                    
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setCurrentLesson(lesson.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isCurrent 
                            ? 'bg-[var(--accent-purple)]/10 border-[var(--accent-purple)]/30 text-[var(--accent-purple)]'
                            : isCompleted
                            ? 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30 text-[var(--accent-green)]'
                            : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--accent-purple)]/40 hover:text-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isCurrent
                              ? 'bg-[var(--accent-purple)] text-white'
                              : isCompleted 
                              ? 'bg-[var(--accent-green)] text-white'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle size={14} />
                            ) : (
                              <lesson.icon size={14} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm mb-1">{lesson.title}</div>
                            <div className="flex items-center gap-2 text-xs">
                              <span>{lesson.readTime}</span>
                              <span className="text-[var(--text-muted)]">•</span>
                              <span className={
                                lesson.difficulty === 'Beginner' 
                                  ? 'text-green-400' 
                                  : lesson.difficulty === 'Intermediate'
                                  ? 'text-amber-400'
                                  : 'text-purple-400'
                              }>
                                {lesson.difficulty}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {currentLessonData && (
                <article>
                  {/* Lesson Header */}
                  <header className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-pink-500 flex items-center justify-center text-white">
                        <currentLessonData.icon size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-1">
                          {currentLessonData.title}
                        </h2>
                        <p className="text-[var(--text-secondary)]">
                          {currentLessonData.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {currentLessonData.readTime}
                      </span>
                      <span className={
                        currentLessonData.difficulty === 'Beginner' 
                          ? 'text-green-400' 
                          : currentLessonData.difficulty === 'Intermediate'
                          ? 'text-amber-400'
                          : 'text-purple-400'
                      }>
                        {currentLessonData.difficulty}
                      </span>
                    </div>
                  </header>

                  {/* Lesson Content */}
                  <div className="prose prose-invert max-w-none">
                    {currentLessonData.content}
                  </div>

                  {/* Lesson Navigation */}
                  <footer className="mt-12 pt-8 border-t border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                      <div>
                        {currentLesson > 1 && (
                          <button
                            onClick={() => setCurrentLesson(currentLesson - 1)}
                            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-purple)] transition-colors"
                          >
                            <ArrowLeft size={16} />
                            Previous Lesson
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => markComplete(currentLesson)}
                          className={`btn transition-all ${
                            completedLessons.includes(currentLesson)
                              ? 'border border-[var(--accent-green)] text-[var(--accent-green)]'
                              : 'bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80 text-white'
                          }`}
                          disabled={completedLessons.includes(currentLesson)}
                        >
                          {completedLessons.includes(currentLesson) ? (
                            <>
                              <CheckCircle size={16} />
                              Completed
                            </>
                          ) : (
                            'Mark Complete'
                          )}
                        </button>

                        {currentLesson < lessons.length && (
                          <button
                            onClick={() => setCurrentLesson(currentLesson + 1)}
                            className="flex items-center gap-2 text-[var(--accent-purple)] hover:text-[var(--accent-purple)]/80 transition-colors"
                          >
                            Next Lesson
                            <ArrowRight size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {currentLesson === lessons.length && (
                      <div className="mt-8 text-center">
                        <div className="bg-gradient-to-r from-[var(--accent-purple)]/10 to-pink-500/10 border border-[var(--accent-purple)]/30 rounded-xl p-6">
                          <h3 className="text-xl font-bold text-white mb-2"><PartyPopper className="w-4 h-4 text-yellow-400 inline" /> Course Complete!</h3>
                          <p className="text-[var(--text-secondary)] mb-4">
                            You've mastered business AI agents. Ready to practice or find agents to hire?
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link href="/learn/playground" className="btn bg-[var(--accent-purple)] text-white hover:bg-[var(--accent-purple)]/80">
                              Try the Playground
                            </Link>
                            <Link href="/agents" className="btn border border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] hover:text-white">
                              Find Agents to Hire
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </footer>
                </article>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <section className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/30 section-padding">
        <div className="container container-2xl">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to Hire Professional AI Agents?
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Now that you understand how business AI agents work, discover pre-built agents 
              in our marketplace that can handle these workflows professionally.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/agents" className="btn bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80 text-white">
                Browse Business Agents
              </Link>
              <Link 
                href="/learn/playground" 
                className="btn border border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[var(--accent-green)] hover:text-white"
              >
                Practice in Playground
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}