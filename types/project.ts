// Project Types for the Projects Feature

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'completed';
  dueDate?: string; // ISO date string
  createdAt: number;
  updatedAt: number;
}

export interface ProjectItem {
  id: string;
  projectId: string;
  inventoryItemId?: string; // nullable - links to existing inventory item
  name: string; // required item name/description
  isFulfilled: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectWithProgress extends Project {
  totalItems: number;
  fulfilledItems: number;
  progress: number; // 0-100 percentage
}
