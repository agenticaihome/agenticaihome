'use client';

import { useState } from 'react';
import { CheckCircle, Copy, ArrowLeft, ArrowRight, GamepadIcon, Brain, Calculator, User, Zap, Target, Sparkles, Timer, TrendingUp } from 'lucide-react';
import Link from 'next/link';

// Agent Triage Challenge Component
const AgentTriageChallenge = () => {
  const [currentTask, setCurrentTask] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  const tasks = [
    {
      task: "Customer complaining about delayed shipment on social media",
      options: ["Marketing Agent", "Customer Service Agent", "Operations Agent", "Finance Agent"],
      correct: "Customer Service Agent",
      explanation: "Customer service handles complaints and needs to respond quickly to protect brand reputation."
    },
    {
      task: "Need to create next month's social media content calendar",
      options: ["HR Agent", "Marketing Agent", "Finance Agent", "Operations Agent"],
      correct: "Marketing Agent",
      explanation: "Marketing agents handle content creation, social media planning, and brand messaging."
    },
    {
      task: "Candidate applications piling up for open position",
      options: ["HR Agent", "Customer Service Agent", "Marketing Agent", "Operations Agent"],
      correct: "HR Agent",
      explanation: "HR agents handle recruitment, screening applications, and managing the hiring process."
    },
    {
      task: "Monthly invoices need to be sent out",
      options: ["Finance Agent", "HR Agent", "Marketing Agent", "Customer Service Agent"],
      correct: "Finance Agent",
      explanation: "Finance agents handle invoicing, payments, and financial operations."
    },
    {
      task: "Process documentation is outdated and causing errors",
      options: ["Operations Agent", "HR Agent", "Marketing Agent", "Finance Agent"],
      correct: "Operations Agent",
      explanation: "Operations agents optimize processes, create SOPs, and improve workflows."
    }
  ];

  const handleAnswer = (agent: string) => {
    setSelectedAgent(agent);
    setShowResult(true);
    
    if (agent === tasks[currentTask].correct) {
      setScore(score + 1);
    }
    
    setTimeout(() => {
      if (currentTask < tasks.length - 1) {
        setCurrentTask(currentTask + 1);
        setSelectedAgent('');
        setShowResult(false);
      } else {
        setGameComplete(true);
      }
    }, 2000);
  };

  const resetGame = () => {
    setCurrentTask(0);
    setScore(0);
    setSelectedAgent('');
    setShowResult(false);
    setGameComplete(false);
  };

  if (gameComplete) {
    const percentage = (score / tasks.length) * 100;
    return (
      <div className="text-center">
        <div className="bg-gradient-to-r from-green-900/30 to-teal-900/30 rounded-xl p-6 border border-green-500/30 mb-6">
          <Sparkles className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Challenge Complete!</h3>
          <div className="text-3xl font-bold text-green-400 mb-2">{score}/{tasks.length}</div>
          <p className="text-slate-300 mb-4">
            {percentage >= 80 ? "🎉 Excellent! You understand AI agent specialization." :
             percentage >= 60 ? "👍 Good job! You're getting the hang of this." :
             "🤔 Keep learning! Each agent has specific strengths."}
          </p>
          <p className="text-slate-400 text-sm">
            {percentage >= 80 ? "You're ready to build your own agent team!" :
             "Try the courses above to learn more about each agent type."}
          </p>
        </div>
        <button 
          onClick={resetGame}
          className="btn bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 text-white"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[var(--text-muted)]">Challenge {currentTask + 1} of {tasks.length}</span>
        <span className="text-sm text-[var(--accent-green)]">Score: {score}/{currentTask + 1}</span>
      </div>
      
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
        <div className="text-center mb-6">
          <Target className="w-8 h-8 text-[var(--accent-green)] mx-auto mb-3" />
          <h4 className="text-lg font-bold text-white mb-2">Situation</h4>
          <p className="text-[var(--text-secondary)]">{tasks[currentTask].task}</p>
        </div>

        <div className="space-y-3">
          <p className="text-white font-medium text-center mb-4">Which agent should handle this?</p>
          {tasks[currentTask].options.map((agent) => (
            <button
              key={agent}
              onClick={() => handleAnswer(agent)}
              disabled={showResult}
              className={`w-full p-4 rounded-lg border text-left transition-all ${
                showResult 
                  ? agent === tasks[currentTask].correct
                    ? 'bg-green-900/30 border-green-500/50 text-green-400'
                    : agent === selectedAgent
                    ? 'bg-red-900/30 border-red-500/50 text-red-400'
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)]'
                  : 'bg-[var(--bg-card)] border-[var(--border-color)] text-white hover:border-[var(--accent-green)]/40 hover:bg-[var(--accent-green)]/5'
              }`}
            >
              {agent}
              {showResult && agent === tasks[currentTask].correct && (
                <CheckCircle className="inline-block ml-2 w-4 h-4" />
              )}
            </button>
          ))}
        </div>

        {showResult && (
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-slate-300 text-sm">
              <strong className="text-white">Explanation:</strong> {tasks[currentTask].explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Prompt Builder Component
const PromptBuilder = () => {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<{[key: string]: string}>({});
  const [finalPrompt, setFinalPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const steps = [
    {
      title: "Choose Your Use Case",
      key: "useCase",
      options: [
        { value: "morning-briefing", label: "Morning Briefing", desc: "Daily weather, schedule, and priorities" },
        { value: "email-triage", label: "Email Management", desc: "Sort and prioritize inbox" },
        { value: "meal-planning", label: "Meal Planning", desc: "Weekly menus and shopping lists" },
        { value: "customer-support", label: "Customer Support", desc: "Handle inquiries and complaints" }
      ]
    },
    {
      title: "Set Your Tone",
      key: "tone",
      options: [
        { value: "professional", label: "Professional", desc: "Formal, business-appropriate" },
        { value: "friendly", label: "Friendly", desc: "Warm and approachable" },
        { value: "casual", label: "Casual", desc: "Relaxed and conversational" },
        { value: "direct", label: "Direct", desc: "Brief and to-the-point" }
      ]
    },
    {
      title: "Choose Response Length",
      key: "length",
      options: [
        { value: "brief", label: "Brief", desc: "1-2 sentences max" },
        { value: "moderate", label: "Moderate", desc: "3-5 sentences" },
        { value: "detailed", label: "Detailed", desc: "Full explanations" },
        { value: "bullet", label: "Bullet Points", desc: "Easy-to-scan lists" }
      ]
    }
  ];

  const generatePrompt = () => {
    const templates = {
      "morning-briefing": {
        professional: "You are my Executive Assistant. Provide a concise morning briefing including weather, calendar highlights, and top priorities. Keep responses under 150 words in a professional format.",
        friendly: "You're my helpful Morning Agent! Give me a warm daily briefing with weather, my schedule, and what I should focus on today. Make it encouraging and under 120 words.",
        casual: "Hey! You're my morning buddy. Tell me what's up with the weather, what's on my calendar, and what I should tackle today. Keep it chill and brief.",
        direct: "Morning briefing agent. Weather, schedule, priorities. Under 100 words. Facts only."
      },
      "email-triage": {
        professional: "You are my Email Management Assistant. Review my emails and categorize by urgency (Urgent/Today/Later/Archive). Provide brief summaries and suggested actions for each.",
        friendly: "Help me tackle my inbox! Sort my emails by what needs attention now vs. later, and give me friendly advice on how to handle each one.",
        casual: "You're my email helper. Look at these emails and tell me which ones need my attention today and which can wait. Keep it simple.",
        direct: "Email triage agent. Sort by priority: Urgent/Today/Later/Delete. One sentence summary per email. Action required: Yes/No."
      },
      "meal-planning": {
        professional: "You are my Meal Planning Coordinator. Create weekly dinner menus with shopping lists, considering dietary requirements and budget constraints. Organize by meal and grocery categories.",
        friendly: "You're my kitchen helper! Plan out easy weeknight dinners for my family, make a shopping list, and help me stay within budget. Make it fun and doable.",
        casual: "Help me figure out what to eat this week! I need simple dinner ideas and a grocery list. Nothing too fancy, just real food for busy nights.",
        direct: "Meal planner. 5 dinners. Shopping list. Under budget. Simple recipes. 30 minutes max cook time."
      },
      "customer-support": {
        professional: "You are our Customer Service Representative. Address customer inquiries promptly and professionally. Acknowledge concerns, provide solutions, and escalate complex issues appropriately.",
        friendly: "You're our customer care agent! Help customers with a warm, helpful attitude. Listen to their concerns, offer solutions, and make sure they feel heard and valued.",
        casual: "You handle customer questions and problems. Be helpful and understanding, fix what you can, and get help when needed. Keep it real and helpful.",
        direct: "Customer support agent. Acknowledge issue. Provide solution or escalation path. Professional tone. Quick response required."
      }
    };

    const basePrompt = templates[selections.useCase as keyof typeof templates]?.[selections.tone as keyof typeof templates["morning-briefing"]] || "";
    
    const lengthModifiers = {
      brief: " Keep all responses under 50 words.",
      moderate: " Aim for 100-150 words per response.",
      detailed: " Provide comprehensive explanations when helpful.",
      bullet: " Use bullet points and numbered lists for clarity."
    };

    const prompt = basePrompt + lengthModifiers[selections.length as keyof typeof lengthModifiers];
    setFinalPrompt(prompt);
  };

  const handleSelection = (value: string) => {
    const newSelections = { ...selections, [steps[step].key]: value };
    setSelections(newSelections);
    
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Generate prompt on final step
      setTimeout(() => {
        generatePrompt();
      }, 100);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setStep(0);
    setSelections({});
    setFinalPrompt('');
    setCopied(false);
  };

  if (finalPrompt) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <Sparkles className="w-8 h-8 text-[var(--accent-purple)] mx-auto mb-3" />
          <h4 className="text-lg font-bold text-white mb-2">Your Custom Prompt</h4>
          <p className="text-[var(--text-secondary)]">Ready to copy and use!</p>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
            <span className="text-sm font-medium text-slate-300">📋 Generated Prompt</span>
            <button
              onClick={copyPrompt}
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
            <pre className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
              {finalPrompt}
            </pre>
          </div>
        </div>

        <div className="text-center">
          <button 
            onClick={reset}
            className="btn border border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white"
          >
            Build Another Prompt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                index <= step 
                  ? 'bg-[var(--accent-purple)] text-white' 
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)]'
              }`}
            >
              {index + 1}
            </div>
          ))}
        </div>
        <h4 className="text-lg font-bold text-white mb-2">{steps[step].title}</h4>
      </div>

      <div className="grid gap-4">
        {steps[step].options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelection(option.value)}
            className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-purple)]/40 hover:bg-[var(--accent-purple)]/5 transition-all text-left"
          >
            <div className="font-medium text-white mb-1">{option.label}</div>
            <div className="text-sm text-[var(--text-muted)]">{option.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Cost Calculator Component
const CostCalculator = () => {
  const [tasks, setTasks] = useState([
    { name: 'Email management', hoursPerWeek: 0, hourlyRate: 25 },
    { name: 'Social media posting', hoursPerWeek: 0, hourlyRate: 20 },
    { name: 'Customer inquiries', hoursPerWeek: 0, hourlyRate: 18 },
    { name: 'Scheduling/calendar', hoursPerWeek: 0, hourlyRate: 15 },
    { name: 'Data entry/reporting', hoursPerWeek: 0, hourlyRate: 15 }
  ]);
  const [showResults, setShowResults] = useState(false);

  const updateTask = (index: number, hours: number) => {
    const newTasks = [...tasks];
    newTasks[index].hoursPerWeek = hours;
    setTasks(newTasks);
    
    // Show results if any hours are entered
    const hasHours = newTasks.some(task => task.hoursPerWeek > 0);
    setShowResults(hasHours);
  };

  const totalWeeklyHours = tasks.reduce((sum, task) => sum + task.hoursPerWeek, 0);
  const totalWeeklyCost = tasks.reduce((sum, task) => sum + (task.hoursPerWeek * task.hourlyRate), 0);
  const yearlyHourlySavings = totalWeeklyHours * 52;
  const yearlyCostSavings = totalWeeklyCost * 52;
  const aiCost = 240; // Approximate yearly cost for ChatGPT Plus + some automation tools
  const netSavings = yearlyCostSavings - aiCost;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Calculator className="w-8 h-8 text-[var(--accent-cyan)] mx-auto mb-3" />
        <h4 className="text-lg font-bold text-white mb-2">How Much Time & Money Can You Save?</h4>
        <p className="text-[var(--text-secondary)]">Enter hours you spend weekly on these tasks</p>
      </div>

      <div className="space-y-4">
        {tasks.map((task, index) => (
          <div key={index} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium text-white">{task.name}</div>
                <div className="text-sm text-[var(--text-muted)]">${task.hourlyRate}/hour value</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="40"
                  step="0.5"
                  value={task.hoursPerWeek || ''}
                  onChange={(e) => updateTask(index, parseFloat(e.target.value) || 0)}
                  className="w-20 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-white text-center"
                  placeholder="0"
                />
                <span className="text-[var(--text-muted)] text-sm">hrs/week</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showResults && (
        <div className="mt-8 space-y-4">
          <div className="bg-gradient-to-r from-[var(--accent-cyan)]/10 to-blue-500/10 border border-[var(--accent-cyan)]/30 rounded-xl p-6">
            <h4 className="font-bold text-white mb-4 text-center">Your Potential Savings</h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--accent-cyan)] mb-1">
                  {yearlyHourlySavings.toFixed(0)}
                </div>
                <div className="text-sm text-[var(--text-muted)]">hours per year</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  That's {(yearlyHourlySavings / 40).toFixed(1)} work weeks!
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">
                  ${netSavings.toLocaleString()}
                </div>
                <div className="text-sm text-[var(--text-muted)]">net savings per year</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  After AI tool costs (~$240/year)
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
              <div className="text-center text-sm text-[var(--text-secondary)]">
                💡 <strong>ROI: {netSavings > 0 ? ((netSavings / aiCost) * 100).toFixed(0) : 0}%</strong> return on AI investment
              </div>
            </div>
          </div>

          {netSavings > 5000 && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center">
              <Sparkles className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-medium text-sm">
                🎉 Excellent ROI! You should definitely invest in AI agents.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Agent Personality Quiz Component
const AgentPersonalityQuiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{[key: string]: number}>({});
  const [result, setResult] = useState('');

  const questions = [
    {
      question: "How do you prefer to start your day?",
      options: [
        { text: "Structured routine with clear priorities", weights: { chief: 3, operations: 2 } },
        { text: "Creative brainstorming and planning", weights: { marketing: 3, hr: 1 } },
        { text: "Checking in with team and customers", weights: { customer: 3, hr: 2 } },
        { text: "Reviewing numbers and performance", weights: { finance: 3, operations: 1 } }
      ]
    },
    {
      question: "What's your biggest business strength?",
      options: [
        { text: "Strategic thinking and planning", weights: { chief: 3, operations: 1 } },
        { text: "Building relationships and networks", weights: { marketing: 2, customer: 2, hr: 2 } },
        { text: "Problem-solving and optimization", weights: { operations: 3, finance: 1 } },
        { text: "Communication and persuasion", weights: { marketing: 3, customer: 1 } }
      ]
    },
    {
      question: "How do you handle stress?",
      options: [
        { text: "Create systems and processes", weights: { operations: 3, chief: 1 } },
        { text: "Focus on people and relationships", weights: { hr: 3, customer: 2 } },
        { text: "Analyze data to find solutions", weights: { finance: 3, operations: 1 } },
        { text: "Get creative and try new approaches", weights: { marketing: 3, hr: 1 } }
      ]
    },
    {
      question: "What motivates you most?",
      options: [
        { text: "Achieving ambitious goals", weights: { chief: 3, marketing: 1 } },
        { text: "Helping others succeed", weights: { hr: 3, customer: 2 } },
        { text: "Creating efficient systems", weights: { operations: 3, finance: 1 } },
        { text: "Growing and learning", weights: { marketing: 2, hr: 1, chief: 1 } }
      ]
    },
    {
      question: "In a team meeting, you usually:",
      options: [
        { text: "Lead the discussion and set agenda", weights: { chief: 3, operations: 1 } },
        { text: "Share creative ideas and possibilities", weights: { marketing: 3, hr: 1 } },
        { text: "Ask practical questions about implementation", weights: { operations: 3, finance: 2 } },
        { text: "Make sure everyone's voice is heard", weights: { hr: 3, customer: 2 } }
      ]
    }
  ];

  const agentTypes = {
    chief: {
      title: "Chief of Staff Agent",
      description: "You're a natural coordinator and strategic thinker. A Chief of Staff agent would help you manage priorities, coordinate activities, and stay on top of the big picture.",
      traits: ["Strategic thinking", "Coordination", "Priority management", "Executive support"],
      color: "from-teal-500 to-cyan-500"
    },
    marketing: {
      title: "Marketing Agent",
      description: "You're creative and relationship-focused. A Marketing agent would help you create content, manage social media, and build your brand presence.",
      traits: ["Creative thinking", "Brand building", "Content creation", "Relationship focus"],
      color: "from-purple-500 to-pink-500"
    },
    operations: {
      title: "Operations Agent",
      description: "You love efficiency and optimization. An Operations agent would help you streamline processes, create systems, and improve workflows.",
      traits: ["Process optimization", "System thinking", "Efficiency focus", "Problem solving"],
      color: "from-green-500 to-emerald-500"
    },
    customer: {
      title: "Customer Service Agent",
      description: "You're people-focused and helpful. A Customer Service agent would help you provide amazing support and build strong customer relationships.",
      traits: ["People focus", "Helpfulness", "Communication", "Relationship building"],
      color: "from-blue-500 to-indigo-500"
    },
    finance: {
      title: "Finance Agent",
      description: "You're analytical and detail-oriented. A Finance agent would help you track money, optimize costs, and make data-driven decisions.",
      traits: ["Analytical thinking", "Detail oriented", "Data driven", "Cost optimization"],
      color: "from-amber-500 to-orange-500"
    },
    hr: {
      title: "HR Agent",
      description: "You care about people and culture. An HR agent would help you build great teams, improve communication, and create a positive workplace.",
      traits: ["People development", "Team building", "Communication", "Culture focus"],
      color: "from-rose-500 to-red-500"
    }
  };

  const handleAnswer = (optionIndex: number) => {
    const option = questions[currentQuestion].options[optionIndex];
    const newAnswers = { ...answers };
    
    Object.entries(option.weights).forEach(([agent, weight]) => {
      newAnswers[agent] = (newAnswers[agent] || 0) + weight;
    });
    
    setAnswers(newAnswers);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate result
      const topAgent = Object.entries(newAnswers).reduce((a, b) => 
        newAnswers[a[0]] > newAnswers[b[0]] ? a : b
      )[0];
      setResult(topAgent);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setResult('');
  };

  if (result) {
    const agentInfo = agentTypes[result as keyof typeof agentTypes];
    return (
      <div className="text-center space-y-6">
        <div className={`bg-gradient-to-r ${agentInfo.color} p-1 rounded-xl mx-auto w-fit`}>
          <div className="bg-[var(--bg-primary)] rounded-lg p-6">
            <User className="w-12 h-12 text-white mx-auto mb-4" />
            <h4 className="text-xl font-bold text-white mb-2">You are a...</h4>
            <div className={`text-2xl font-bold bg-gradient-to-r ${agentInfo.color} bg-clip-text text-transparent mb-4`}>
              {agentInfo.title}
            </div>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              {agentInfo.description}
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-6 max-w-sm mx-auto">
              {agentInfo.traits.map((trait, index) => (
                <div key={index} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3">
                  <div className="text-xs text-[var(--text-muted)]">{trait}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={resetQuiz}
            className="btn border border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white mx-auto"
          >
            Take Quiz Again
          </button>
          <Link 
            href="/learn/business" 
            className="btn bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80 text-white mx-auto"
          >
            Learn to Build This Agent
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index <= currentQuestion 
                  ? 'bg-[var(--accent-purple)]' 
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
              }`}
            />
          ))}
        </div>
        <h4 className="text-lg font-bold text-white mb-2">Question {currentQuestion + 1}</h4>
        <p className="text-[var(--text-secondary)]">{questions[currentQuestion].question}</p>
      </div>

      <div className="space-y-3">
        {questions[currentQuestion].options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            className="w-full p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-purple)]/40 hover:bg-[var(--accent-purple)]/5 transition-all text-left"
          >
            <div className="text-white">{option.text}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Main playground activities
const activities = [
  {
    id: 'triage',
    title: 'Agent Triage Challenge',
    description: 'Test your skills at matching business scenarios to the right AI agent.',
    difficulty: 'Beginner',
    time: '5 min',
    icon: Target,
    component: AgentTriageChallenge
  },
  {
    id: 'prompt-builder', 
    title: 'Prompt Builder',
    description: 'Build custom AI agent prompts step-by-step with our interactive tool.',
    difficulty: 'Beginner',
    time: '3 min',
    icon: Brain,
    component: PromptBuilder
  },
  {
    id: 'cost-calculator',
    title: 'Agent Cost Calculator', 
    description: 'Calculate how much time and money you could save with AI agents.',
    difficulty: 'Beginner',
    time: '5 min',
    icon: Calculator,
    component: CostCalculator
  },
  {
    id: 'personality-quiz',
    title: 'Which Agent Are You?',
    description: 'Take our personality quiz to discover which AI agent matches your work style.',
    difficulty: 'Beginner', 
    time: '3 min',
    icon: User,
    component: AgentPersonalityQuiz
  }
];

export default function LearnPlaygroundPage() {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  const currentActivity = activities.find(a => a.id === selectedActivity);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <section className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/30">
        <div className="container container-2xl section-padding">
          <div className="max-w-4xl mx-auto">
            <Link 
              href="/learn" 
              className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors mb-6"
            >
              <ArrowLeft size={16} />
              <span>Back to Learning Hub</span>
            </Link>
            
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
                Agent Playground
                <span className="block text-lg font-normal text-[var(--text-secondary)] mt-2">
                  Interactive tools and challenges to master AI agent concepts
                </span>
              </h1>
            </div>
          </div>
        </div>
      </section>

      <div className="container container-2xl section-padding">
        <div className="max-w-4xl mx-auto">
          {!selectedActivity ? (
            /* Activity Selection */
            <div className="space-y-8">
              <div className="text-center">
                <GamepadIcon className="w-12 h-12 text-[var(--accent-green)] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-3">Choose Your Challenge</h2>
                <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
                  Practice your AI agent skills with these interactive tools. No signup required — just learn and have fun!
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity.id)}
                    className="group bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 hover:border-[var(--accent-green)]/40 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-green)] to-emerald-500 flex items-center justify-center text-white flex-shrink-0">
                        <activity.icon size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[var(--accent-green)] transition-colors">
                          {activity.title}
                        </h3>
                        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                          {activity.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <Timer size={12} />
                          {activity.time}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          activity.difficulty === 'Beginner' 
                            ? 'bg-green-400/20 text-green-400' 
                            : 'bg-amber-400/20 text-amber-400'
                        }`}>
                          {activity.difficulty}
                        </span>
                      </div>
                      <ArrowRight size={16} className="text-[var(--accent-green)] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center pt-8">
                <div className="bg-gradient-to-r from-[var(--accent-green)]/10 to-emerald-500/10 border border-[var(--accent-green)]/30 rounded-xl p-6 max-w-2xl mx-auto">
                  <Sparkles className="w-8 h-8 text-[var(--accent-green)] mx-auto mb-3" />
                  <h3 className="font-bold text-white mb-2">Ready to Build Real Agents?</h3>
                  <p className="text-[var(--text-secondary)] mb-4">
                    These tools are great for learning, but our marketplace has professional agents 
                    ready to automate your actual work.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/agents" className="btn bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 text-white">
                      Browse Agent Marketplace
                    </Link>
                    <Link href="/learn/business" className="btn border border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white">
                      Learn Business Agents
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Selected Activity */
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Activities</span>
                </button>
                
                {currentActivity && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-green)] to-emerald-500 flex items-center justify-center text-white">
                      <currentActivity.icon size={16} />
                    </div>
                    <div>
                      <h2 className="font-bold text-white">{currentActivity.title}</h2>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span>{currentActivity.time}</span>
                        <span>•</span>
                        <span>{currentActivity.difficulty}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="max-w-2xl mx-auto">
                {currentActivity && <currentActivity.component />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}