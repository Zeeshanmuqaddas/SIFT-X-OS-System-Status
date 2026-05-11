import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY is missing. Please configure it in your environment.');
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'mock-key' });

export type AgentRole = 
  | 'Supervisor'
  | 'Disk Forensics'
  | 'Memory Forensics' 
  | 'Network Forensics'
  | 'Correlation'
  | 'Hallucination Detection'
  | 'Training'
  | 'Learning';

export interface ForensicLog {
  id: string;
  timestamp: string;
  agent: AgentRole;
  tool: string;
  reason: string;
  expected: string;
  result: string;
  confidence: number;
  validated: boolean;
  isCorrection: boolean;
  rawText?: string;
}

export interface InvestigationResult {
  executiveSummary: string;
  narrative: string;
  processTree: Array<{ processName: string; pid: number; parentPid: number; commandLine: string; isSuspicious: boolean; confidence: number }>;
  initialAccess: string;
  persistenceFindings: string;
  scheduledTasks: Array<{ taskName: string; executable: string; triggers: string; description: string; confidence: number }>;
  wmiSubscriptions: Array<{ filterName: string; consumerName: string; scriptOrPayload: string; description: string; confidence: number }>;
  browserArtifacts: Array<{ artifactType: string; url: string; artifactDescription: string; confidence: number }>;
  userLoginEvents: Array<{ eventId: number; accountName: string; logonType: string; timestamp: string; description: string; confidence: number }>;
  memoryFindings: Array<{ processName: string; pid: number; findingType: string; description: string; confidence: number }>;
  networkFindings: Array<{ connectionType: string; sourceIp: string; destIp: string; destPort: number; protocol: string; description: string; confidence: number }>;
  timelineReconstruction: Array<{ timestamp: string; eventType: string; description: string; confidence: number }>;
  evidenceCorrelation: Array<{ artifact1: string; artifact2: string; connectionDescription: string; confidence: number }>;
  confidenceScore: number;
  iocs: Array<{ type: string; value: string; description: string; confidence: number }>;
}

const SYSTEM_INSTRUCTION = `You are SIFT-X.
An ELITE Autonomous DFIR Intelligence Operating System.
You operate as a Senior Digital Forensics Analyst, Incident Responder, Threat Hunter, Malware Analyst, and Autonomous Investigation Supervisor.

Available Tools for Agents (Simulated):
- DiskAnalyzer.exe (MFT, Registry, Event Logs)
- Volatility 3 (Memory scanning)
- NetMiner (PCAP analysis, C2 detection)
- IOC_Lookup_Tool (Simulated Threat Intelligence API for querying IPs, hashes, domains)

Analyze the provided evidence or scenario. 
Think step-by-step through different agent perspectives:
1. Disk Forensics (Must detect persistence mechanisms: Registry Run keys/Services, Scheduled Tasks, WMI Subscriptions. For Scheduled Tasks: explicitly identify task name, triggers, associated executables, and confidence score. For WMI Subscriptions: identify EventFilters, EventConsumers, scripts/payloads, and confidence score. Identify all methods, executables, and confidence. Must analyze common browser artifacts like history, cookies, cache for suspicious activity, user behavior, or potential data exfiltration. Must parse and analyze user login and logout events from Windows Event Logs e.g. Security Event Log 4624, 4634, 4647 to identify activity patterns and potential account misuse.)
2. Memory Forensics (Must analyze RAM dumps for injected processes, identify malware, detect hidden DLLs, extract suspicious handles, analyze network connections, detect credential theft, and identify process hollowing. Include process name, PID, finding type, and confidence score. Must reconstruct the process tree showing parent-child relationships and command-line arguments to flag suspicious executions.)
3. Network Forensics (Must analyze PCAPs to detect C2 traffic, beaconing, suspicious domains, exfiltration, reconstruct sessions, and lateral movement. Output networkFindings with confidence scores.)
4. Correlation (Must perform IOC lookup to merge intelligence, enrich findings, compile a comprehensive IOC Report linking attacker activity, build a unified timelineReconstruction, and generate an evidenceCorrelation matrix linking memory and disk artifacts.)
5. Supervisor (Self-Correction & Hallucination Check. Must refine the threat narrative to clearly explain the sequence of events, the attacker's likely objectives, and the impact of the compromise, using evidence from all agents. Must explicitly trigger self-correction loops for low confidence findings, setting isCorrection to true to monitor retries and improved outcomes.)

Respond with a detailed JSON object containing 'logs' (array of ForensicLog simulating the steps taken) and 'report' (InvestigationResult) summarizing the findings.`;

