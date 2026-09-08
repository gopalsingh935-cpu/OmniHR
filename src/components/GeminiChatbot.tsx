import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  Sparkles,
  ShieldAlert,
  Zap,
  TrendingUp,
  Award,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sliders,
  Maximize2,
  Minimize2,
  Trash2,
  Settings2,
  User,
  Info,
  HelpCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { ChatMessage, ChatbotPersona, GeminiModelId } from '../types';

export const CHATBOT_PERSONAS: ChatbotPersona[] = [
  {
    id: 'hr_general',
    name: 'OmniHR Assistant',
    title: 'Everyday Operations & Virtual HR',
    description: 'Friendly generalist assistant for leave policies, directory lookup, workflow guides, and payroll FAQs.',
    recommendedModel: 'gemini-3.8-flash',
    taskComplexity: 'general',
    badge: 'General Tasks',
    systemInstruction: `You are the OmniHR Virtual Assistant, a friendly, professional, and knowledgeable HR specialist.
You assist employees, managers, and HR administrators with everyday enterprise inquiries: leave policies (EL, CL, SL, PL), leave balances, performance review cycles, team directory lookups, payroll document verification, and cloud file management.
Keep explanations clear, supportive, and actionable with markdown formatting and bullet points.`,
    starterPrompts: [
      'How do I apply for Casual Leave (CL) vs Sick Leave (SL)?',
      'Explain how the 5-point performance rating scale works.',
      'What are the steps to access encrypted pay slips in the AES-256 Vault?',
      'Who are the designated department leads in our directory?',
    ],
  },
  {
    id: 'compliance_officer',
    name: 'Compliance & Labor Advisor',
    title: 'Labor Standards & Statutory Compliance',
    description: 'Specialized in statutory leave compliance, regulatory audits, SOC-2 standards, and enterprise labor policies.',
    recommendedModel: 'gemini-3.1-pro-preview',
    taskComplexity: 'complex',
    badge: 'Complex Tasks',
    systemInstruction: `You are the OmniHR Enterprise Compliance & Labor Policy Advisor.
You specialize in statutory leave regulations (Earned Leave EL, Casual Leave CL, Sick Leave SL, Privilege/Parental Leave PL), audit trails, anti-discrimination guidelines, labor laws, and disciplinary procedures.
Provide rigorous, structured, professional guidance with precise policy clauses and step-by-step compliance checklists.`,
    starterPrompts: [
      'What are the legal compliance requirements for Earned Leave (EL) encashment?',
      'Draft a standard protocol for handling an unannounced extended absence.',
      'How does our tamper-evident SHA-256 audit log satisfy SOC-2 Type II audits?',
      'What are the statutory guidelines for parental leave and job protection?',
    ],
  },
  {
    id: 'fast_responder',
    name: 'Instant HR Fast-Responder',
    title: 'High-Speed Summaries & Checklists',
    description: 'Optimized for quick lookups, summary answers, leave quota definitions, and snappy checklist responses.',
    recommendedModel: 'gemini-3.1-flash-lite',
    taskComplexity: 'fast',
    badge: 'Fast Tasks',
    systemInstruction: `You are the OmniHR Quick-Response Assistant.
Your goal is maximum speed, clarity, and brevity. Provide concise bulleted answers, quick status summaries, policy thresholds, and direct links to application workspaces without fluff. Use bolding and concise bullets.`,
    starterPrompts: [
      'Summarize annual leave allowances in 3 bullets.',
      'Quick checklist for approving a pending leave request.',
      'What is the notice period for leave over 3 days?',
      'How many days of medical absence require a doctor certificate?',
    ],
  },
  {
    id: 'workforce_strategist',
    name: 'Predictive Workforce Strategist',
    title: 'Capacity Planning & Staffing Resilience',
    description: 'Deep reasoning on staffing bottlenecks, single-point dependencies, sprint handoffs, and shortage mitigation.',
    recommendedModel: 'gemini-3.1-pro-preview',
    taskComplexity: 'complex',
    badge: 'Complex Tasks',
    systemInstruction: `You are the OmniHR Predictive Workforce Strategist.
You analyze organizational depth, capacity metrics, single-point-of-failure dependencies, sprint handover protocols, and staffing shortage mitigation plans.
Help managers make data-driven scheduling and cross-training decisions.`,
    starterPrompts: [
      'How should we handle overlapping leaves in Engineering during late September?',
      'What mitigation actions should we take for solo leadership dependencies?',
      'Recommend a cross-training matrix to prevent single points of failure.',
      'How can we maintain 75% departmental capacity during holiday peaks?',
    ],
  },
  {
    id: 'performance_coach',
    name: 'Performance & 1-on-1 Coach',
    title: 'Reviews, SMART Goals & Growth',
    description: 'Assists managers and employees in formulating constructive feedback, OKRs, and meaningful 1-on-1 review discussions.',
    recommendedModel: 'gemini-3.5-flash',
    taskComplexity: 'general',
    badge: 'General Tasks',
    systemInstruction: `You are the OmniHR Performance & 1-on-1 Review Coach.
You assist managers and employees in formulating SMART goals, writing constructive and empathetic 360 review feedback, calibrating ratings, and establishing actionable growth plans.`,
    starterPrompts: [
      'Help me draft constructive feedback for an engineer who needs earlier cross-team communication.',
      'Generate 3 SMART goals for a Senior Frontend Engineer for Q4.',
      'How to conduct an empathetic 1-on-1 performance calibration meeting?',
      'What are key differences between "Meets Expectations" and "Exceeds Expectations"?',
    ],
  },
];

