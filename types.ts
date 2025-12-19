
export enum MemoryCategory {
  BUSINESS = 'Business',
  PERSONAL = 'Personal',
  FINANCE = 'Finance',
  HEALTH = 'Health',
  TECHNICAL = 'Technical',
  OTHER = 'Other'
}

export type IngestionStep = 'MASKING' | 'ANALYSIS' | 'EMBEDDING' | 'IDLE';

export interface Entity {
  name: string;
  type: 'Person' | 'Org' | 'Location' | 'Date' | 'Product' | 'Other';
}

export interface MemoryRecord {
  id: string;
  originalText: string;
  maskedText: string;
  title: string;
  summary: string;
  importance: number;
  category: MemoryCategory;
  entities: Entity[];
  imageUrl?: string;
  timestamp: number;
  privacyAlerts?: string[];
  embedding?: number[];
}

export interface ProcessingResult {
  title: string;
  summary: string;
  importance: number;
  category: MemoryCategory;
  entities: Entity[];
  privacyRisks: string[];
}

export interface QueryResponse {
  answer: string;
  sources: MemoryRecord[];
  confidence: number;
  isThinking: boolean;
}
