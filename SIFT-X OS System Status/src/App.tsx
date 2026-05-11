/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Terminal, ShieldAlert, Cpu, Activity, Database, Network as NetworkIcon, Search, AlertTriangle, ShieldCheck, Play, Bug, FileSearch, Fingerprint } from 'lucide-react';
import { runAutonomousInvestigation, ForensicLog, InvestigationResult, AgentRole } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid } from 'recharts';

// Mock data for graphs if no active investigation
const mockConfidenceData = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  score: 50 + Math.random() * 40
}));

const AGENT_ICONS: Record<AgentRole, React.ReactNode> = {
  'Supervisor': <ShieldCheck className="w-4 h-4 text-neon-cyan" />,
  'Disk Forensics': <Database className="w-4 h-4 text-neon-purple" />,
  'Memory Forensics': <Cpu className="w-4 h-4 text-neon-green" />,
  'Network Forensics': <NetworkIcon className="w-4 h-4 text-neon-yellow" />,
  'Correlation': <Activity className="w-4 h-4 text-neon-cyan" />,
  'Hallucination Detection': <ShieldAlert className="w-4 h-4 text-neon-red" />,
  'Training': <Terminal className="w-4 h-4 text-white" />,
  'Learning': <Search className="w-4 h-4 text-white" />
};