interface GeminiChatbotProps {
  isModal?: boolean;
  onCloseModal?: () => void;
  initialRole?: string;
  onNavigateTab?: (tab: string) => void;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  isModal = false,
  onCloseModal,
  initialRole = 'hr_general',
  onNavigateTab,
}) => {
  const { currentUser } = useAuth();
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(initialRole);
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>('gemini-3.8-flash');
  const [autoModelRouting, setAutoModelRouting] = useState<boolean>(true);
  const [customSystemInstruction, setCustomSystemInstruction] = useState<string>('');
  const [isSystemInstructionOpen, setIsSystemInstructionOpen] = useState<boolean>(false);
  const [includeContext, setIncludeContext] = useState<boolean>(true);

  // Active persona
  const activePersona =
    CHATBOT_PERSONAS.find((p) => p.id === selectedPersonaId) || CHATBOT_PERSONAS[0];

  // Conversation history
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      role: 'model',
      text: `Hello ${currentUser.name}! I'm your **${activePersona.name}** powered by Google Gemini.

I'm configured with a specialized system role for **${activePersona.title}**. Ask me anything about HR policies, leave entitlements (EL/CL/SL/PL), performance feedback, staffing predictions, or workplace compliance!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: activePersona.recommendedModel,
      roleId: activePersona.id,
      status: 'complete',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync recommended model when persona changes if auto routing is enabled
  useEffect(() => {
    if (autoModelRouting) {
      setSelectedModel(activePersona.recommendedModel);
    }
  }, [activePersona, autoModelRouting]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputPrompt]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    const welcomeMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'model',
      text: `Conversation cleared. I am ready to assist as your **${activePersona.name}** (${activePersona.badge}). How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: selectedModel,
      roleId: activePersona.id,
      status: 'complete',
    };
    setMessages([welcomeMsg]);
    setErrorBanner(null);
  };

  const handlePersonaChange = (newPersonaId: string) => {
    setSelectedPersonaId(newPersonaId);
    const newPersona = CHATBOT_PERSONAS.find((p) => p.id === newPersonaId) || CHATBOT_PERSONAS[0];
    if (autoModelRouting) {
      setSelectedModel(newPersona.recommendedModel);
    }
    setCustomSystemInstruction('');

    // Append a context switch notification in chat
    const switchMsg: ChatMessage = {
      id: `switch-${Date.now()}`,
      role: 'model',
      text: `🔄 Switched role to **${newPersona.name}** (*${newPersona.title}*).\n\nConfigured model: \`${autoModelRouting ? newPersona.recommendedModel : selectedModel}\` (${newPersona.badge}). Ready for your questions!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: autoModelRouting ? newPersona.recommendedModel : selectedModel,
      roleId: newPersona.id,
      status: 'complete',
    };
    setMessages((prev) => [...prev, switchMsg]);
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    setErrorBanner(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'complete',
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputPrompt('');
    setIsLoading(true);

    // Build context summary if enabled
    const pendingLeaves = storageService.getLeaves().filter((l) => l.status === 'pending');
    const contextSummary = includeContext
      ? {
          currentUserName: currentUser.name,
          currentUserRole: currentUser.role,
          currentUserDepartment: currentUser.department,
          currentUserDesignation: currentUser.designation,
          pendingLeavesCount: pendingLeaves.length,
          leaveBalance: currentUser.leaveBalance,
        }
      : {};

    try {
      const payload = {
        messages: updatedMessages.map((m) => ({
          role: m.role,
          text: m.text,
        })),
        roleId: activePersona.id,
        systemInstruction: customSystemInstruction || activePersona.systemInstruction,
        model: selectedModel,
        contextSummary,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate response');
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || selectedModel,
        roleId: activePersona.id,
        status: 'complete',
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorBanner(err.message || 'Error contacting Gemini API.');

      // Fallback friendly message
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ I encountered an issue connecting to the AI model.
Please check your connection or switch to \`gemini-3.8-flash\` or \`gemini-3.1-flash-lite\`.

*Error details: ${err.message || 'Network timeout'}*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
        roleId: activePersona.id,
        status: 'error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={`flex flex-col bg-white dark:bg-slate-900 ${
        isModal
          ? 'h-[85vh] max-h-[820px] w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden'
          : 'h-[calc(100vh-8.5rem)] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                OmniHR Gemini Assistant
              </h2>
              <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <Sparkles className="h-3 w-3" /> Multi-Turn
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Role: <span className="font-semibold text-slate-700 dark:text-slate-200">{activePersona.name}</span> • Model: <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">{selectedModel}</span>
            </p>
          </div>
        </div>

        {/* Header Controls & Actions */}
        <div className="flex items-center gap-2">
          {/* System Instruction Drawer Toggle */}
          <button
            onClick={() => setIsSystemInstructionOpen(!isSystemInstructionOpen)}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all ${
              isSystemInstructionOpen
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-200'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
            title="Inspect or customize the active Gemini System Instruction"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Role System Instruction</span>
            {isSystemInstructionOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Clear Chat Button */}
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            title="Reset conversation thread"
          >
            <Trash2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Close button if in modal mode */}
          {isModal && onCloseModal && (
            <button
              onClick={onCloseModal}
              className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Role Selection & Model Bar */}
      <div className="border-b border-slate-200/80 bg-white px-4 py-2 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Persona Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Roles:
            </span>
            {CHATBOT_PERSONAS.map((persona) => {
              const isSelected = selectedPersonaId === persona.id;
              return (
                <button
                  key={persona.id}
                  onClick={() => handlePersonaChange(persona.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {persona.id === 'compliance_officer' && <ShieldAlert className="h-3 w-3" />}
                  {persona.id === 'fast_responder' && <Zap className="h-3 w-3" />}
                  {persona.id === 'workforce_strategist' && <TrendingUp className="h-3 w-3" />}
                  {persona.id === 'performance_coach' && <Award className="h-3 w-3" />}
                  {persona.id === 'hr_general' && <Bot className="h-3 w-3" />}
                  <span>{persona.name}</span>
                </button>
              );
            })}
          </div>

          {/* Model Selector & Auto Switch */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1 dark:border-slate-800 dark:bg-slate-800/60">
              <Cpu className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value as GeminiModelId);
                  setAutoModelRouting(false);
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden dark:text-slate-200"
              >
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (General Tasks)</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (General Tasks)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast Tasks)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Complex Tasks)</option>
              </select>
            </div>

            <button
              onClick={() => {
                setAutoModelRouting(!autoModelRouting);
                if (!autoModelRouting) {
                  setSelectedModel(activePersona.recommendedModel);
                }
              }}
              className={`flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold border transition-colors ${
                autoModelRouting
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}
              title="When enabled, the optimal Gemini model is automatically chosen according to task complexity"
            >
              <span>Auto-Route:</span>
              <span>{autoModelRouting ? 'ON' : 'MANUAL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable System Instruction Inspector/Editor */}
      {isSystemInstructionOpen && (
        <div className="border-b border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                Active System Instruction ({activePersona.name})
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                {activePersona.badge}
              </span>
            </div>
            {customSystemInstruction && (
              <button
                onClick={() => setCustomSystemInstruction('')}
                className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Reset to Default
              </button>
            )}
          </div>
          <textarea
            value={customSystemInstruction || activePersona.systemInstruction}
            onChange={(e) => setCustomSystemInstruction(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-indigo-200 bg-white p-2.5 font-mono text-xs text-slate-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-indigo-900 dark:bg-slate-900 dark:text-slate-200"
            placeholder="Edit system instructions for this role..."
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Directs model tone, constraints, and enterprise knowledge parameters.
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              Inject Active User & Company Context
            </label>
          </div>
        </div>
      )}

      {/* Error Alert Banner if any */}
      {errorBanner && (
        <div className="flex items-center justify-between bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 border-b border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-amber-700 hover:text-amber-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Scrollable Chat Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className="shrink-0">
                {isUser ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="h-8 w-8 rounded-xl object-cover ring-2 ring-indigo-500/30"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`flex max-w-[85%] sm:max-w-[75%] flex-col ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                {/* Meta header above bubble */}
                <div className="mb-1 flex items-center gap-2 px-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {isUser ? currentUser.name : activePersona.name}
                  </span>
                  {!isUser && msg.modelUsed && (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[9px] font-mono font-bold text-indigo-600 dark:bg-slate-800 dark:text-indigo-400">
                      {msg.modelUsed}
                    </span>
                  )}
                  <span>{msg.timestamp}</span>
                </div>

                {/* Bubble Body */}
                <div
                  className={`relative group rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-2xs transition-all ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : msg.status === 'error'
                      ? 'bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900 rounded-tl-none'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-100 dark:border-slate-700/80 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words leading-relaxed font-sans">
                    {msg.text}
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopyText(msg.text, msg.id)}
                    className={`absolute right-2 bottom-2 rounded-lg p-1 transition-opacity ${
                      isUser
                        ? 'text-indigo-200 hover:text-white hover:bg-indigo-700 opacity-0 group-hover:opacity-100'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100'
                    }`}
                    title="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing / Reasoning Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none border border-slate-200/80 bg-slate-50 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {activePersona.name}
                </span>{' '}
                is generating response with{' '}
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {selectedModel}
                </span>
                ...
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starter Prompts Drawer */}
      {messages.length <= 2 && !isLoading && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
            <span>Suggested Inquiries for {activePersona.name}:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activePersona.starterPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-slate-800/80 transition-all group"
              >
                <span className="line-clamp-1">{prompt}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Composer Form */}
      <div className="border-t border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activePersona.name} (${selectedModel})...`}
              rows={1}
              disabled={isLoading}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 p-3 pr-10 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            />
            <div className="absolute right-3 bottom-3 text-[10px] text-slate-400 font-medium hidden sm:block pointer-events-none">
              ⏎ to send
            </div>
          </div>

          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition-all ${
              !inputPrompt.trim() || isLoading
                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 active:scale-95'
            }`}
            title="Send Message"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>

        {/* Footer Notes */}
        <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span>Powered by Gemini 3.8 / 3.5 / 3.1</span>
            <span>•</span>
            <span>Context-aware HR Intelligence</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>AES-256 Vault Grounded</span>
          </div>
        </div>
      </div>
    </div>
  );
};
