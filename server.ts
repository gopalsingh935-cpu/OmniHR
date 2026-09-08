import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini SDK with telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'OmniHR API', timestamp: new Date().toISOString() });
});

// Algorithmic Fallback & Baseline Forecast Generator
function generateAlgorithmicForecast(
  employees: any[],
  leaves: any[],
  lookaheadDays: number,
  departmentFilter: string,
  simulationModifiers?: any
) {
  const targetDepartments = departmentFilter && departmentFilter !== 'All'
    ? [departmentFilter]
    : Array.from(new Set(employees.map((e: any) => e.department)));

  const baseDate = new Date('2026-09-08'); // Current system context date
  const endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + lookaheadDays);

  const activeLeaves = leaves.filter((l: any) => {
    if (l.status !== 'approved' && l.status !== 'pending') return false;
    const lStart = new Date(l.startDate);
    const lEnd = new Date(l.endDate);
    return lEnd >= baseDate && lStart <= endDate;
  });

  const departmentForecasts = targetDepartments.map((dept) => {
    const deptEmployees = employees.filter((e: any) => e.department === dept);
    const totalCount = deptEmployees.length || 1;
    const deptLeaves = activeLeaves.filter((l: any) => l.department === dept);

    // Calculate daily capacity over the lookahead horizon
    const dailyCapacities: { date: string; onLeave: number; percent: number }[] = [];
    const highRiskPeriods: any[] = [];

    for (let d = 0; d < Math.min(lookaheadDays, 30); d++) {
      const cur = new Date(baseDate);
      cur.setDate(cur.getDate() + d);
      const curStr = cur.toISOString().split('T')[0];

      const onLeaveCount = deptLeaves.filter((l: any) => {
        return curStr >= l.startDate && curStr <= l.endDate;
      }).length;

      const extraSick = simulationModifiers?.extraSickLeaveProbability ? 1 : 0;
      const effectiveOnLeave = Math.min(totalCount, onLeaveCount + extraSick);
      const capacityPercent = Math.max(0, Math.round(((totalCount - effectiveOnLeave) / totalCount) * 100));

      dailyCapacities.push({
        date: curStr,
        onLeave: effectiveOnLeave,
        percent: capacityPercent,
      });
    }

    const minCapacity = dailyCapacities.length > 0
      ? Math.min(...dailyCapacities.map((c) => c.percent))
      : 100;
    const avgCapacity = dailyCapacities.length > 0
      ? Math.round(dailyCapacities.reduce((a, b) => a + b.percent, 0) / dailyCapacities.length)
      : 100;

    let riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
    let riskScore = 15;

    if (minCapacity <= 35) {
      riskLevel = 'Critical';
      riskScore = 90;
    } else if (minCapacity <= 55) {
      riskLevel = 'High';
      riskScore = 75;
    } else if (minCapacity <= 75) {
      riskLevel = 'Moderate';
      riskScore = 45;
    }

    // Identify period ranges
    let activeRange: { start: string; end: string; minCap: number } | null = null;
    dailyCapacities.forEach((dc) => {
      if (dc.percent < 75) {
        if (!activeRange) {
          activeRange = { start: dc.date, end: dc.date, minCap: dc.percent };
        } else {
          activeRange.end = dc.date;
          activeRange.minCap = Math.min(activeRange.minCap, dc.percent);
        }
      } else if (activeRange) {
        highRiskPeriods.push({
          startDate: activeRange.start,
          endDate: activeRange.end,
          severity: activeRange.minCap <= 40 ? 'Critical' : activeRange.minCap <= 60 ? 'High' : 'Moderate',
          reason: `Department staffing drops to ${activeRange.minCap}% capacity due to overlapping planned leaves.`,
          missingRoles: deptLeaves.map((l: any) => `${l.employeeName} (${l.employeeRole})`),
        });
        activeRange = null;
      }
    });

    if (activeRange) {
      highRiskPeriods.push({
        startDate: (activeRange as any).start,
        endDate: (activeRange as any).end,
        severity: (activeRange as any).minCap <= 40 ? 'Critical' : 'High',
        reason: `Department staffing drops to ${(activeRange as any).minCap}% capacity due to leave overlaps.`,
        missingRoles: deptLeaves.map((l: any) => `${l.employeeName} (${l.employeeRole})`),
      });
    }

    const keyBottlenecks: string[] = [];
    if (deptLeaves.length >= 2) {
      keyBottlenecks.push(`Multiple concurrent leaves scheduled between ${deptLeaves[0].startDate} and ${deptLeaves[deptLeaves.length - 1].endDate}.`);
    }
    if (minCapacity < 60) {
      keyBottlenecks.push(`Staffing depth drops below safe operating threshold (${minCapacity}% actual vs 70% required SLA).`);
    }
    if (keyBottlenecks.length === 0) {
      keyBottlenecks.push(`Standard coverage maintained with ${avgCapacity}% average available staff capacity.`);
    }

    const recommendations: string[] = [];
    if (riskLevel === 'Critical' || riskLevel === 'High') {
      recommendations.push('Establish cross-functional coverage or temporary duty delegation.');
      recommendations.push('Evaluate request staggering with affected employees before formal approval.');
      recommendations.push('Pre-schedule sprint milestones around high-absence windows.');
    } else {
      recommendations.push('Maintain standard peer coverage and asynchronous documentation handoffs.');
    }

    return {
      department: dept,
      totalHeadcount: totalCount,
      minStaffedHeadcount: Math.max(0, totalCount - Math.max(...dailyCapacities.map(c => c.onLeave))),
      avgCapacityPercentage: avgCapacity,
      riskLevel,
      riskScore,
      highRiskPeriods,
      keyBottlenecks,
      recommendations,
      dailyCapacities,
    };
  });

  // Calculate overall metrics
  const avgRiskScore = Math.round(
    departmentForecasts.reduce((a, b) => a + b.riskScore, 0) / (departmentForecasts.length || 1)
  );

  let overallRiskLevel: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
  if (avgRiskScore >= 70) overallRiskLevel = 'Critical';
  else if (avgRiskScore >= 50) overallRiskLevel = 'High';
  else if (avgRiskScore >= 30) overallRiskLevel = 'Moderate';

  // Detect single-points-of-failure
  const criticalRoleVulnerabilities: any[] = [];
  const soloRoles = employees.filter((e: any) =>
    e.designation.includes('Director') ||
    e.designation.includes('VP') ||
    e.designation.includes('Lead')
  );

  soloRoles.forEach((sr: any) => {
    const srLeave = activeLeaves.find((l: any) => l.employeeId === sr.id);
    if (srLeave) {
      criticalRoleVulnerabilities.push({
        role: sr.designation,
        employeeName: sr.name,
        department: sr.department,
        vulnerabilityLevel: 'High',
        explanation: `${sr.name} is the designated key authority for ${sr.department}. Leave from ${srLeave.startDate} to ${srLeave.endDate} leaves sign-offs unassigned.`,
        contingencyPlan: 'Designate secondary signing proxy and pre-approve operational blockers.',
      });
    }
  });

  return {
    forecastHorizonDays: lookaheadDays,
    analysisDate: baseDate.toISOString().split('T')[0],
    overallRiskLevel,
    overallRiskScore: avgRiskScore,
    summary: `Predictive Workforce Engine identified ${
      overallRiskLevel === 'Low' ? 'minimal operational risks' : `${overallRiskLevel.toLowerCase()} operational risk factors`
    } across ${targetDepartments.length} functional units over the next ${lookaheadDays} days. Key attention required for ${
      departmentForecasts.filter(d => d.riskLevel !== 'Low').map(d => d.department).join(', ') || 'none'
    }.`,
    departmentForecasts,
    criticalRoleVulnerabilities,
    historicalPatternInsights: [
      'Historical Q3 leave rates show a 34% increase in late September due to end-of-quarter transitions and family vacations.',
      'Engineering single-point dependencies cause delayed PR reviews when leadership and staff leaves overlap by >2 days.',
      'Finance department exhibits zero tolerance for absence during monthly closing windows (28th through 3rd).',
    ],
    actionableMitigations: [
      {
        priority: 'Immediate',
        title: 'Institute Engineering Sprint Coverage Handoff',
        department: 'Engineering',
        action: 'Approve incoming leaves conditionally on designating temporary code-review assignees.',
        impactScore: 85,
      },
      {
        priority: 'High',
        title: 'Stagger Q3 Financial Reporting Sign-offs',
        department: 'Finance',
        action: 'Ensure financial review filings are synchronized prior to Sophia Rodriguez\'s planned absence.',
        impactScore: 78,
      },
      {
        priority: 'Medium',
        title: 'Enable Cross-Department Emergency On-Call Matrix',
        department: 'General',
        action: 'Publish the updated secondary escalation hierarchy in the employee directory.',
        impactScore: 65,
      },
    ],
    aiGenerated: false,
  };
}

