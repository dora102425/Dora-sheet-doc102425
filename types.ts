
export type DatasetRecord = Record<string, string | number | boolean>;

export interface Agent {
  name: string;
  description: string;
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  system_prompt: string;
  user_prompt: string;
}

export interface GeneratedDoc {
  record_index: number;
  content: string;
  file_name: string;
}

export interface PipelineStep {
  agentName: string;
  model: string;
  input: string;
  output: string;
  isEditing: boolean;
  error?: string;
}

export enum Tab {
  Data = 'Data',
  Template = 'Template',
  Generate = 'Generate',
  Agents = 'Agents',
  Run = 'Run',
}
