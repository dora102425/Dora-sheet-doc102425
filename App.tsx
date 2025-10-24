
import React, { useState, useCallback, useMemo, ChangeEvent } from 'react';
import type { DatasetRecord, Agent, GeneratedDoc, PipelineStep } from './types';
import { Tab } from './types';
import { parseDatasetFile, parseTemplateFile } from './services/fileParserService';
import { runAgent, generateFollowUpQuestions } from './services/geminiService';

// --- ICONS (as stateless components) ---
const UploadCloud: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
);
const Bot: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
);
const FileText: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
);
const Sparkles: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.9 5.8-5.8 1.9 5.8 1.9L12 21l1.9-5.8 5.8-1.9-5.8-1.9L12 3z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
);
const Play: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="6 3 20 12 6 21 6 3"/></svg>
);
const ChevronRight: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>
);


// --- CONSTANTS ---
const DEFAULT_AGENTS_CONFIG: Agent[] = [
  {
    name: "Summarizer",
    description: "Concise summary generator",
    model: "gemini-2.5-flash",
    temperature: 0.3, max_tokens: 512, top_p: 0.95,
    system_prompt: "You are a helpful assistant that summarizes text concisely.",
    user_prompt: "Summarize the following text:\n\n{{input}}"
  },
  {
    name: "Style Rewriter",
    description: "Style transformation expert",
    model: "gemini-2.5-pro",
    temperature: 0.5, max_tokens: 1024, top_p: 0.95,
    system_prompt: "You are an expert copywriter.",
    user_prompt: "Rewrite the following text in a professional and friendly tone:\n\n{{input}}"
  },
   {
    name: "JSON Converter",
    description: "Converts text to structured JSON",
    model: "gemini-2.5-flash",
    temperature: 0.1, max_tokens: 1024, top_p: 0.95,
    system_prompt: "You are a data processing expert. Convert the following text into a structured JSON object with keys `title`, `summary`, and `keywords` (an array of strings).",
    user_prompt: "Convert this to JSON:\n\n{{input}}"
  }
];


// --- UI HELPER COMPONENTS ---
const Card: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className }) => (
    <div className={`bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 ${className}`}>
        {children}
    </div>
);

