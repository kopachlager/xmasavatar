
export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  originalImage: string | null;
  generatedImage: string | null;
  status: 'idle' | 'fetching' | 'generating' | 'completed';
}

export type ThemeOption = 
  | 'classic' 
  | 'mischief' 
  | 'ghostly' 
  | 'voxel' 
  | 'spirit' 
  | 'galactic' 
  | 'boutique'
  | 'orc'
  | 'cyberpunk'
  | 'victorian'
  | 'nordic'
  | 'candyland'
  | 'baroque'
  | 'kitsch';

export interface PromptTemplate {
  id: ThemeOption;
  label: string;
  description: string;
}
