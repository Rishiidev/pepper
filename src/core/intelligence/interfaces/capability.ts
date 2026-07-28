export type TaskCapability =
  | 'chat'
  | 'summarize'
  | 'embeddings'
  | 'vision'
  | 'code'
  | 'structured_output'
  | 'classification'
  | 'streaming';

export interface CapabilityRequirements {
  required: TaskCapability[];
  optional?: TaskCapability[];
  minContextTokens?: number;
}

export type ProviderCapabilitiesMap = Record<TaskCapability, boolean>;