export async function runAutonomousInvestigation(
  evidenceDescription: string,
  onStreamUpdate?: (chunk: string) => void
): Promise<{ logs: ForensicLog[], report: InvestigationResult }> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required to run the investigation.');
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Analyze the following evidence/scenario:\n\n${evidenceDescription}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, // Keep it fast for UI responsiveness
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            logs: {
              type: Type.ARRAY,
              description: "The sequence of autonomous tool executions and findings.",
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp: { type: Type.STRING },
                  agent: { type: Type.STRING },
                  tool: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  expected: { type: Type.STRING },
                  result: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  validated: { type: Type.BOOLEAN },
                  isCorrection: { type: Type.BOOLEAN, description: "True if this log represents a self-correction or retry action." }
                },
                required: ["timestamp", "agent", "tool", "reason", "expected", "result", "confidence", "validated", "isCorrection"]
              }
            },
            report: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: { type: Type.STRING },
                narrative: { type: Type.STRING },
                processTree: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      processName: { type: Type.STRING },
                      pid: { type: Type.NUMBER },
                      parentPid: { type: Type.NUMBER },
                      commandLine: { type: Type.STRING },
                      isSuspicious: { type: Type.BOOLEAN },
                      confidence: { type: Type.NUMBER }
                    },
                    required: ["processName", "pid", "parentPid", "commandLine", "isSuspicious", "confidence"]
                  }
                },
                initialAccess: { type: Type.STRING },
                persistenceFindings: { type: Type.STRING },
                scheduledTasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      taskName: { type: Type.STRING },
                      executable: { type: Type.STRING },
                      triggers: { type: Type.STRING },
                      description: { type: Type.STRING },
                      confidence: { type: Type.NUMBER }
                    },
                    required: ["taskName", "executable", "triggers", "description", "confidence"]
                  }
                },
                wmiSubscriptions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      filterName: { type: Type.STRING },
                      consumerName: { type: Type.STRING },
                      scriptOrPayload: { type: Type.STRING },
                      description: { type: Type.STRING },
                      confidence: { type: Type.NUMBER }
                    },
                    required: ["filterName", "consumerName", "scriptOrPayload", "description", "confidence"]
                  }
                },
                browserArtifacts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      artifactType: { type: Type.STRING },
                      url: { type: Type.STRING },
                      artifactDescription: { type: Type.STRING },
                      confidence: { type: Type.NUMBER }
                    },
                    required: ["artifactType", "url", "artifactDescription", "confidence"]
                  }
                },
                userLoginEvents: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      eventId: { type: Type.NUMBER },
                      accountName: { type: Type.STRING },
                      logonType: { type: Type.STRING },
                      timestamp: { type: Type.STRING },
                      description: { type: Type.STRING },
                      confidence: { type: Type.NUMBER }
                    },
                    required: ["eventId", "accountName", "logonType", "timestamp", "description", "confidence"]
                  }
                },
                memoryFindings: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      processName: { type: Type.STRING },
                      pid: { type: Type.NUMBER },
                      findingType: { type: Type.STRING },
                      description: { type: Type.STRING },
                      confidence: { type: Type.NUMBER }
                    },
                    required: ["processName", "pid", "findingType", "description", "confidence"]
                  }
                },
                networkFindings: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      connectionType: { type: Type.STRING },
                      sourceIp: { type: Type.STRING },
                      destIp: { type: Type.STRING },
                      destPort: { type: Type.NUMBER },
                      protocol: { type: Type.STRING },
                      description: { type: Type.STRING },
                      confidence: { type: Type.NUMBER }
                    },
                    required: ["connectionType", "sourceIp", "destIp", "destPort", "protocol", "description", "confidence"]
                  }
                },
                timelineReconstruction: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      timestamp: { type: Type.STRING },
                      eventType: { type: Type.STRING },
                      description: { type: Type.STRING },
                      confidence: { type: Type.NUMBER }
                    },
                    required: ["timestamp", "eventType", "description", "confidence"]
                  }
                },
                evidenceCorrelation: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      artifact1: { type: Type.STRING },
                      artifact2: { type: Type.STRING },
                      connectionDescription: { type: Type.STRING },
                      confidence: { type: Type.NUMBER }
                    },
                    required: ["artifact1", "artifact2", "connectionDescription", "confidence"]
                  }
                },
                confidenceScore: { type: Type.NUMBER },
                iocs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      value: { type: Type.STRING },
                      description: { type: Type.STRING },
                      confidence: { type: Type.NUMBER }
                    },
                    required: ["type", "value", "description", "confidence"]
                  }
                }
              },
              required: ["executiveSummary", "narrative", "processTree", "initialAccess", "persistenceFindings", "scheduledTasks", "wmiSubscriptions", "browserArtifacts", "userLoginEvents", "memoryFindings", "networkFindings", "timelineReconstruction", "evidenceCorrelation", "confidenceScore", "iocs"]
            }
          },
          required: ["logs", "report"]
        }
      }
    });

    const text = response.text;
    if (!text) {
        throw new Error('No response from Gemini');
    }

    const data = JSON.parse(text);
    return {
        logs: data.logs.map((log: any) => ({ ...log, id: Math.random().toString(36).substring(7) })),
        report: data.report
    };

  } catch (err: any) {
    console.error('Error running investigation:', err);
    
    // JSON Parsing Errors
    if (err instanceof SyntaxError) {
      throw new Error(`JSON Parsing Failure: The autonomous system generated an invalid response structure that could not be parsed. Details: ${err.message}`);
    }
    
    // Gemini API Specific Errors
    if (err.name === 'GoogleGenerativeAIError') {
       throw new Error(`Gemini API Error: The intelligence engine encountered a fatal error during execution. Details: ${err.message}`);
    }
    
    if (err.status === 429) {
       throw new Error(`API Rate Limit Exceeded (429): The intelligence engine is currently overloaded. Please wait a moment and retry.`);
    }
    
    if (err.status >= 500) {
       throw new Error(`API Service Unavailable (${err.status}): The intelligence engine backend is currently experiencing issues. Please try again later.`);
    }
    
    if (err.status || err.code) {
       throw new Error(`Intelligence API failure [${err.status || err.code}]: ${err.message || 'Unknown API error'}`);
    }
    
    // Network / Fetch errors
    if (err.message && (err.message.includes('fetch failed') || err.message.includes('network error'))) {
       throw new Error(`Network Connectivity Error: Failed to communicate with the intelligence engine. Please check your connection.`);
    }

    // Generic fallback
    throw new Error(`System exception during autonomous execution: ${err.message || String(err)}`);
  }
}