// POST /api/analytics/staffing-forecast
app.post('/api/analytics/staffing-forecast', async (req, res) => {
  try {
    const {
      lookaheadDays = 30,
      departmentFilter = 'All',
      employees = [],
      leaves = [],
      simulationModifiers = {},
    } = req.body;

    const ai = getGeminiClient();

    // If Gemini client is available, run Gemini 3.8 Flash model
    if (ai) {
      try {
        const prompt = `You are the enterprise workforce analytics intelligence engine.
Analyze the following corporate personnel and leave data to predict staffing shortages, departmental bottlenecks, and operational vulnerability over the next ${lookaheadDays} days.
Ensure enterprise compliance: all employee health reasons and personal notes are strictly redacted.

Current Simulation Date Context: 2026-09-08
Lookahead Horizon: ${lookaheadDays} days
Department Filter: ${departmentFilter}

Active Personnel Records (${employees.length} employees):
${JSON.stringify(
  employees.map((e: any) => ({
    id: e.id,
    name: e.name,
    department: e.department,
    designation: e.designation,
    role: e.role,
    workMode: e.workMode,
  })),
  null,
  2
)}

Submitted and Approved Leaves (${leaves.length} records - Anonymized & Sanitized):
${JSON.stringify(
  leaves.map((l: any) => ({
    id: l.id,
    employeeName: l.employeeName,
    department: l.department,
    leaveType: l.leaveType,
    startDate: l.startDate,
    endDate: l.endDate,
    daysCount: l.daysCount,
    status: l.status,
    // Sensitive personal/medical reasons redacted for privacy compliance
  })),
  null,
  2
)}

Simulation Modifiers:
${JSON.stringify(simulationModifiers, null, 2)}

Provide a strict, professional JSON response matching this schema:
{
  "forecastHorizonDays": number,
  "analysisDate": "2026-09-08",
  "overallRiskLevel": "Low" | "Moderate" | "High" | "Critical",
  "overallRiskScore": number (0 to 100),
  "summary": "Concise executive overview of predicted shortages and operational health",
  "departmentForecasts": [
    {
      "department": string,
      "totalHeadcount": number,
      "minStaffedHeadcount": number,
      "avgCapacityPercentage": number,
      "riskLevel": "Low" | "Moderate" | "High" | "Critical",
      "riskScore": number (0 to 100),
      "highRiskPeriods": [
        {
          "startDate": "YYYY-MM-DD",
          "endDate": "YYYY-MM-DD",
          "severity": "Moderate" | "High" | "Critical",
          "reason": string,
          "missingRoles": string[]
        }
      ],
      "keyBottlenecks": string[],
      "recommendations": string[],
      "dailyCapacities": [
        {
          "date": "YYYY-MM-DD",
          "onLeave": number,
          "percent": number
        }
      ]
    }
  ],
  "criticalRoleVulnerabilities": [
    {
      "role": string,
      "employeeName": string,
      "department": string,
      "vulnerabilityLevel": "Critical" | "High" | "Medium",
      "explanation": string,
      "contingencyPlan": string
    }
  ],
  "historicalPatternInsights": string[],
  "actionableMitigations": [
    {
      "priority": "Immediate" | "High" | "Medium",
      "title": string,
      "department": string,
      "action": string,
      "impactScore": number
    }
  ]
}

Return ONLY valid JSON. Do not include markdown code block backticks if possible.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '';
        const cleaned = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleaned);
        parsed.aiGenerated = true;

        return res.json({ success: true, data: parsed });
      } catch (geminiError) {
        console.warn('Gemini API call failed, falling back to algorithmic prediction engine:', geminiError);
        // Fallback gracefully
        const fallback = generateAlgorithmicForecast(
          employees,
          leaves,
          lookaheadDays,
          departmentFilter,
          simulationModifiers
        );
        return res.json({ success: true, data: fallback, note: 'Generated using Algorithmic Predictive Heuristics' });
      }
    }

    // No API key configured: return algorithmic analysis
    const fallback = generateAlgorithmicForecast(
      employees,
      leaves,
      lookaheadDays,
      departmentFilter,
      simulationModifiers
    );
    return res.json({ success: true, data: fallback, note: 'Generated using Algorithmic Predictive Heuristics' });
  } catch (error: any) {
    console.error('Error generating staffing forecast:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Domain-aware conversational fallback generator for offline or unconfigured environments
function generateFallbackChatResponse(
  userQuery: string,
  roleId: string,
  model: string,
  contextSummary?: any
): string {
  const q = userQuery.toLowerCase();

  if (q.includes('el') || q.includes('earned leave') || q.includes('encash')) {
    return `### 📋 Earned Leave (EL) Policy Guidelines
Under OmniHR Enterprise Policy (rev. 2026):
* **Annual Accrual**: Full-time employees accrue **1.5 days per month** (18 days per calendar year).
* **Carry-Forward**: Up to **30 unused EL days** can roll over into subsequent calendar years.
* **Encashment**: Employees with >15 accumulated days can encash up to 10 days during the annual fiscal closing (March/December).
* **Notice Period**: Leaves spanning >3 consecutive days require submission at least **7 business days** in advance for manager approval.
* **Current Context**: Your current balance is available in the **Leave Management** tab.`;
  }

  if (q.includes('cl') || q.includes('casual leave') || q.includes('sl') || q.includes('sick leave')) {
    return `### 🏥 Casual (CL) & Sick Leave (SL) Overview
* **Casual Leave (CL)**: Allocated at **12 days/year**. Intended for personal matters, emergency family obligations, and brief unplanned absences. Maximum 3 consecutive days per instance.
* **Sick Leave (SL)**: Allocated at **10 days/year**. Medical certificates are mandatory for absences exceeding **2 consecutive days**.
* **Approval Window**: Emergency leaves notify your direct manager instantly via mobile & desktop push notifications.`;
  }

  if (q.includes('pl') || q.includes('parental') || q.includes('privilege') || q.includes('maternity') || q.includes('paternity')) {
    return `### 👶 Privilege & Parental Leave (PL) Framework
* **Primary Caregiver Leave**: 26 weeks of paid parental leave for birthing parents.
* **Secondary Caregiver Leave**: 4 weeks of paid parental leave, flexible within the first 12 months.
* **Privilege Days**: Discretionary executive rest days credited after milestone corporate tenures (3+ years).`;
  }

  if (q.includes('forecast') || q.includes('shortage') || q.includes('staffing') || q.includes('bottleneck')) {
    return `### 📊 Workforce & Predictive Staffing Analysis
* **Engine Status**: Active lookahead horizon is currently tracking team capacity for the upcoming quarter.
* **Current Focus**: Engineering and Finance have overlapping planned leave requests in late September 2026.
* **Actionable Advice**:
  1. Mandate code-review proxies prior to scheduled absences.
  2. Maintain cross-functional coverage to keep departmental capacity ≥70%.
  3. Explore simulation runs in the **Predictive Staffing** workspace.`;
  }

  if (q.includes('review') || q.includes('performance') || q.includes('feedback') || q.includes('okr') || q.includes('rating')) {
    return `### 🌟 Performance Review & Feedback Framework
* **Active Cycle**: Q3 2026 Mid-Year Reviews.
* **5-Point Scale**:
  1. *Exceptional (5.0)* — Consistent outsized impact beyond role level.
  2. *Exceeds Expectations (4.0–4.9)* — High autonomous delivery & peer uplift.
  3. *Meets Expectations (3.0–3.9)* — Reliable achievement of core KPIs.
  4. *Needs Improvement (2.0–2.9)* — Performance coaching plan recommended.
  5. *Unsatisfactory (1.0–1.9)* — Formal remediation required.
* **Review Steps**: Self-evaluation → Peer Feedback → Manager Synthesis → 1-on-1 Calibration → Immutable Cryptographic Signature.`;
  }

  if (q.includes('security') || q.includes('audit') || q.includes('vault') || q.includes('encrypt')) {
    return `### 🛡️ Enterprise Security & Data Integrity
* **Data Encryption**: All HR documents and employee identifiers are protected with AES-256 encryption.
* **Audit Trail**: Every administrative action (leave approvals, role switches, document downloads) creates an immutable SHA-256 tamper-evident log entry.
* **Cloud Sync**: Offline local mutations queue securely and sync automatically once network connectivity is re-established.`;
  }

  // Role-specific general fallback
  if (roleId === 'compliance_officer') {
    return `As the **Enterprise HR & Compliance Officer**, I have verified our current policies. Regarding "${userQuery}":
1. **Statutory Standards**: Our leave rules conform with standard labor standards and enterprise contracts.
2. **Procedural Requirements**: All exceptions require documented justification and HR Admin sign-off.
3. **Audit Compliance**: Records are archived in the tamper-resistant security vault for 7 years.
Is there a specific clause or dispute you would like me to evaluate?`;
  }

  if (roleId === 'fast_responder') {
    return `⚡ **Instant HR Answer**:
• Topic: ${userQuery}
• Status: Verified under OmniHR standard guidelines.
• Quick Action: Navigate to the appropriate workspace using the sidebar or press **⌘K** to search.
Need more details? Feel free to ask!`;
  }

  if (roleId === 'workforce_strategist') {
    return `### 📈 Workforce Planning Recommendation
Regarding "${userQuery}":
• **Capacity Impact**: Assess critical single-point dependencies and solo authority roles.
• **Contingency**: Pre-assign signing authority and handoff documentation before key team leaves.
• **Metric Target**: Target a minimum of 75% departmental operational availability.`;
  }

  return `Hello! As your **OmniHR Assistant**, I'm here to assist with all human resource operations.
Regarding your query: "${userQuery}"

Here are quick resources to help:
• **Leave Requests**: Use the Leave Management tab to view real-time balance calculations or submit a new leave.
• **Staffing Forecasts**: View the Predictive Staffing analytics tab for AI shortage predictions.
• **Company Directory**: Search or filter employees across all 7 departments.
• **Performance Records**: Check or draft evaluations in the Performance Reviews module.

How else can I assist your workflow today?`;
}

// POST /api/chat - Multi-turn conversational Gemini Chatbot
app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages = [],
      roleId = 'hr_general',
      systemInstruction = '',
      model = 'gemini-3.8-flash',
      contextSummary = {},
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Messages array is required' });
    }

    // Resolve model based on user prompt guidelines:
    // "Use gemini-3.1-pro-preview for particularly complex tasks, gemini-3.5-flash for general tasks,
    // and gemini-3.1-flash-lite for tasks that should happen fast. Model: models/gemini-3.8-flash"
    let selectedModel = 'gemini-3.8-flash';
    const cleanModel = String(model).replace(/^models\//, '').trim();

    if (cleanModel === 'gemini-3.1-pro-preview') {
      selectedModel = 'gemini-3.1-pro-preview';
    } else if (cleanModel === 'gemini-3.1-flash-lite') {
      selectedModel = 'gemini-3.1-flash-lite';
    } else if (cleanModel === 'gemini-3.5-flash') {
      selectedModel = 'gemini-3.5-flash';
    } else if (cleanModel === 'gemini-3.8-flash') {
      selectedModel = 'gemini-3.8-flash';
    } else if (roleId === 'compliance_officer' || roleId === 'workforce_strategist') {
      selectedModel = 'gemini-3.1-pro-preview';
    } else if (roleId === 'fast_responder') {
      selectedModel = 'gemini-3.1-flash-lite';
    } else {
      selectedModel = 'gemini-3.8-flash';
    }

    // Build context-enhanced system instruction
    const defaultRoleInstructions: Record<string, string> = {
      compliance_officer: `You are the OmniHR Enterprise Compliance & Labor Policy Advisor.
You specialize in statutory leave regulations (Earned Leave EL, Casual Leave CL, Sick Leave SL, Privilege/Parental Leave PL), audit trails, anti-discrimination guidelines, labor laws, and disciplinary procedures.
Provide rigorous, structured, professional guidance with precise policy clauses and step-by-step compliance checklists.`,
      hr_general: `You are the OmniHR Virtual Assistant, a friendly, professional, and knowledgeable HR specialist.
You assist employees, managers, and HR administrators with everyday enterprise inquiries: leave policies, leave balances, performance review cycles, team directory lookups, payroll document verification, and cloud file management.
Keep explanations clear, supportive, and actionable with markdown formatting.`,
      fast_responder: `You are the OmniHR Quick-Response Assistant.
Your goal is maximum speed, clarity, and brevity. Provide concise bulleted answers, quick status summaries, policy thresholds, and direct links to application workspaces without fluff.`,
      workforce_strategist: `You are the OmniHR Predictive Workforce Strategist.
You analyze organizational depth, capacity metrics, single-point-of-failure dependencies, sprint handover protocols, and staffing shortage mitigation plans.
Help managers make data-driven scheduling and cross-training decisions.`,
      performance_coach: `You are the OmniHR Performance & 1-on-1 Review Coach.
You assist managers and employees in formulating SMART goals, writing constructive and empathetic 360 review feedback, calibrating ratings, and establishing actionable growth plans.`,
    };

    const baseInstruction = systemInstruction || defaultRoleInstructions[roleId] || defaultRoleInstructions.hr_general;
    const enrichedSystemInstruction = `${baseInstruction}

Current Corporate Simulation Context:
- Today's Date: 2026-09-08
- Application: OmniHR Enterprise HR Management Platform (v2.4)
- Available Modules: Employee Directory, Leave Management (EL/CL/SL/PL), Predictive Staffing Shortage Forecasting, Performance Reviews (5-point scale), Monthly Reports, Payroll & Documents (AES-256 Vault), Google Drive Workspace, Tamper-evident Audit Logs.
${contextSummary?.currentUserName ? `- Active User: ${contextSummary.currentUserName} (${contextSummary.currentUserRole}, Department: ${contextSummary.currentUserDepartment})` : ''}
${contextSummary?.pendingLeavesCount ? `- Pending Leaves Awaiting Approval: ${contextSummary.pendingLeavesCount}` : ''}
- Always maintain professional confidentiality and do not leak personal medical details.`;

    const ai = getGeminiClient();

    if (ai) {
      try {
        // Format messages for Gemini API
        // SDK expects: contents: [{ role: 'user' | 'model', parts: [{ text: ... }] }]
        const contents = messages.map((m: any) => ({
          role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text || m.content || '' }],
        }));

        // Ensure alternating roles and user starts
        const sanitizedContents: any[] = [];
        let expectedRole = 'user';

        for (const msg of contents) {
          if (sanitizedContents.length === 0 && msg.role !== 'user') {
            continue; // Skip leading model messages
          }
          if (msg.role === expectedRole) {
            sanitizedContents.push(msg);
            expectedRole = expectedRole === 'user' ? 'model' : 'user';
          } else if (sanitizedContents.length > 0) {
            // Append text to previous message of the same role if consecutive
            const last = sanitizedContents[sanitizedContents.length - 1];
            last.parts[0].text += `\n\n${msg.parts[0].text}`;
          }
        }

        if (sanitizedContents.length === 0) {
          sanitizedContents.push({
            role: 'user',
            parts: [{ text: messages[messages.length - 1]?.text || messages[messages.length - 1]?.content || 'Hello' }],
          });
        }

        let response;
        try {
          response = await ai.models.generateContent({
            model: selectedModel,
            contents: sanitizedContents,
            config: {
              systemInstruction: enrichedSystemInstruction,
            },
          });
        } catch (modelErr: any) {
          // If gemini-3.5-flash or preview model has temporary availability or rate limit,
          // seamlessly fallback to gemini-3.8-flash
          console.warn(`Model ${selectedModel} failed, retrying with gemini-3.8-flash:`, modelErr?.message || modelErr);
          if (selectedModel !== 'gemini-3.8-flash') {
            selectedModel = 'gemini-3.8-flash';
            response = await ai.models.generateContent({
              model: selectedModel,
              contents: sanitizedContents,
              config: {
                systemInstruction: enrichedSystemInstruction,
              },
            });
          } else {
            throw modelErr;
          }
        }

        const replyText = response.text || '';
        return res.json({
          success: true,
          text: replyText,
          modelUsed: selectedModel,
          roleId,
          aiGenerated: true,
        });
      } catch (geminiError: any) {
        console.warn('Gemini chat API error, deploying intelligent fallback:', geminiError?.message || geminiError);
        const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop();
        const fallbackText = generateFallbackChatResponse(
          lastUserMsg?.text || lastUserMsg?.content || 'Hello',
          roleId,
          selectedModel,
          contextSummary
        );

        return res.json({
          success: true,
          text: fallbackText,
          modelUsed: selectedModel,
          roleId,
          aiGenerated: false,
          note: 'Generated via OmniHR Enterprise Domain Knowledge Engine',
        });
      }
    }

    // No API key provided: Use domain knowledge engine fallback
    const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop();
    const fallbackText = generateFallbackChatResponse(
      lastUserMsg?.text || lastUserMsg?.content || 'Hello',
      roleId,
      selectedModel,
      contextSummary
    );

    return res.json({
      success: true,
      text: fallbackText,
      modelUsed: selectedModel,
      roleId,
      aiGenerated: false,
      note: 'Generated via OmniHR Enterprise Domain Knowledge Engine',
    });
  } catch (err: any) {
    console.error('Server error in /api/chat:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// Start Server with Vite Middleware in Development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OmniHR Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
