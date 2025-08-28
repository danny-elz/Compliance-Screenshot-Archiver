import { 
  Schedule, 
  Capture, 
  CreateScheduleRequest, 
  UpdateScheduleRequest,
  TriggerCaptureRequest,
  SchedulesResponse,
  CapturesResponse,
  ApiResponse,
  User,
  UrlPreview,
  AnalyticsData,
  AnalyticsFilter,
  ComplianceReport
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    
    // Development mode: Set mock token for testing (matches backend dev token)
    if (import.meta.env.DEV) {
      this.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi0xMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjAwMDAwMDAwfQ.mock-signature';
    }
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(response.status, errorText || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    // Health endpoint is at root level, not under /api
    const url = this.baseUrl.replace('/api', '') + '/health';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new ApiError(response.status, `HTTP ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    // Set token for future requests
    if (response.data?.token) {
      this.setToken(response.data.token);
    }
    
    return response;
  }

  async logout(): Promise<ApiResponse<void>> {
    await this.request('/auth/logout', { method: 'POST' });
    this.token = null;
    return { data: undefined };
  }

  // Schedules
  async getSchedules(): Promise<ApiResponse<Schedule[]>> {
    return this.request('/schedules');
  }

  async createSchedule(data: CreateScheduleRequest): Promise<ApiResponse<Schedule>> {
    return this.request('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSchedule(scheduleId: string): Promise<ApiResponse<Schedule>> {
    return this.request(`/schedules/${scheduleId}`);
  }

  async updateSchedule(
    scheduleId: string, 
    data: UpdateScheduleRequest
  ): Promise<ApiResponse<Schedule>> {
    return this.request(`/schedules/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSchedule(scheduleId: string): Promise<ApiResponse<void>> {
    return this.request(`/schedules/${scheduleId}`, {
      method: 'DELETE',
    });
  }

  // Captures
  async getCaptures(
    limit = 50,
    lastKey?: string
  ): Promise<ApiResponse<CapturesResponse>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(lastKey && { last_key: lastKey })
    });
    const response = await this.request<Capture[]>(`/captures?${params}`);
    
    // Transform backend array response to match frontend expectations
    if (response.data) {
      return {
        data: {
          items: response.data,
          count: response.data.length,
          last_evaluated_key: undefined
        }
      };
    }
    
    return response as ApiResponse<CapturesResponse>;
  }

  async getCapture(captureId: string): Promise<ApiResponse<Capture>> {
    return this.request(`/captures/${captureId}`);
  }

  async triggerCapture(data: TriggerCaptureRequest): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      url: data.url,
      artifact_type: data.artifact_type,
      ...(data.viewport_width && { viewport_width: data.viewport_width.toString() }),
      ...(data.viewport_height && { viewport_height: data.viewport_height.toString() }),
      ...(data.wait_until && { wait_until: data.wait_until }),
      ...(data.full_page !== undefined && { full_page: data.full_page.toString() }),
      ...(data.delay && { delay: data.delay.toString() })
    });
    return this.request(`/captures/trigger?${params}`, {
      method: 'POST',
      body: JSON.stringify({
        tags: data.tags || [],
        notes: data.notes || ''
      })
    });
  }

  async getCaptureDownloadUrl(captureId: string): Promise<ApiResponse<{ download_url: string }>> {
    return this.request(`/captures/${captureId}/download`);
  }

  async verifyCapture(sha256: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({ sha256 });
    return this.request(`/captures/verify?${params}`, {
      method: 'POST',
    });
  }

  async deleteCapture(captureId: string): Promise<ApiResponse<any>> {
    return this.request(`/captures/${captureId}`, {
      method: 'DELETE',
    });
  }

  // URL Preview functionality (mock implementation since backend may not support it yet)
  async previewUrl(url: string): Promise<ApiResponse<UrlPreview>> {
    // For now, we'll simulate URL preview functionality
    // In a real implementation, this would call a backend endpoint
    try {
      const response = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        // Fallback to basic parsing if preview service isn't available
        return this.mockUrlPreview(url);
      }
      const data = await response.json();
      return { data };
    } catch {
      return this.mockUrlPreview(url);
    }
  }

  private mockUrlPreview(url: string): Promise<ApiResponse<UrlPreview>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const urlObj = new URL(url);
          resolve({
            data: {
              title: `${urlObj.hostname}`,
              description: `Preview of ${url}`,
              favicon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`,
              status: 'success'
            }
          });
        } catch {
          resolve({
            data: {
              status: 'error',
              error: 'Invalid URL'
            }
          });
        }
      }, 1000);
    });
  }

  // Analytics endpoints
  async getAnalytics(filter: AnalyticsFilter): Promise<ApiResponse<AnalyticsData>> {
    const params = new URLSearchParams({
      time_range: filter.timeRange,
      ...(filter.artifactType && filter.artifactType !== 'all' && { artifact_type: filter.artifactType }),
      ...(filter.status && filter.status !== 'all' && { status: filter.status }),
      ...(filter.url && { url: filter.url })
    });
    
    // For now, return mock data since backend endpoint may not exist yet
    return this.getMockAnalyticsData(filter);
    
    // Uncomment when backend endpoint is ready:
    // return this.request(`/analytics?${params}`);
  }

  async generateComplianceReport(filter: AnalyticsFilter): Promise<ApiResponse<ComplianceReport>> {
    const params = new URLSearchParams({
      time_range: filter.timeRange,
      ...(filter.artifactType && filter.artifactType !== 'all' && { artifact_type: filter.artifactType }),
      ...(filter.status && filter.status !== 'all' && { status: filter.status })
    });
    
    // For now, return mock data since backend endpoint may not exist yet
    return this.getMockComplianceReport(filter);
    
    // Uncomment when backend endpoint is ready:
    // return this.request(`/analytics/compliance-report?${params}`, { method: 'POST' });
  }

  async getComplianceReports(): Promise<ApiResponse<ComplianceReport[]>> {
    // For now, return mock data
    return Promise.resolve({ data: [] });
    
    // Uncomment when backend endpoint is ready:
    // return this.request('/analytics/compliance-reports');
  }

  private async getMockAnalyticsData(filter: AnalyticsFilter): Promise<ApiResponse<AnalyticsData>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date();
        const days = filter.timeRange === 'today' ? 1 : 
                    filter.timeRange === 'week' ? 7 : 
                    filter.timeRange === 'month' ? 30 : 90;
        
        // Generate mock trend data
        const trendData = Array.from({ length: days }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (days - 1 - i));
          return {
            date: date.toISOString().split('T')[0],
            captures: Math.floor(Math.random() * 20) + 5
          };
        });

        const totalCaptures = trendData.reduce((sum, item) => sum + item.captures, 0);
        
        resolve({
          data: {
            totalCaptures,
            capturesByType: {
              png: Math.floor(totalCaptures * 0.7),
              pdf: Math.floor(totalCaptures * 0.3)
            },
            capturesByStatus: {
              success: Math.floor(totalCaptures * 0.92),
              failed: Math.floor(totalCaptures * 0.05),
              pending: Math.floor(totalCaptures * 0.03)
            },
            capturesTrend: trendData,
            topUrls: [
              { url: 'https://example.com', count: 45, lastCapture: now.toISOString() },
              { url: 'https://demo.site', count: 32, lastCapture: now.toISOString() },
              { url: 'https://test.app', count: 28, lastCapture: now.toISOString() },
              { url: 'https://sample.org', count: 15, lastCapture: now.toISOString() },
              { url: 'https://mock.io', count: 12, lastCapture: now.toISOString() }
            ],
            storageMetrics: {
              totalSize: 2.4 * 1024 * 1024 * 1024, // 2.4 GB
              averageSize: 1.2 * 1024 * 1024, // 1.2 MB
              fileCount: totalCaptures
            },
            retentionCompliance: {
              compliant: Math.floor(totalCaptures * 0.98),
              nonCompliant: Math.floor(totalCaptures * 0.02),
              total: totalCaptures
            },
            integrityStatus: {
              verified: Math.floor(totalCaptures * 0.95),
              unverified: Math.floor(totalCaptures * 0.03),
              failed: Math.floor(totalCaptures * 0.02),
              total: totalCaptures
            }
          }
        });
      }, 800);
    });
  }

  private async getMockComplianceReport(filter: AnalyticsFilter): Promise<ApiResponse<ComplianceReport>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date();
        const reportId = `report_${Date.now()}`;
        
        resolve({
          data: {
            id: reportId,
            title: `Compliance Report - ${filter.timeRange}`,
            dateRange: {
              start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: now.toISOString()
            },
            totalCaptures: 1247,
            successRate: 92.4,
            integrityRate: 98.2,
            retentionCompliance: 99.1,
            generatedAt: now.toISOString(),
            downloadUrl: `/reports/${reportId}.pdf`
          }
        });
      }, 1200);
    });
  }
}

export const apiClient = new ApiClient();
export { ApiError };