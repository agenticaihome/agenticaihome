'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Copy, ChevronRight, Clock, ArrowLeft, ArrowRight, Sun, UtensilsCrossed, Home, Users, Zap, ExternalLink, Eye, Bell } from 'lucide-react';
import Link from 'next/link';

interface Lesson {
  id: number;
  title: string;
  description: string;
  readTime: string;
  difficulty: 'Beginner' | 'Intermediate';
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
        <span className="text-sm font-medium text-slate-300">📋 {title}</span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            copied 
              ? 'bg-green-600 text-white' 
              : 'bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-white'
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
  <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Zap size={14} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-amber-400 text-sm mb-2">Try This Today</h4>
        <div className="text-sm text-slate-300">
          {children}
        </div>
      </div>
    </div>
  </div>
);

const lessons: Lesson[] = [
  {
    id: 1,
    title: "Your First AI Agent",
    description: "Set up a Morning Briefing agent that gives you weather, schedule, and priorities every day.",
    readTime: "8 min",
    difficulty: "Beginner",
    icon: Sun,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-xl p-6 border border-teal-500/30">
          <div className="flex items-start gap-4">
            <Eye className="text-teal-400 flex-shrink-0 mt-1" size={20} />
            <div>
              <h3 className="text-teal-400 font-semibold mb-2">What You'll Wake Up To</h3>
              <div className="bg-black/40 rounded-lg p-3 text-sm space-y-1">
                <p>☀️ <strong className="text-white">Weather:</strong> 72°F, partly cloudy. No umbrella needed!</p>
                <p>📅 <strong className="text-white">Today:</strong> Team meeting 10am, dentist 2pm, grocery pickup 5pm</p>
                <p>🔔 <strong className="text-white">Reminder:</strong> Take vitamins (you forgot yesterday!)</p>
                <p>⚡ <strong className="text-white">Captain's Tip:</strong> Prep tomorrow's outfit tonight</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white mb-4">How to Set This Up</h3>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Choose Your AI Platform</h4>
                <p className="text-slate-300 text-sm mb-3">
                  <strong className="text-teal-400">ChatGPT is easiest</strong> — free with Google signup, has scheduling features.
                  Claude, Gemini, and others work too but may need manual daily prompts.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: 'ChatGPT', url: 'https://chat.openai.com', color: 'from-green-500 to-teal-500', recommended: true },
                    { name: 'Claude', url: 'https://claude.ai', color: 'from-orange-500 to-red-500' },
                    { name: 'Gemini', url: 'https://gemini.google.com', color: 'from-blue-500 to-purple-500' },
                    { name: 'Perplexity', url: 'https://perplexity.ai', color: 'from-purple-500 to-pink-500' }
                  ].map((platform) => (
                    <a
                      key={platform.name}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`relative flex items-center justify-center px-3 py-2 rounded-lg bg-gradient-to-r ${platform.color} text-white text-xs font-medium hover:scale-[1.02] transition-all`}
                    >
                      {platform.recommended && (
                        <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                          BEST
                        </span>
                      )}
                      {platform.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-2">Copy This Prompt</h4>
                <CopyPrompt
                  title="Morning Agent Setup"
                  prompt={`You are my Morning Agent. Your job is to send me a short, helpful morning briefing every day.

**One-time setup (ask me these 3 questions):**
1. What city am I in? (for weather)
2. What time do I want this briefing? (ex: 7:00 AM)
3. What's one thing I tend to forget? (vitamins, keys, calling someone, etc.)

**Daily briefing (keep it under 120 words):**

🌤️ **Weather** — Look up the real current weather for my city (temp + conditions) and tell me what to wear.

📅 **Top 3 Today** — If I connected my calendar, list my next 3 events. If not, ask me for my 3 main things today.

🧠 **One Reminder** — The thing I usually forget (or a quick question if you need it).

⚡ **Captain's Tip** — One tiny action today that makes tomorrow easier.

---

**Rules:**
- Friendly, warm, simple language
- Emojis for easy scanning
- Under 120 words total
- If scheduling is available, set this to run daily at my chosen time
- If scheduling isn't available, tell me: "Type 'Morning Briefing' anytime and I'll generate today's briefing instantly."

Start by asking me question #1.`}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Answer 3 Simple Questions</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-3">
                    <span className="text-teal-400 font-semibold">City:</span>
                    <span className="text-slate-300">So it knows your weather</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-teal-400 font-semibold">Time:</span>
                    <span className="text-slate-300">When you want your briefing (7:00 AM works great)</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-teal-400 font-semibold">Forget:</span>
                    <span className="text-slate-300">Something you always forget (vitamins, keys, calling mom)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <TryThis>
          <p>Set this up right now — it takes 3 minutes. Tomorrow morning you'll get your first briefing and feel the difference immediately. Enable notifications on your phone so you actually see it.</p>
          <p className="mt-2 text-amber-300 font-medium">Pro tip: Say "Remember this for next time" so the AI saves your preferences.</p>
        </TryThis>

        <div className="bg-[var(--bg-card)]/50 rounded-xl p-4 border border-[var(--border-color)]">
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
            <Bell size={16} className="text-amber-400" />
            Important: Enable Notifications
          </h4>
          <p className="text-slate-300 text-sm">
            Go to your phone Settings → Notifications → ChatGPT → Allow. Without this, 
            your agent can't reach you and the magic doesn't work.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Daily Routines Agent",
    description: "Automate your schedule management, task prioritization, and evening wind-down routines.",
    readTime: "6 min", 
    difficulty: "Beginner",
    icon: Clock,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Master Your Day with AI</h3>
          <p className="text-slate-300 mb-6">
            Beyond the morning briefing, you can create agents that help you throughout the day — 
            managing your schedule, prioritizing tasks, and even planning your evening routine.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-white">📅 Schedule Optimizer</h4>
            <CopyPrompt
              title="Daily Schedule Agent"
              prompt={`You are my Schedule Optimizer. Help me make the most of my day.

When I share my calendar or task list, analyze it and give me:

1. **Time Blocks** — Group similar tasks together
2. **Energy Matching** — Put hard tasks when I'm fresh, easy ones when I'm tired
3. **Buffer Time** — Add 10-15 min between meetings
4. **Quick Wins** — 2-3 easy tasks I can knock out fast

My energy patterns:
- Peak focus time: [MORNING/AFTERNOON/EVENING]
- Low energy time: [WHEN I USUALLY CRASH]
- Best for meetings: [MORNING/AFTERNOON]
- Prefer deep work: [TIME BLOCKS]

Keep suggestions practical — I'm human, not a robot.

What's on your schedule today?`}
            />
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white">🌙 Evening Wind-Down</h4>
            <CopyPrompt
              title="Evening Routine Agent"
              prompt={`You are my Evening Wind-Down Agent. Help me end my day peacefully and prep for tomorrow.

When I check in each evening, help me:

1. **Day Review** — What went well? What can improve?
2. **Tomorrow Prep** — Top 3 priorities for tomorrow
3. **Wind-Down Checklist** — Personalized evening routine
4. **Gratitude** — One thing I'm grateful for today

My preferences:
- Bedtime goal: [TIME]
- Biggest evening challenge: [SCROLLING PHONE/TOO WIRED/FORGETTING TASKS]
- What helps me relax: [READING/MUSIC/MEDITATION/OTHER]

Keep it brief — I don't want homework, just gentle guidance.

How was your day?`}
            />
          </div>
        </div>

        <TryThis>
          <p>Pick ONE routine that's currently chaotic in your life. Maybe your mornings feel rushed, or you can't wind down at night. Set up that agent first, use it for a week, then add the others.</p>
          <p className="mt-2 text-amber-300 font-medium">Start small, build habits, then stack.</p>
        </TryThis>

        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-purple-400 mb-2">Advanced: Multi-Agent Workflow</h4>
          <p className="text-slate-300 text-sm mb-3">
            Once you're comfortable with individual agents, you can create workflows where they work together:
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span className="text-slate-300">Morning Agent shares priorities with Schedule Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span className="text-slate-300">Schedule Agent feeds incomplete tasks to Evening Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span className="text-slate-300">Evening Agent sets up tomorrow's Morning Agent</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Kitchen & Grocery Agent", 
    description: "Never wonder 'what's for dinner?' again. Meal planning, shopping lists, and recipe suggestions.",
    readTime: "7 min",
    difficulty: "Beginner",
    icon: UtensilsCrossed,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">End Meal Planning Stress Forever</h3>
          <p className="text-slate-300 mb-6">
            The "what's for dinner?" panic happens to everyone. This agent handles meal planning, 
            creates shopping lists, and even suggests recipes based on what's in your fridge.
          </p>
        </div>

        <div className="space-y-6">
          <CopyPrompt
            title="Meal Planning Agent"
            prompt={`Be my Meal Planning Agent. I want simple, stress-free dinners.

About my household:
- Number of people eating dinner: [NUMBER]
- Dietary needs: [ALLERGIES, VEGETARIAN, PICKY EATERS, ETC.]
- Weekly grocery budget: $[AMOUNT] (rough estimate is fine)
- Cooking skill: [BEGINNER / INTERMEDIATE / LOVE TO COOK]
- Time for weeknight dinners: [15 MIN / 30 MIN / UP TO 1 HOUR]
- Cuisines we like: [EXAMPLES]

Every time I ask for meal planning, give me:
1. **5 dinner ideas for the week**
2. **For each dinner:** Name, Ingredients, Prep time + cook time, Simple numbered steps
3. **One combined shopping list,** organized by store section
4. **Rough cost estimate** for the list (doesn't have to be exact)

Rules:
- Keep it simple — real food, not fancy. Think: weeknight dinners, not Pinterest meals.
- Weeknight-friendly meals (nothing complicated)
- Use overlapping ingredients when possible
- If helpful, ask me what I already have in the fridge or pantry

Ready to plan this week?`}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-white">🥘 Recipe Rescue Agent</h4>
              <CopyPrompt
                title="Recipe Helper"
                prompt={`You are my Recipe Rescue Agent. I'll tell you what's in my fridge and you suggest dinner.

My cooking constraints:
- Time available: [X MINUTES]
- Skill level: [BEGINNER/INTERMEDIATE/ADVANCED]
- Kitchen tools: [BASIC/WELL-EQUIPPED/MINIMAL]

When I tell you what ingredients I have, suggest:
1. **2-3 realistic dinner options** using mostly those ingredients
2. **What I might need to buy** (keep it minimal)
3. **Simple cooking steps** — numbered, no fancy techniques

Make it doable. I want dinner, not a cooking show.

Here's what's in my fridge and pantry:`}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">🛒 Smart Shopping Agent</h4>
              <CopyPrompt
                title="Shopping List Optimizer"
                prompt={`You are my Smart Shopping Agent. Help me shop efficiently and save money.

My shopping info:
- Main store: [GROCERY STORE NAME]
- Budget consciousness: [TIGHT BUDGET/MODERATE/FLEXIBLE]
- Family size: [NUMBER] people
- Special needs: [ALLERGIES, PREFERENCES]

When I give you a shopping list or meal plan:
1. **Organize by store sections** (produce, dairy, etc.)
2. **Suggest generic/store brand alternatives** for savings
3. **Point out bulk buying opportunities**
4. **Estimate total cost**
5. **Suggest what to prep when I get home**

Help me be smart about this. Here's what I need to buy:`}
              />
            </div>
          </div>
        </div>

        <TryThis>
          <p>This Sunday, ask your Meal Planning Agent to plan next week's dinners. Print the shopping list and take it to the store. Notice how much mental energy you saved by not making 47 food decisions in the grocery aisles.</p>
          <p className="mt-2 text-amber-300 font-medium">Pro tip: Take a photo of your fridge before shopping so you don't buy duplicates.</p>
        </TryThis>

        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-green-400 mb-2">Real User Result</h4>
          <blockquote className="text-slate-300 text-sm italic">
            "I used to spend 2 hours every Sunday planning meals and making shopping lists. Now it takes 10 minutes and my family actually eats the dinners I planned. Life-changing." — Sarah, mom of 3
          </blockquote>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Home Management Agent",
    description: "Track bills, maintenance schedules, and household tasks. Never forget to change the air filter again.",
    readTime: "6 min",
    difficulty: "Intermediate", 
    icon: Home,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Your Home Runs Itself</h3>
          <p className="text-slate-300 mb-6">
            Stop forgetting bills, maintenance, and household tasks. This agent tracks everything 
            so you can focus on living in your home instead of managing it.
          </p>
        </div>

        <div className="space-y-6">
          <CopyPrompt
            title="Home Management Agent"
            prompt={`You are my Home Management Agent. Help me stay on top of bills, maintenance, and household tasks without stress.

**ABOUT MY HOME:**
- Type: [APARTMENT/HOUSE/CONDO]
- Year built: [APPROXIMATE]
- Major appliances: [WASHER/DRYER/DISHWASHER/etc.]
- Yard/outdoor space: [YES/NO, SIZE]

**MY STYLE:**
- Reminder preference: [WEEKLY CHECK-IN/MONTHLY REVIEW/AS-NEEDED]
- Organization level: [VERY ORGANIZED/SOMEWHAT ORGANIZED/CHAOTIC]

**TRACK FOR ME:**
1. **Bills & Due Dates** — When stuff is due, how much, autopay status
2. **Maintenance Schedule** — HVAC filters, smoke detectors, seasonal tasks
3. **Warranty Info** — What's covered, when it expires
4. **Emergency Contacts** — Plumber, electrician, etc.

**WHEN I CHECK IN:**
- Show me what's due this week/month
- Remind me of seasonal tasks (winterizing, spring cleaning, etc.)
- Alert me to maintenance that prevents bigger problems
- Suggest cost-saving tips

Start by asking what bills and maintenance I want to track.`}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-white">💡 Maintenance Scheduler</h4>
              <div className="bg-[var(--bg-card)]/50 rounded-xl p-4 border border-[var(--border-color)]">
                <p className="text-slate-300 text-sm mb-3">Common maintenance your agent should track:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">HVAC filters</span>
                    <span className="text-slate-300">Every 3 months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Smoke detector batteries</span>
                    <span className="text-slate-300">Twice yearly</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gutters cleaning</span>
                    <span className="text-slate-300">Spring & fall</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Water heater flush</span>
                    <span className="text-slate-300">Annually</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dryer vent cleaning</span>
                    <span className="text-slate-300">Annually</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">📋 Emergency Kit Agent</h4>
              <CopyPrompt
                title="Home Emergency Assistant"
                prompt={`You are my Home Emergency Assistant. When something breaks or goes wrong, help me handle it calmly.

MY HOME SITUATION:
- Type of home: [DETAILS]
- DIY skill level: [NONE/BASIC/HANDY]
- Emergency fund: [TIGHT/MODERATE/FLEXIBLE]

WHEN I HAVE A PROBLEM:
1. **Assess urgency** — Emergency, needs professional, or can DIY?
2. **Immediate steps** — What to do right now to prevent damage
3. **Who to call** — Recommend professionals or DIY approach
4. **Rough cost estimate** — So I know what to expect
5. **Prevention tips** — How to avoid this in the future

Keep me calm and give clear next steps. I'm stressed when things break.

My emergency: [DESCRIBE THE PROBLEM]`}
              />
            </div>
          </div>
        </div>

        <TryThis>
          <p>Set up your agent with 3 things: your 5 biggest monthly bills, your home's age/type, and one maintenance task you always forget. Start there and add more over time.</p>
          <p className="mt-2 text-amber-300 font-medium">Bonus: Ask it to create a seasonal home maintenance checklist for your area.</p>
        </TryThis>

        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-red-400 mb-2">💰 Money-Saving Insight</h4>
          <p className="text-slate-300 text-sm">
            Preventive maintenance costs way less than emergency repairs. A $30 HVAC filter change 
            prevents a $3,000 system replacement. Your agent pays for itself by preventing one major repair.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Family & Kids Agent",
    description: "Organize activities, track schedules, homework help, and educational games for the whole family.",
    readTime: "5 min",
    difficulty: "Beginner",
    icon: Users,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Your Family's Personal Assistant</h3>
          <p className="text-slate-300 mb-6">
            Managing a family is like running a small company. This agent helps with schedules, 
            activities, homework, and even generates educational games for kids.
          </p>
        </div>

        <div className="space-y-6">
          <CopyPrompt
            title="Family Coordinator Agent"
            prompt={`You are my Family Coordinator Agent. Help me manage our busy family life without losing my mind.

**OUR FAMILY:**
- Adults: [NUMBER, NAMES]  
- Kids: [AGES, NAMES, PERSONALITY NOTES]
- Special needs: [ALLERGIES, LEARNING DIFFERENCES, etc.]

**WEEKLY CHALLENGES:**
- Biggest scheduling pain: [AFTER SCHOOL ACTIVITIES/MEAL PLANNING/HOMEWORK/etc.]
- Hardest time of day: [MORNINGS/AFTER SCHOOL/BEDTIME]
- What always gets forgotten: [LUNCH MONEY/PERMISSION SLIPS/SPORTS GEAR/etc.]

**HELP ME WITH:**
1. **Weekly Schedule Coordination** — Who needs to be where when
2. **Activity Ideas** — Age-appropriate, season-appropriate fun
3. **Educational Games** — Learning that feels like playing
4. **Routine Optimization** — Make mornings/evenings run smoother

**MY STYLE:**
- Planning preference: [DETAILED PLANS/FLEXIBLE STRUCTURE/GO WITH FLOW]
- Screen time approach: [LIMITED/MODERATE/FLEXIBLE]

What's our biggest family challenge this week?`}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-white">🎓 Homework Helper</h4>
              <CopyPrompt
                title="Homework Assistant"
                prompt={`You are my kid's Homework Helper. Make learning fun and reduce homework battles.

**ABOUT MY CHILD:**
- Age/Grade: [X years old, Xth grade]
- Learning style: [VISUAL/HANDS-ON/AUDITORY/READING]
- Struggles with: [MATH/READING/FOCUS/MOTIVATION]
- Loves: [INTERESTS THAT COULD HELP WITH LEARNING]

**WHEN WE NEED HELP:**
1. **Break down big assignments** into kid-sized steps
2. **Explain concepts simply** — like I'm [AGE] years old
3. **Suggest fun practice activities** related to their interests
4. **Encourage without doing the work for them**

**RULES:**
- Don't give direct answers — guide them to figure it out
- Keep explanations short and engaging
- Suggest breaks when frustrated
- Celebrate small wins

Today's homework challenge:`}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">🎨 Activity Generator</h4>
              <CopyPrompt
                title="Family Activity Planner"
                prompt={`You are my Family Activity Planner. Generate fun, doable activities for our family.

**OUR FAMILY INFO:**
- Kids ages: [AGES]
- Location: [CITY/REGION for local ideas]
- Budget: [FREE/LOW COST/MODERATE]
- Transportation: [WALK/DRIVE/PUBLIC TRANSIT]

**ACTIVITY PREFERENCES:**
- Energy level: [HIGH ENERGY/CALM/MIX]
- Setting: [INDOOR/OUTDOOR/EITHER] 
- Time available: [30 MIN/HOUR/HALF DAY/FULL DAY]
- Weather: [CURRENT CONDITIONS]

**GIVE ME:**
1. **3 activity options** that fit our constraints
2. **What we need** — materials, supplies, preparation
3. **Why kids will love it** — what makes it engaging
4. **Parent survival tips** — how to make it easier for adults

We have [TIME AVAILABLE] and want something [ENERGY LEVEL]. Ideas?`}
              />
            </div>
          </div>
        </div>

        <TryThis>
          <p>Next time your kids are bored or fighting, ask your Family Agent for 3 activity ideas that match your current energy level and time available. Try the one that sounds most doable, not most perfect.</p>
          <p className="mt-2 text-amber-300 font-medium">Emergency backup: "We have 15 minutes and I need them busy while I make dinner."</p>
        </TryThis>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-blue-400 mb-2">🧠 Educational Integration</h4>
          <p className="text-slate-300 text-sm mb-3">Your agent can turn any interest into learning:</p>
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span className="text-slate-300">Loves cars? Practice math with racing stats and distances</span>
            </div>
            <div className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span className="text-slate-300">Into art? Learn history through different art movements</span>
            </div>
            <div className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span className="text-slate-300">Obsessed with animals? Reading practice with nature documentaries</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: "Advanced Home Automation",
    description: "Connect multiple agents together and create workflows that run your entire household.",
    readTime: "10 min",
    difficulty: "Intermediate",
    icon: Zap,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Your AI-Powered Smart Home</h3>
          <p className="text-slate-300 mb-6">
            Once you're comfortable with individual agents, you can connect them to create 
            automated workflows that handle complex household management without your involvement.
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
          <h4 className="font-semibold text-purple-400 mb-3">🔗 Multi-Agent Workflow Example</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                1
              </div>
              <span className="text-slate-300">Morning Agent checks weather and calendar</span>
            </div>
            <div className="w-8 border-l-2 border-purple-400/30 ml-4 my-2"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                2
              </div>
              <span className="text-slate-300">If rainy day + kids home → Activity Agent suggests indoor activities</span>
            </div>
            <div className="w-8 border-l-2 border-purple-400/30 ml-4 my-2"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                3
              </div>
              <span className="text-slate-300">Meal Agent adjusts dinner plan (comfort food for rainy day)</span>
            </div>
            <div className="w-8 border-l-2 border-purple-400/30 ml-4 my-2"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs">
                4
              </div>
              <span className="text-slate-300">Shopping Agent adds comfort food ingredients to grocery pickup</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <CopyPrompt
            title="Master Home Agent"
            prompt={`You are my Master Home Agent. You coordinate all my other AI agents to run my household smoothly.

**MY AGENTS:**
- Morning Agent: Daily briefings and weather
- Meal Planning Agent: Weekly menus and shopping
- Family Agent: Kids' schedules and activities  
- Home Management Agent: Bills and maintenance
- Schedule Agent: Calendar optimization

**YOUR JOB:**
1. **Weekly Planning Session** — Coordinate all agents for upcoming week
2. **Daily Check-ins** — Make sure nothing is falling through cracks
3. **Crisis Management** — When something goes wrong, mobilize the right agents
4. **Efficiency Optimization** — Find ways for agents to work better together

**WORKFLOW TRIGGERS:**
- Weather changes → Adjust meal plans and activities
- Kids sick → Reschedule, meal delivery, activity backup plans
- Travel coming up → Meal prep, bill timing, maintenance before/after
- Seasonal changes → Update all agents for new routines

**COMMUNICATION STYLE:**
- Brief daily summaries
- Alert me to conflicts or problems
- Suggest optimizations weekly
- Handle routine coordination silently

This week's schedule and priorities:`}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-white">⚡ Automation Triggers</h4>
              <div className="space-y-3 text-sm">
                <div className="bg-[var(--bg-card)]/50 rounded-lg p-3 border border-[var(--border-color)]">
                  <div className="font-medium text-white mb-1">Weather-Based</div>
                  <div className="text-slate-300">Rain → Indoor activities, comfort food, no outdoor chores</div>
                </div>
                <div className="bg-[var(--bg-card)]/50 rounded-lg p-3 border border-[var(--border-color)]">
                  <div className="font-medium text-white mb-1">Calendar-Based</div>
                  <div className="text-slate-300">Busy week → Simple meals, prep ahead, minimal new tasks</div>
                </div>
                <div className="bg-[var(--bg-card)]/50 rounded-lg p-3 border border-[var(--border-color)]">
                  <div className="font-medium text-white mb-1">Seasonal</div>
                  <div className="text-slate-300">Fall → Back to school routines, winter prep, seasonal foods</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">🔧 Integration Tools</h4>
              <div className="space-y-3 text-sm">
                <div className="bg-[var(--bg-card)]/50 rounded-lg p-3 border border-[var(--border-color)]">
                  <div className="font-medium text-white mb-1">Shared Memory</div>
                  <div className="text-slate-300">Use ChatGPT Projects to share context between agents</div>
                </div>
                <div className="bg-[var(--bg-card)]/50 rounded-lg p-3 border border-[var(--border-color)]">
                  <div className="font-medium text-white mb-1">Zapier/IFTTT</div>
                  <div className="text-slate-300">Connect to calendars, shopping apps, smart home devices</div>
                </div>
                <div className="bg-[var(--bg-card)]/50 rounded-lg p-3 border border-[var(--border-color)]">
                  <div className="font-medium text-white mb-1">Regular Check-ins</div>
                  <div className="text-slate-300">Sunday planning, Wednesday check-in, Friday wrap-up</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <TryThis>
          <p>Start by connecting just 2 agents — maybe your Morning Agent and Meal Agent. Have the Morning Agent mention today's schedule so the Meal Agent can suggest appropriate dinner complexity (simple meal on busy days).</p>
          <p className="mt-2 text-amber-300 font-medium">Master this connection before adding more agents to the workflow.</p>
        </TryThis>

        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-amber-400 mb-2">⚠️ Start Simple Warning</h4>
          <p className="text-slate-300 text-sm">
            Don't try to automate everything at once. Master one agent, add another, connect them, 
            then expand. Complex systems break when you least expect it. Simple systems just work.
          </p>
        </div>
      </div>
    )
  }
];