export default function App() {
  const [evidenceInput, setEvidenceInput] = useState('Analyze disk image E01 (hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855) and memory dump memory.img. Suspicion of lateral movement and injected processes.');
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [logs, setLogs] = useState<ForensicLog[]>([]);
  const [report, setReport] = useState<InvestigationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStartInvestigation = async () => {
    if (!evidenceInput.trim()) return;
    setIsInvestigating(true);
    setError(null);
    setLogs([]);
    setReport(null);

    try {
      // Small delay just for UI feel
      await new Promise(res => setTimeout(res, 500));
      
      const res = await runAutonomousInvestigation(evidenceInput);
      
      // Simulate streaming logs for UI effect
      const simulateLogs = async () => {
        for (let i = 0; i < res.logs.length; i++) {
          setLogs(prev => [...prev, res.logs[i]]);
          await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
        }
        setReport(res.report);
        setIsInvestigating(false);
      };
      
      simulateLogs();
      
    } catch (err: any) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError(err?.message || 'Investigation critical failure. An unexpected system error occurred.');
      }
      setIsInvestigating(false);
    }
  };

  const activeAgents = Array.from(new Set(logs.map(l => l.agent)));

  return (
    <div className="h-screen w-screen flex flex-col p-4 bg-cyber-bg overflow-hidden relative">
      <div className="cyber-grid"></div>
      <div className="scan-line"></div>
      
      {/* Header */}
      <header className="glass-panel flex justify-between items-center px-6 py-4 mb-4 shrink-0 z-10 relative">
        <div className="flex items-center gap-4">
          <ShieldAlert className="text-neon-cyan w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold tracking-[0.2em] text-white">SIFT-X <span className="text-neon-cyan opacity-80">OS</span></h1>
            <div className="text-xs tracking-widest opacity-60 text-neon-green mt-1 max-w-xl truncate">AUTONOMOUS MULTI-AGENT DFIR INTELLIGENCE PLATFORM</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] tracking-widest text-white/50 uppercase">System Status</span>
            <span className={`text-sm font-bold tracking-widest ${isInvestigating ? 'text-neon-yellow animate-pulse' : 'text-neon-green'}`}>
              {isInvestigating ? 'ANALYSIS IN PROGRESS' : 'AWAITING EVIDENCE'}
            </span>
          </div>
          <button 
            onClick={handleStartInvestigation}
            disabled={isInvestigating}
            className="flex items-center gap-2 cyber-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInvestigating ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            LAUNCH INVESTIGATION
          </button>
        </div>
      </header>

      <div className="flex gap-4 h-full min-h-0 z-10 relative">
        
        {/* Left Sidebar: Agents & Evidence */}
        <div className="w-[300px] flex flex-col gap-4 shrink-0">
          <div className="glass-panel flex flex-col h-[200px] shrink-0">
            <div className="glass-panel-header">
              <span>Evidence Ingestion</span>
              <FileSearch className="w-4 h-4" />
            </div>
            <div className="p-3 flex-1 flex flex-col gap-2">
              <label className="text-[10px] text-neon-cyan uppercase tracking-widest opacity-70">Scenario / Artifact Pointers</label>
              <textarea 
                value={evidenceInput}
                onChange={e => setEvidenceInput(e.target.value)}
                disabled={isInvestigating}
                className="w-full flex-1 bg-black/40 border border-cyber-border text-xs font-mono p-2 text-white focus:outline-none focus:border-neon-cyan resize-none"
                placeholder="Enter evidence paths, scenario details, or IOCs to begin..."
              />
            </div>
          </div>

          <div className="glass-panel flex-1 flex flex-col min-h-0">
            <div className="glass-panel-header">
              <span>Agent Swarm</span>
              <Activity className="w-4 h-4" />
            </div>
            <div className="p-4 flex flex-col gap-4 overflow-y-auto">
              {(Object.keys(AGENT_ICONS) as AgentRole[]).map(agent => {
                const isActive = activeAgents.includes(agent);
                const isCurrentlyOperating = isInvestigating && logs[logs.length - 1]?.agent === agent;
                
                return (
                  <div key={agent} className={`flex items-center justify-between p-2 rounded border ${isCurrentlyOperating ? 'border-neon-cyan bg-neon-cyan/10' : isActive ? 'border-white/20 bg-white/5' : 'border-white/5 text-white/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded bg-black ${isCurrentlyOperating ? 'animate-pulse' : ''}`}>
                        {AGENT_ICONS[agent]}
                      </div>
                      <span className="text-xs uppercase tracking-wider">{agent}</span>
                    </div>
                    {isCurrentlyOperating && <div className="w-2 h-2 rounded-full bg-neon-cyan animate-ping" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Middle: Terminal & Visualizations */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Top visualizers */}
          <div className="h-1/3 flex gap-4 shrink-0">
             <div className="glass-panel flex-1 flex flex-col">
                <div className="glass-panel-header">
                  <span>Confidence Measurement</span>
                  <Activity className="w-4 h-4 text-neon-green" />
                </div>
                <div className="p-2 flex-1 w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={logs.length > 0 ? logs.map((l, i) => ({ time: i, score: l.confidence })) : mockConfidenceData}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-neon-cyan)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="var(--color-neon-cyan)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid var(--color-cyber-border)', borderRadius: 0, fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                        itemStyle={{ color: 'var(--color-neon-cyan)' }}
                      />
                      <Area type="stepAfter" dataKey="score" stroke="var(--color-neon-cyan)" fillOpacity={1} fill="url(#colorScore)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="glass-panel flex-1 flex flex-col">
                <div className="glass-panel-header">
                  <span className="text-neon-red">Hallucination & Contradiction Alerts</span>
                  <AlertTriangle className="w-4 h-4 text-neon-red" />
                </div>
                <div className="p-4 flex flex-col gap-2 overflow-y-auto font-mono text-xs text-white">
                  {logs.filter(l => l.agent === 'Hallucination Detection').length === 0 && (
                     <div className="opacity-40 text-center mt-8">NO HALLUCINATIONS DETECTED</div>
                  )}
                  {logs.filter(l => l.agent === 'Hallucination Detection').map((log, i) => (
                    <div key={i} className="p-2 border border-neon-red/50 bg-neon-red/10 text-neon-red">
                      <div className="font-bold flex justify-between">
                         <span>⚠️ CONTRADICTION ALERT</span>
                         <span>Conf: {log.confidence}%</span>
                      </div>
                      <div className="mt-1opacity-80 break-words">{log.result}</div>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          {/* Terminal */}
          <div className="glass-panel flex-1 flex flex-col min-h-0">
            <div className="glass-panel-header">
              <span>Autonomous Execution Trace</span>
              <Terminal className="w-4 h-4" />
            </div>
            <div ref={scrollRef} className="p-4 flex-1 overflow-y-auto flex flex-col gap-3 font-mono text-xs">
              {error && (
                <div className="text-neon-red p-2 bg-neon-red/10 border border-neon-red">
                  [SYSTEM_FAILURE]: {error}
                </div>
              )}
              
              {!isInvestigating && logs.length === 0 && !error && (
                <div className="text-neon-cyan opacity-50">
                  <span className="animate-pulse">_</span> Awaiting evidence ingestion to begin autonomous operation...
                </div>
              )}

              <AnimatePresence>
                {logs.map((log) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={log.id} 
                    className={`border-l-2 pl-3 py-1 ${log.validated ? 'border-neon-green' : 'border-neon-yellow'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                       <span className="text-[10px] opacity-50">{log.timestamp}</span>
                       <span className={`font-bold ${log.agent === 'Supervisor' ? 'text-neon-purple' : log.agent === 'Hallucination Detection' ? 'text-neon-red' : 'text-white'}`}>[{log.agent}]</span>
                    </div>
                    <div className="text-neon-cyan">
                      <span className="opacity-50">&gt; EXEC: </span> {log.tool}
                    </div>
                    <div className="text-white/70 mt-1 pl-4 break-words">
                      <div><span className="text-neon-cyan/50">WHY:</span> {log.reason}</div>
                      <div className="mt-1 text-neon-green"><span className="text-neon-cyan/50">RES:</span> {log.result}</div>
                    </div>
                    <div className="flex gap-4 mt-2 pl-4 text-[10px] tracking-wider uppercase">
                      <span className="text-neon-yellow">CONF: {log.confidence}%</span>
                      {log.validated && <span className="text-neon-green">✓ VALIDATED</span>}
                      {!log.validated && <span className="text-neon-red">⚠️ UNVALIDATED</span>}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isInvestigating && (
                <div className="text-neon-cyan mt-4 animate-pulse uppercase tracking-widest text-[10px]">
                  <span>Analyzing Data Streams... <Terminal className="inline w-3 h-3 ml-1" /></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Final Report & IOCs */}
        <div className="w-[350px] flex flex-col gap-4 shrink-0">
          
          <div className="glass-panel h-[250px] flex flex-col shrink-0">
             <div className="glass-panel-header">
                <span>Self-Correction Monitor</span>
                <Activity className="w-4 h-4 text-neon-purple" />
             </div>
             <div className="p-3 flex-1 overflow-y-auto font-mono text-xs flex flex-col gap-2">
                {logs.filter(l => l.isCorrection).length === 0 && !isInvestigating && (
                  <div className="opacity-40 text-center mt-8">NO CORRECTIONS TRIGGERED</div>
                )}
                {isInvestigating && logs.filter(l => l.isCorrection).length === 0 && (
                   <div className="h-full flex items-center justify-center">
                     <div className="text-neon-purple/50 animate-pulse text-center">Monitoring Autonomous System for Logic Gaps...</div>
                   </div>
                )}
                <AnimatePresence>
                  {logs.filter(l => l.isCorrection).map((log) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={log.id} 
                      className="p-2 border border-neon-purple/50 bg-neon-purple/10 text-white"
                    >
                      <div className="text-neon-purple font-bold uppercase flex justify-between items-center">
                         <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> RETRY / CORRECT</span>
                         <span>Conf: {log.confidence}%</span>
                      </div>
                      <div className="text-[10px] mt-1 text-neon-purple/80">
                         &gt; {log.tool}
                      </div>
                      <div className="text-[10px] mt-1 opacity-80 break-words">
                         <span className="text-white/50">REASON:</span> {log.reason}
                      </div>
                      <div className="text-[10px] mt-1 break-words text-neon-green">
                         <span className="text-white/50">OUTCOME:</span> {log.result}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
             </div>
          </div>

          <div className="glass-panel flex-1 flex flex-col min-h-0">
             <div className="glass-panel-header">
                <span>Threat Intelligence</span>
                <Fingerprint className="w-4 h-4 text-neon-red" />
             </div>
             <div className="p-4 flex-1 overflow-y-auto">
               {!report && !isInvestigating && (
                  <div className="h-full flex items-center justify-center text-white/30 text-xs font-mono text-center">
                    Report will synthesize upon investigation completion
                  </div>
               )}
               {isInvestigating && !report && (
                  <div className="h-full flex items-center justify-center">
                    <Activity className="w-8 h-8 text-neon-purple animate-ping" />
                  </div>
               )}
               {report && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-sm font-mono">
                   
                   <div>
                     <h3 className="text-neon-cyan uppercase font-bold text-xs tracking-widest border-b border-cyber-border mb-2 pb-1">Confidence Score</h3>
                     <div className="text-4xl text-neon-green font-bold">{report.confidenceScore}%</div>
                   </div>

                   <div>
                     <h3 className="text-neon-cyan uppercase font-bold text-xs tracking-widest border-b border-cyber-border mb-2 pb-1">Executive Summary</h3>
                     <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{report.executiveSummary}</p>
                   </div>

                   <div>
                     <h3 className="text-neon-cyan uppercase font-bold text-xs tracking-widest border-b border-cyber-border mb-2 pb-1">Threat Narrative</h3>
                     <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{report.narrative}</p>
                   </div>

                   <div>
                     <h3 className="text-neon-cyan uppercase font-bold text-xs tracking-widest border-b border-cyber-border mb-2 pb-1">Initial Access</h3>
                     <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{report.initialAccess}</p>
                   </div>

                   <div>
                     <h3 className="text-neon-cyan uppercase font-bold text-xs tracking-widest border-b border-cyber-border mb-2 pb-1">Persistence Mechanisms</h3>
                     <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{report.persistenceFindings}</p>
                   </div>

                   <div>
                     <h3 className="text-neon-yellow uppercase font-bold text-xs tracking-widest border-b border-neon-yellow/30 mb-2 pb-1">Scheduled Tasks</h3>
                     {(!report.scheduledTasks || report.scheduledTasks.length === 0) ? (
                       <div className="text-white/50 text-[10px] uppercase">No malicious tasks detected</div>
                     ) : (
                       <div className="flex flex-col gap-2">
                         {report.scheduledTasks.map((task, i) => (
                           <div key={i} className="p-2 border border-neon-yellow/20 bg-neon-yellow/5">
                             <div className="flex justify-between items-center text-xs">
                               <span className="text-neon-yellow font-bold uppercase">{task.taskName}</span>
                               <span className="text-white/50 text-[10px]">Conf: {task.confidence}%</span>
                             </div>
                             <div className="flex flex-col text-[10px] mt-1 text-white/80">
                               <span><span className="opacity-50">Exec:</span> {task.executable}</span>
                               <span><span className="opacity-50">Triggers:</span> {task.triggers}</span>
                             </div>
                             <div className="text-white/60 text-[10px] mt-1">{task.description}</div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   <div>
                     <h3 className="text-neon-purple uppercase font-bold text-xs tracking-widest border-b border-neon-purple/30 mb-2 pb-1">WMI Subscriptions</h3>
                     {(!report.wmiSubscriptions || report.wmiSubscriptions.length === 0) ? (
                       <div className="text-white/50 text-[10px] uppercase">No malicious WMI subscriptions detected</div>
                     ) : (
                       <div className="flex flex-col gap-2">
                         {report.wmiSubscriptions.map((wmi, i) => (
                           <div key={i} className="p-2 border border-neon-purple/20 bg-neon-purple/5">
                             <div className="flex justify-between items-center text-xs">
                               <span className="text-neon-purple font-bold uppercase">{wmi.filterName}</span>
                               <span className="text-white/50 text-[10px]">Conf: {wmi.confidence}%</span>
                             </div>
                             <div className="text-white font-mono break-all mt-1 text-[11px]">{wmi.consumerName}</div>
                             <div className="text-white/80 font-mono break-all mt-1 text-[9px] bg-black/40 p-1">{wmi.scriptOrPayload}</div>
                             <div className="text-white/60 text-[10px] mt-1">{wmi.description}</div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   <div>
                     <h3 className="text-neon-cyan uppercase font-bold text-xs tracking-widest border-b border-neon-cyan/30 mb-2 pb-1">Browser Artifacts</h3>
                     {(!report.browserArtifacts || report.browserArtifacts.length === 0) ? (
                       <div className="text-white/50 text-[10px] uppercase">No suspicious browser artifacts detected</div>
                     ) : (
                       <div className="flex flex-col gap-2">
                         {report.browserArtifacts.map((artifact, i) => (
                           <div key={i} className="p-2 border border-neon-cyan/20 bg-neon-cyan/5">
                             <div className="flex justify-between items-center text-xs">
                               <span className="text-neon-cyan font-bold uppercase">{artifact.artifactType}</span>
                               <span className="text-white/50 text-[10px]">Conf: {artifact.confidence}%</span>
                             </div>
                             <div className="text-white font-mono break-all mt-1 text-[11px]">{artifact.url}</div>
                             <div className="text-white/60 text-[10px] mt-1">{artifact.artifactDescription}</div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   <div>
                     <h3 className="text-neon-green uppercase font-bold text-xs tracking-widest border-b border-neon-green/30 mb-2 pb-1">User Login Events</h3>
                     {(!report.userLoginEvents || report.userLoginEvents.length === 0) ? (
                       <div className="text-white/50 text-[10px] uppercase">No suspicious login events detected</div>
                     ) : (
                       <div className="flex flex-col gap-2">
                         {report.userLoginEvents.map((event, i) => (
                           <div key={i} className="p-2 border border-neon-green/20 bg-neon-green/5">
                             <div className="flex justify-between items-center text-xs">
                               <span className="text-neon-green font-bold uppercase">Event {event.eventId}</span>
                               <span className="text-white/50 text-[10px]">Conf: {event.confidence}%</span>
                             </div>
                             <div className="flex justify-between items-center text-[10px] mt-1 text-white/80">
                               <span><span className="opacity-50">Acc:</span> {event.accountName}</span>
                               <span><span className="opacity-50">Type:</span> {event.logonType}</span>
                             </div>
                             <div className="text-white/50 text-[9px] mt-1">{event.timestamp}</div>
                             <div className="text-white/60 text-[10px] mt-1">{event.description}</div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   <div>
                     <h3 className="text-neon-yellow uppercase font-bold text-xs tracking-widest border-b border-neon-yellow/30 mb-2 pb-1">Memory Analysis</h3>
                     {(!report.memoryFindings || report.memoryFindings.length === 0) ? (
                       <div className="text-white/50 text-[10px] uppercase">No malicious memory artifacts detected</div>
                     ) : (
                       <div className="flex flex-col gap-2">
                         {report.memoryFindings.map((finding, i) => (
                           <div key={i} className="p-2 border border-neon-yellow/20 bg-neon-yellow/5">
                             <div className="flex justify-between items-center text-xs">
                               <span className="text-neon-yellow font-bold uppercase">{finding.findingType}</span>
                               <span className="text-white/50 text-[10px]">Conf: {finding.confidence}%</span>
                             </div>
                             <div className="flex justify-between items-center text-[10px] mt-1 text-white/80">
                               <span><span className="opacity-50">Process:</span> {finding.processName}</span>
                               <span><span className="opacity-50">PID:</span> {finding.pid}</span>
                             </div>
                             <div className="text-white/60 text-[10px] mt-1">{finding.description}</div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   <div>
                     <h3 className="text-neon-cyan uppercase font-bold text-xs tracking-widest border-b border-neon-cyan/30 mb-2 pb-1">Process Tree Visualization</h3>
                     {(!report.processTree || report.processTree.length === 0) ? (
                       <div className="text-white/50 text-[10px] uppercase">No process tree available</div>
                     ) : (
                       <div className="flex flex-col gap-2 font-mono">
                         {report.processTree.map((proc, i) => (
                           <div key={i} className={`p-2 border ${proc.isSuspicious ? 'border-neon-red/30 bg-neon-red/10' : 'border-cyber-border/30 bg-cyber-light/10'}`}>
                             <div className="flex justify-between items-center text-xs">
                               <span className={`${proc.isSuspicious ? 'text-neon-red' : 'text-neon-cyan'} font-bold`}>{proc.processName} <span className="text-white/50 text-[10px]">({proc.pid})</span></span>
                               <span className="text-white/50 text-[10px]">Conf: {proc.confidence}%</span>
                             </div>
                             <div className="text-[10px] text-white/50 mt-1">PPID: {proc.parentPid}</div>
                             <div className="text-[10px] text-white/80 mt-1 truncate" title={proc.commandLine}>&gt; {proc.commandLine}</div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   <div>
                     <h3 className="text-neon-yellow uppercase font-bold text-xs tracking-widest border-b border-neon-yellow/30 mb-2 pb-1">Network Analysis</h3>
                     {(!report.networkFindings || report.networkFindings.length === 0) ? (
                       <div className="text-white/50 text-[10px] uppercase">No suspicious network activity detected</div>
                     ) : (
                       <div className="flex flex-col gap-2">
                         {report.networkFindings.map((finding, i) => (
                           <div key={i} className="p-2 border border-neon-yellow/20 bg-neon-yellow/5 text-white">
                             <div className="flex justify-between items-center text-xs">
                               <span className="text-neon-yellow font-bold uppercase">{finding.connectionType}</span>
                               <span className="text-white/50 text-[10px]">Conf: {finding.confidence}%</span>
                             </div>
                             <div className="flex flex-col text-[10px] mt-1 text-white/80">
                               <span><span className="opacity-50">Src:</span> {finding.sourceIp} &rarr; <span className="opacity-50">Dest:</span> {finding.destIp}:{finding.destPort} ({finding.protocol})</span>
                             </div>
                             <div className="text-white/60 text-[10px] mt-1">{finding.description}</div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   <div>
                     <h3 className="text-neon-cyan uppercase font-bold text-xs tracking-widest border-b border-neon-cyan/30 mb-2 pb-1">Timeline Reconstruction</h3>
                     {(!report.timelineReconstruction || report.timelineReconstruction.length === 0) ? (
                       <div className="text-white/50 text-[10px] uppercase">Timeline not available</div>
                     ) : (
                       <div className="flex flex-col gap-2 border-l border-neon-cyan/30 pl-2 ml-1">
                         {report.timelineReconstruction.map((event, i) => (
                           <div key={i} className="relative pb-2">
                             <div className="absolute w-2 h-2 bg-neon-cyan rounded-full -left-[13px] top-1"></div>
                             <div className="flex justify-between items-center text-[10px]">
                               <span className="text-neon-cyan/70">{event.timestamp}</span>
                               <span className="text-white/50">Conf: {event.confidence}%</span>
                             </div>
                             <div className="text-white font-bold text-xs uppercase mt-0.5">{event.eventType}</div>
                             <div className="text-white/70 text-[10px] mt-0.5">{event.description}</div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   <div>
                     <h3 className="text-neon-purple uppercase font-bold text-xs tracking-widest border-b border-neon-purple/30 mb-2 pb-1">Evidence Correlation Matrix</h3>
                     {(!report.evidenceCorrelation || report.evidenceCorrelation.length === 0) ? (
                       <div className="text-white/50 text-[10px] uppercase">No correlations found</div>
                     ) : (
                       <div className="flex flex-col gap-2">
                         {report.evidenceCorrelation.map((correlation, i) => (
                           <div key={i} className="p-2 border border-neon-purple/20 bg-neon-purple/5">
                             <div className="flex justify-between items-center text-[10px]">
                               <span className="text-white/50">Conf: {correlation.confidence}%</span>
                             </div>
                             <div className="flex items-center gap-2 mt-1">
                               <div className="flex-1 bg-black/40 border border-cyber-border p-1 text-[9px] text-white/80 break-all">{correlation.artifact1}</div>
                               <Activity className="w-3 h-3 text-neon-purple shrink-0" />
                               <div className="flex-1 bg-black/40 border border-cyber-border p-1 text-[9px] text-white/80 break-all">{correlation.artifact2}</div>
                             </div>
                             <div className="text-white/70 text-[10px] mt-2 italic">{correlation.connectionDescription}</div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   <div>
                     <div className="flex justify-between items-end border-b border-neon-red/30 mb-2 pb-1">
                       <h3 className="text-neon-red uppercase font-bold text-xs tracking-widest">IOC Report</h3>
                       <span className="text-[9px] text-neon-red/50 tracking-wider">SOURCED VIA <span className="font-bold">IOC_LOOKUP_TOOL</span></span>
                     </div>
                     <div className="flex flex-col gap-2">
                       {report.iocs.map((ioc, i) => (
                         <div key={i} className="p-2 border border-neon-red/20 bg-neon-red/5">
                           <div className="flex justify-between items-center text-xs">
                             <span className="text-neon-red font-bold uppercase">{ioc.type}</span>
                             <span className="text-white/50 text-[10px]">Conf: {ioc.confidence}%</span>
                           </div>
                           <div className="text-white font-mono break-all mt-1">{ioc.value}</div>
                           <div className="text-white/60 text-[10px] mt-1">{ioc.description}</div>
                         </div>
                       ))}
                     </div>
                   </div>

                 </motion.div>
               )}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