const TabButton: React.FC<{label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void}> = ({ label, icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${isActive ? 'bg-accent text-white shadow-md' : 'text-text-light hover:bg-primary'}`}>
        {icon}
        <span>{label}</span>
    </button>
);

const FileInput: React.FC<{onFileSelect: (file: File) => void; acceptedTypes: string}> = ({ onFileSelect, acceptedTypes }) => {
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };
    return (
        <div className="relative w-full">
            <label htmlFor="file-upload" className="cursor-pointer w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-secondary rounded-xl hover:border-accent hover:bg-primary/50 transition-colors duration-300">
                <UploadCloud className="w-10 h-10 text-accent mb-2" />
                <p className="font-semibold text-text-main">Click to upload or drag & drop</p>
                <p className="text-xs text-text-light">{acceptedTypes}</p>
            </label>
            <input id="file-upload" type="file" className="opacity-0 absolute inset-0 w-full h-full" onChange={handleFileChange} />
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function App() {
    const [activeTab, setActiveTab] = useState<Tab>(Tab.Data);
    const [dataset, setDataset] = useState<DatasetRecord[]>([]);
    const [schema, setSchema] = useState<string[]>([]);
    const [template, setTemplate] = useState<string>('');
    const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
    const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS_CONFIG);
    const [pipelineInput, setPipelineInput] = useState<string>('');
    const [pipelineHistory, setPipelineHistory] = useState<PipelineStep[]>([]);
    const [currentPipelineStep, setCurrentPipelineStep] = useState(0);
    const [isPipelineRunning, setIsPipelineRunning] = useState(false);
    const [followUpQuestions, setFollowUpQuestions] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleDatasetFile = useCallback(async (file: File) => {
        setError(null);
        try {
            const records = await parseDatasetFile(file);
            if (records.length === 0) throw new Error("No data found in file.");
            setDataset(records);
            setSchema(Object.keys(records[0]));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to parse dataset file.');
        }
    }, []);

    const handleTemplateFile = useCallback(async (file: File) => {
        setError(null);
        try {
            const content = await parseTemplateFile(file);
            setTemplate(content);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to parse template file.');
        }
    }, []);

    const handleGenerateDocs = useCallback(() => {
        if (!template || dataset.length === 0) {
            setError("Please provide both a dataset and a template.");
            return;
        }
        const docs = dataset.map((record, index) => {
            let content = template;
            for (const key in record) {
                content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(record[key]));
            }
            return {
                record_index: index,
                content: content,
                file_name: `document_${index + 1}.txt`,
            };
        });
        setGeneratedDocs(docs);
        setActiveTab(Tab.Generate);
    }, [template, dataset]);

    const handleAgentChange = <K extends keyof Agent>(index: number, field: K, value: Agent[K]) => {
        const updatedAgents = [...agents];
        updatedAgents[index] = { ...updatedAgents[index], [field]: value };
        setAgents(updatedAgents);
    };

    // FIX: Replaced original pipeline logic to fix stale state and execution bugs.
    const startPipeline = useCallback(async () => {
        if (!pipelineInput.trim()) {
            setError("Pipeline input cannot be empty.");
            return;
        }
        setPipelineHistory([]);
        setCurrentPipelineStep(0);
        setIsPipelineRunning(true);
        setFollowUpQuestions('');
        setError(null);

        let currentInput = pipelineInput;
        const newHistory: PipelineStep[] = [];

        for (const [index, agent] of agents.entries()) {
            const step: PipelineStep = {
                agentName: agent.name,
                model: agent.model,
                input: currentInput,
                output: '',
                isEditing: false,
            };
            
            newHistory.push(step);
            setPipelineHistory([...newHistory]);
            setCurrentPipelineStep(index + 1);

            const output = await runAgent(agent, currentInput);
            
            step.output = output;
            if (output.startsWith("Error:")) {
                step.error = output;
                setPipelineHistory([...newHistory]);
                setIsPipelineRunning(false);
                return;
            }
            
            setPipelineHistory([...newHistory]);
            currentInput = output;
        }

        setIsPipelineRunning(false);

        if (newHistory.length > 0 && !newHistory[newHistory.length - 1].error) {
            const finalOutput = newHistory[newHistory.length - 1].output;
            const questions = await generateFollowUpQuestions(finalOutput);
            setFollowUpQuestions(questions);
        }
    }, [pipelineInput, agents]);

    const tabContent = useMemo(() => {
        switch (activeTab) {
            case Tab.Data: return (
                <Card>
                    <h2 className="text-2xl font-bold mb-4 text-text-main">1. Upload Your Dataset</h2>
                    <p className="text-text-light mb-6">Upload a file containing your data. Supported formats: CSV, JSON, XLSX, ODS, TXT.</p>
                    <FileInput onFileSelect={handleDatasetFile} acceptedTypes=".csv, .json, .xlsx, .ods, .txt" />
                    {dataset.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-semibold mb-2">{dataset.length} records loaded. Columns: {schema.join(', ')}</h3>
                            <div className="max-h-80 overflow-auto rounded-lg border border-secondary">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-primary/50 sticky top-0">
                                        <tr>{schema.map(s => <th key={s} className="p-3 font-semibold">{s}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {dataset.slice(0, 10).map((row, i) => (
                                            <tr key={i} className="border-b border-primary last:border-0">
                                                {schema.map(s => <td key={s} className="p-3 truncate max-w-xs">{String(row[s])}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Card>
            );
            case Tab.Template: return (
                <Card>
                    <h2 className="text-2xl font-bold mb-4 text-text-main">2. Provide a Template</h2>
                    {/* FIX: Replaced backticks with a `code` tag to prevent JSX parsing errors. */}
                    <p className="text-text-light mb-6">Upload or paste a template. Use <code>{'{{column_name}}'}</code> placeholders to insert data.</p>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-bold mb-2">Upload Template File</h3>
                            <FileInput onFileSelect={handleTemplateFile} acceptedTypes=".txt, .md, .docx" />
                            <textarea value={template} onChange={e => setTemplate(e.target.value)} placeholder="Or paste your template here..." className="w-full h-64 mt-4 p-3 border-2 border-secondary rounded-lg focus:ring-2 focus:ring-accent focus:outline-none transition-shadow"/>
                        </div>
                        <div>
                            <h3 className="font-bold mb-2">Live Preview (with first record)</h3>
                            <div className="w-full h-96 p-4 bg-primary/30 rounded-lg border border-secondary overflow-auto prose prose-sm max-w-none">
                                <pre className="whitespace-pre-wrap font-sans">{dataset.length > 0 ? template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(dataset[0][key] || `{{${key}}}`)) : "Upload dataset to see preview."}</pre>
                            </div>
                            <button onClick={handleGenerateDocs} className="mt-4 w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-accent-dark transition-transform transform hover:scale-105 shadow-lg flex items-center justify-center gap-2">
                                Generate Documents <ChevronRight className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                </Card>
            );
            case Tab.Generate: return (
                <Card>
                     <h2 className="text-2xl font-bold mb-4 text-text-main">3. Generated Documents</h2>
                     {generatedDocs.length === 0 ? <p className="text-text-light">No documents generated yet. Go to the Template tab to generate them.</p> :
                     <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        {generatedDocs.map((doc, index) => (
                             <details key={index} className="bg-primary/30 p-4 rounded-lg group">
                                <summary className="font-semibold cursor-pointer">{doc.file_name}</summary>
                                <textarea value={doc.content} onChange={e => {
                                    const newDocs = [...generatedDocs];
                                    newDocs[index].content = e.target.value;
                                    setGeneratedDocs(newDocs);
                                }} className="w-full h-48 mt-2 p-2 border border-secondary rounded-md focus:ring-2 focus:ring-accent focus:outline-none"/>
                             </details>
                        ))}
                     </div>
                     }
                </Card>
            );
            case Tab.Agents: return (
                <Card>
                    <h2 className="text-2xl font-bold mb-4 text-text-main">4. Configure AI Agents</h2>
                    <p className="text-text-light mb-6">Modify the agents that will run in your pipeline. The output of one agent becomes the input for the next.</p>
                    <div className="space-y-6">
                        {agents.map((agent, index) => (
                            <details key={index} className="bg-primary/30 p-4 rounded-xl group" open={index===0}>
                                <summary className="font-bold text-lg cursor-pointer flex items-center gap-2"><Bot className="w-6 h-6 text-accent"/> {agent.name}</summary>
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium">Model</label><input type="text" value={agent.model} onChange={e => handleAgentChange(index, 'model', e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                                    <div><label className="block text-sm font-medium">Temperature</label><input type="number" step="0.1" min="0" max="1" value={agent.temperature} onChange={e => handleAgentChange(index, 'temperature', parseFloat(e.target.value))} className="mt-1 w-full p-2 border rounded-md"/></div>
                                    <div><label className="block text-sm font-medium">Max Tokens</label><input type="number" step="1" min="1" value={agent.max_tokens} onChange={e => handleAgentChange(index, 'max_tokens', parseInt(e.target.value))} className="mt-1 w-full p-2 border rounded-md"/></div>
                                    <div><label className="block text-sm font-medium">Top P</label><input type="number" step="0.05" min="0" max="1" value={agent.top_p} onChange={e => handleAgentChange(index, 'top_p', parseFloat(e.target.value))} className="mt-1 w-full p-2 border rounded-md"/></div>
                                    <div className="col-span-full"><label className="block text-sm font-medium">System Prompt</label><textarea value={agent.system_prompt} onChange={e => handleAgentChange(index, 'system_prompt', e.target.value)} className="mt-1 w-full p-2 border rounded-md h-24"/></div>
                                    <div className="col-span-full"><label className="block text-sm font-medium">User Prompt (use <code>{'{{input}}'}</code>)</label><textarea value={agent.user_prompt} onChange={e => handleAgentChange(index, 'user_prompt', e.target.value)} className="mt-1 w-full p-2 border rounded-md h-24"/></div>
                                </div>
                            </details>
                        ))}
                    </div>
                </Card>
            );
            case Tab.Run: return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <h2 className="text-2xl font-bold mb-4 text-text-main">5. Run Pipeline</h2>
                        <label className="block text-sm font-medium mb-1">Pipeline Input</label>
                        <textarea value={pipelineInput} onChange={e => setPipelineInput(e.target.value)} placeholder="Paste text or select a generated document to start." className="w-full h-48 p-3 border-2 border-secondary rounded-lg focus:ring-2 focus:ring-accent focus:outline-none"/>
                        <div className="flex gap-2 mt-2">
                          {generatedDocs.slice(0, 3).map((doc, i) => (
                            <button key={i} onClick={() => setPipelineInput(doc.content)} className="px-3 py-1 bg-primary text-text-light rounded-full text-xs hover:bg-secondary">Use Doc {i+1}</button>
                          ))}
                        </div>
                        <button onClick={startPipeline} disabled={isPipelineRunning} className="mt-4 w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-accent-dark transition-transform transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:scale-100">
                          {isPipelineRunning ? 'Running...' : 'Execute Pipeline'} <Play className="w-5 h-5"/>
                        </button>
                    </Card>
                    <Card>
                        <h2 className="text-2xl font-bold mb-4 text-text-main">Results</h2>
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                           {pipelineHistory.map((step, index) => (
                                <div key={index} className="bg-primary/30 p-4 rounded-lg">
                                    <h3 className="font-bold flex items-center gap-2"><Bot className="w-5 h-5 text-accent"/> {step.agentName} ({step.model})</h3>
                                    {step.error ? <p className="text-red-600 bg-red-100 p-2 rounded-md mt-2">{step.error}</p> :
                                    step.output ? (
                                        <>
                                        <textarea value={step.output} readOnly className="w-full h-32 mt-2 p-2 bg-white/50 border border-secondary rounded-md" />
                                        {isPipelineRunning && currentPipelineStep === index + 1 && <div className="text-sm text-text-light">Running next step...</div>}
                                        {!isPipelineRunning && index === agents.length-1 && !followUpQuestions && <div className="text-sm text-text-light">Generating follow up questions...</div>}
                                        </>
                                    ) : <div className="text-sm text-text-light mt-2">Running...</div>
                                    }
                                </div>
                           ))}
                           {followUpQuestions && (
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <h3 className="font-bold flex items-center gap-2 text-green-800"><Sparkles className="w-5 h-5"/> Follow-up Questions</h3>
                                    <div className="prose prose-sm mt-2 text-green-700 whitespace-pre-wrap">{followUpQuestions}</div>
                                </div>
                           )}
                        </div>
                    </Card>
                </div>
            );
        }
    }, [activeTab, dataset, schema, template, generatedDocs, agents, pipelineInput, isPipelineRunning, pipelineHistory, currentPipelineStep, followUpQuestions, handleDatasetFile, handleTemplateFile, handleGenerateDocs, startPipeline]);
    
    return (
        <div className="min-h-screen bg-background font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-accent to-text-light">Agentic Docs Builder</h1>
                    <p className="text-text-light mt-2">Flora Edition 🌸</p>
                </header>

                <div className="flex justify-center mb-8">
                    <div className="flex space-x-2 bg-primary p-2 rounded-xl shadow-inner">
                        <TabButton label="Data" icon={<UploadCloud className="w-5 h-5"/>} isActive={activeTab === Tab.Data} onClick={() => setActiveTab(Tab.Data)} />
                        <TabButton label="Template" icon={<FileText className="w-5 h-5"/>} isActive={activeTab === Tab.Template} onClick={() => setActiveTab(Tab.Template)} />
                        <TabButton label="Generate" icon={<Sparkles className="w-5 h-5"/>} isActive={activeTab === Tab.Generate} onClick={() => setActiveTab(Tab.Generate)} />
                        <TabButton label="Agents" icon={<Bot className="w-5 h-5"/>} isActive={activeTab === Tab.Agents} onClick={() => setActiveTab(Tab.Agents)} />
                        <TabButton label="Run" icon={<Play className="w-5 h-5"/>} isActive={activeTab === Tab.Run} onClick={() => setActiveTab(Tab.Run)} />
                    </div>
                </div>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                    <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
                        <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                    </span>
                </div>}

                <main>
                    {tabContent}
                </main>
            </div>
        </div>
    );
}