export default function LearnHomePage() {
  const [currentLesson, setCurrentLesson] = useState(1);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);

  useEffect(() => {
    // Load progress from localStorage
    const saved = localStorage.getItem('learn_progress_home');
    if (saved) {
      setCompletedLessons(JSON.parse(saved));
    }
  }, []);

  const markComplete = (lessonId: number) => {
    if (!completedLessons.includes(lessonId)) {
      const newCompleted = [...completedLessons, lessonId];
      setCompletedLessons(newCompleted);
      localStorage.setItem('learn_progress_home', JSON.stringify(newCompleted));
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
              className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors mb-6"
            >
              <ArrowLeft size={16} />
              <span>Back to Learning Hub</span>
            </Link>
            
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
                AI Agents at Home
                <span className="block text-lg font-normal text-[var(--text-secondary)] mt-2">
                  Transform your daily routines with personal AI agents
                </span>
              </h1>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--text-muted)]">Your Progress</span>
                  <span className="text-[var(--accent-cyan)]">{completedLessons.length} of {lessons.length} lessons</span>
                </div>
                <div className="w-full bg-[var(--bg-card)] rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] h-2 rounded-full transition-all duration-300"
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
                            ? 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]'
                            : isCompleted
                            ? 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30 text-[var(--accent-green)]'
                            : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--accent-cyan)]/40 hover:text-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isCurrent
                              ? 'bg-[var(--accent-cyan)] text-white'
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
                                  : 'text-amber-400'
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
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-blue-500 flex items-center justify-center text-white">
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
                          : 'text-amber-400'
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
                            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors"
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
                              : 'btn-primary'
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
                            className="flex items-center gap-2 text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors"
                          >
                            Next Lesson
                            <ArrowRight size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {currentLesson === lessons.length && (
                      <div className="mt-8 text-center">
                        <div className="bg-gradient-to-r from-[var(--accent-cyan)]/10 to-[var(--accent-purple)]/10 border border-[var(--accent-cyan)]/30 rounded-xl p-6">
                          <h3 className="text-xl font-bold text-white mb-2">🎉 Course Complete!</h3>
                          <p className="text-[var(--text-secondary)] mb-4">
                            You've mastered AI agents for personal use. Ready to scale up to business?
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link href="/learn/business" className="btn btn-primary">
                              Start Business Course
                            </Link>
                            <Link href="/learn/playground" className="btn border border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[var(--accent-green)] hover:text-white">
                              Try the Playground
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
              Ready to Find Agents to Do This for You?
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Now that you know how AI agents work, discover pre-built agents in our marketplace 
              that can handle these tasks automatically.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/agents" className="btn btn-primary">
                Browse Agent Marketplace
              </Link>
              <Link 
                href="/learn/business" 
                className="btn border border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white"
              >
                Learn Business Agents
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}