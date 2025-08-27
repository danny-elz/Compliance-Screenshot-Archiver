// Authentication types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  name?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Schedule types  
export interface Schedule {
  id: string;
  url: string;
  cron: string;
  artifact_type: 'png' | 'pdf';
  enabled: boolean;
  viewport_width?: number;
  viewport_height?: number;
  wait_until?: 'load' | 'domcontentloaded' | 'networkidle';
  tags?: any[];
  retention_days?: number;
}

export interface CreateScheduleRequest {
  url: string;
  cron: string;
  artifact_type: 'png' | 'pdf';
  enabled?: boolean;
  viewport_width?: number;
  viewport_height?: number;
  wait_until?: 'load' | 'domcontentloaded' | 'networkidle';
  tags?: any[];
  retention_days?: number;
}

export interface UpdateScheduleRequest {
  url?: string;
  cron?: string;
  artifact_type?: 'png' | 'pdf';
  enabled?: boolean;
  viewport_width?: number;
  viewport_height?: number;
  wait_until?: 'load' | 'domcontentloaded' | 'networkidle';
  tags?: any[];
  retention_days?: number;
}

// Capture types
export interface Capture {
  id: string;
  schedule_id?: string;
  sha256: string;
  s3_key: string;
  artifact_type: 'png' | 'pdf';
  url: string;
  created_at: number;
  status: string;
}

export interface TriggerCaptureRequest {
  url: string;
  artifact_type: 'png' | 'pdf';
  viewport_width?: number;
  viewport_height?: number;
  wait_until?: 'load' | 'domcontentloaded' | 'networkidle';
  full_page?: boolean;
  delay?: number;
  tags?: string[];
  notes?: string;
}

export interface CapturesResponse {
  items: Capture[];
  last_evaluated_key?: Record<string, any>;
  count: number;
}

export interface SchedulesResponse {
  items: Schedule[];
  last_evaluated_key?: Record<string, any>;
  count: number;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// UI state types
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface SortingState {
  id: string;
  desc: boolean;
}

export interface FilterState {
  url?: string;
  artifact_type?: 'png' | 'pdf';
  status?: string;
  date_from?: string;
  date_to?: string;
}

// URL Preview types
export interface UrlPreview {
  title?: string;
  description?: string;
  favicon?: string;
  screenshot?: string;
  status: 'loading' | 'success' | 'error';
  error?: string;
}

// Viewport preset types
export interface ViewportPreset {
  name: string;
  width: number;
  height: number;
  icon?: string;
}

// Enhanced capture options
export interface CaptureOptions {
  viewport_width: number;
  viewport_height: number;
  wait_until: 'load' | 'domcontentloaded' | 'networkidle';
  full_page: boolean;
  delay: number;
  tags: string[];
  notes: string;
}

// Analytics types
export interface AnalyticsTimeRange {
  start: string;
  end: string;
  label: string;
}

export interface AnalyticsData {
  totalCaptures: number;
  capturesByType: {
    png: number;
    pdf: number;
  };
  capturesByStatus: {
    success: number;
    failed: number;
    pending: number;
  };
  capturesTrend: {
    date: string;
    captures: number;
  }[];
  topUrls: {
    url: string;
    count: number;
    lastCapture: string;
  }[];
  storageMetrics: {
    totalSize: number;
    averageSize: number;
    fileCount: number;
  };
  retentionCompliance: {
    compliant: number;
    nonCompliant: number;
    total: number;
  };
  integrityStatus: {
    verified: number;
    unverified: number;
    failed: number;
    total: number;
  };
}

export interface ComplianceReport {
  id: string;
  title: string;
  dateRange: {
    start: string;
    end: string;
  };
  totalCaptures: number;
  successRate: number;
  integrityRate: number;
  retentionCompliance: number;
  generatedAt: string;
  downloadUrl?: string;
}

export interface AnalyticsFilter {
  timeRange: string;
  artifactType?: 'png' | 'pdf' | 'all';
  status?: 'success' | 'failed' | 'pending' | 'all';
  url?: string;
}