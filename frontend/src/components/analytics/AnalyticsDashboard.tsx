import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import * as Select from '@radix-ui/react-select';
import * as Tabs from '@radix-ui/react-tabs';
import { apiClient } from '@/lib/api';
import { AnalyticsData, AnalyticsFilter, ComplianceReport } from '@/types';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Download, 
  Calendar,
  Database,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Filter,
  ChevronDown
} from 'lucide-react';

// Simple chart components using CSS and SVG
const LineChart = ({ data }: { data: { date: string; captures: number }[] }) => {
  if (!data || data.length === 0) return <div className="text-muted-foreground">No data available</div>;
  
  const maxValue = Math.max(...data.map(d => d.captures));
  const chartHeight = 200;
  const chartWidth = 600;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - (d.captures / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className="w-full overflow-x-auto">
      <svg width={chartWidth} height={chartHeight + 40} className="min-w-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            y1={chartHeight * ratio}
            x2={chartWidth}
            y2={chartHeight * ratio}
            stroke="#f1f5f9"
            strokeWidth={1}
          />
        ))}
        
        {/* Data line */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          points={points}
        />
        
        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * chartWidth;
          const y = chartHeight - (d.captures / maxValue) * chartHeight;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill="#3b82f6"
              className="hover:r-6 transition-all cursor-pointer"
            />
          );
        })}
        
        {/* X-axis labels */}
        {data.map((d, i) => {
          if (i % Math.ceil(data.length / 7) === 0) {
            const x = (i / (data.length - 1)) * chartWidth;
            return (
              <text
                key={i}
                x={x}
                y={chartHeight + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
};

const PieChartComponent = ({ data, colors }: { 
  data: { label: string; value: number }[];
  colors: string[];
}) => {
  if (!data || data.length === 0) return <div className="text-muted-foreground">No data available</div>;
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 80;
  const centerX = 100;
  const centerY = 100;
  
  let currentAngle = -90;
  
  return (
    <div className="flex items-center gap-6">
      <svg width="200" height="200">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const angle = (item.value / total) * 360;
          const startAngle = (currentAngle * Math.PI) / 180;
          const endAngle = ((currentAngle + angle) * Math.PI) / 180;
          
          const x1 = centerX + radius * Math.cos(startAngle);
          const y1 = centerY + radius * Math.sin(startAngle);
          const x2 = centerX + radius * Math.cos(endAngle);
          const y2 = centerY + radius * Math.sin(endAngle);
          
          const largeArcFlag = angle > 180 ? 1 : 0;
          
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');
          
          currentAngle += angle;
          
          return (
            <path
              key={index}
              d={pathData}
              fill={colors[index % colors.length]}
              className="hover:opacity-80 transition-opacity cursor-pointer"
              title={`${item.label}: ${percentage.toFixed(1)}%`}
            />
          );
        })}
      </svg>
      
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-sm">{item.label}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProgressBar = ({ value, max, label, color = 'blue' }: {
  value: number;
  max: number;
  label: string;
  color?: 'blue' | 'green' | 'red' | 'yellow';
}) => {
  const percentage = (value / max) * 100;
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${colorClasses[color]} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

export function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<AnalyticsFilter>({
    timeRange: 'month',
    artifactType: 'all',
    status: 'all',
  });
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [filter]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getAnalytics(filter);
      if (response.data) {
        setAnalyticsData(response.data);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setIsGeneratingReport(true);
      const response = await apiClient.generateComplianceReport(filter);
      if (response.data) {
        // In a real implementation, this would trigger a download
        console.log('Report generated:', response.data);
        // You could show a success toast here
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const timeRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'month', label: 'Last 30 days' },
    { value: 'quarter', label: 'Last 90 days' },
  ];

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend,
    color = 'blue'
  }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'blue' | 'green' | 'red' | 'yellow';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      red: 'bg-red-100 text-red-600',
      yellow: 'bg-yellow-100 text-yellow-600'
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Reporting</h1>
            <p className="text-muted-foreground">Archive analytics and compliance reporting</p>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Analytics Data</h2>
        <p className="text-muted-foreground">Unable to load analytics data at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reporting</h1>
          <p className="text-muted-foreground">Archive analytics and compliance reporting</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Time Range Filter */}
          <Select.Root value={filter.timeRange} onValueChange={(value) => setFilter({ ...filter, timeRange: value })}>
            <Select.Trigger className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white hover:bg-gray-50">
              <Calendar className="h-4 w-4" />
              <Select.Value />
              <ChevronDown className="h-4 w-4" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-white border rounded-md shadow-lg z-50">
                <Select.Viewport>
                  {timeRangeOptions.map((option) => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <Select.ItemText>{option.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          
          {/* Generate Report Button */}
          <Button 
            onClick={generateReport} 
            disabled={isGeneratingReport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isGeneratingReport ? 'Generating...' : 'Export Report'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Captures"
          value={analyticsData.totalCaptures.toLocaleString()}
          subtitle={`${filter.timeRange} period`}
          icon={Database}
          color="blue"
        />
        <MetricCard
          title="Success Rate"
          value={`${((analyticsData.capturesByStatus.success / analyticsData.totalCaptures) * 100).toFixed(1)}%`}
          subtitle={`${analyticsData.capturesByStatus.success} successful`}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Storage Used"
          value={formatBytes(analyticsData.storageMetrics.totalSize)}
          subtitle={`${analyticsData.storageMetrics.fileCount} files`}
          icon={Database}
          color="blue"
        />
        <MetricCard
          title="Compliance Rate"
          value={`${((analyticsData.retentionCompliance.compliant / analyticsData.retentionCompliance.total) * 100).toFixed(1)}%`}
          subtitle="Retention policy"
          icon={Shield}
          color="green"
        />
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <Tabs.Trigger
            value="overview"
            className="px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
          >
            Overview
          </Tabs.Trigger>
          <Tabs.Trigger
            value="compliance"
            className="px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
          >
            Compliance
          </Tabs.Trigger>
          <Tabs.Trigger
            value="details"
            className="px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
          >
            Details
          </Tabs.Trigger>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Content value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Capture Trends */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Capture Trends
                  </CardTitle>
                  <CardDescription>Daily capture activity over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <LineChart data={analyticsData.capturesTrend} />
                </CardContent>
              </Card>
            </div>

            {/* Artifact Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Artifact Types
                </CardTitle>
                <CardDescription>Distribution by file type</CardDescription>
              </CardHeader>
              <CardContent>
                <PieChartComponent
                  data={[
                    { label: 'PNG', value: analyticsData.capturesByType.png },
                    { label: 'PDF', value: analyticsData.capturesByType.pdf }
                  ]}
                  colors={['#3b82f6', '#10b981']}
                />
              </CardContent>
            </Card>
          </div>

          {/* Top URLs */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Most Captured URLs</CardTitle>
              <CardDescription>Frequently captured websites</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topUrls.map((url, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium truncate">{url.url}</p>
                      <p className="text-sm text-muted-foreground">
                        Last captured: {new Date(url.lastCapture).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-blue-600">{url.count}</span>
                      <span className="text-sm text-muted-foreground">captures</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Tabs.Content>

        {/* Compliance Tab */}
        <Tabs.Content value="compliance" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Integrity Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Integrity Verification
                </CardTitle>
                <CardDescription>File integrity status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ProgressBar
                  value={analyticsData.integrityStatus.verified}
                  max={analyticsData.integrityStatus.total}
                  label="Verified Files"
                  color="green"
                />
                <ProgressBar
                  value={analyticsData.integrityStatus.unverified}
                  max={analyticsData.integrityStatus.total}
                  label="Unverified Files"
                  color="yellow"
                />
                <ProgressBar
                  value={analyticsData.integrityStatus.failed}
                  max={analyticsData.integrityStatus.total}
                  label="Verification Failed"
                  color="red"
                />
              </CardContent>
            </Card>

            {/* Retention Compliance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Retention Compliance
                </CardTitle>
                <CardDescription>Policy compliance status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ProgressBar
                  value={analyticsData.retentionCompliance.compliant}
                  max={analyticsData.retentionCompliance.total}
                  label="Policy Compliant"
                  color="green"
                />
                <ProgressBar
                  value={analyticsData.retentionCompliance.nonCompliant}
                  max={analyticsData.retentionCompliance.total}
                  label="Non-Compliant"
                  color="red"
                />
                
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Compliance Status: Good</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    {((analyticsData.retentionCompliance.compliant / analyticsData.retentionCompliance.total) * 100).toFixed(1)}% 
                    of files meet retention policy requirements
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Overview */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Capture Status Distribution</CardTitle>
              <CardDescription>Success and failure rates</CardDescription>
            </CardHeader>
            <CardContent>
              <PieChartComponent
                data={[
                  { label: 'Successful', value: analyticsData.capturesByStatus.success },
                  { label: 'Failed', value: analyticsData.capturesByStatus.failed },
                  { label: 'Pending', value: analyticsData.capturesByStatus.pending }
                ]}
                colors={['#10b981', '#ef4444', '#f59e0b']}
              />
            </CardContent>
          </Card>
        </Tabs.Content>

        {/* Details Tab */}
        <Tabs.Content value="details" className="mt-6">
          <div className="grid gap-6">
            {/* Storage Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Storage Metrics
                </CardTitle>
                <CardDescription>Archive storage statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <Database className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{formatBytes(analyticsData.storageMetrics.totalSize)}</div>
                    <div className="text-sm text-muted-foreground">Total Storage</div>
                  </div>
                  
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{formatBytes(analyticsData.storageMetrics.averageSize)}</div>
                    <div className="text-sm text-muted-foreground">Average File Size</div>
                  </div>
                  
                  <div className="text-center p-6 bg-purple-50 rounded-lg">
                    <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{analyticsData.storageMetrics.fileCount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Files</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Health Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  System Health
                </CardTitle>
                <CardDescription>Current system status indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Capture Success Rate</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      {((analyticsData.capturesByStatus.success / analyticsData.totalCaptures) * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Integrity Verification</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {((analyticsData.integrityStatus.verified / analyticsData.integrityStatus.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Retention Compliance</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      {((analyticsData.retentionCompliance.compliant / analyticsData.retentionCompliance.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">Pending Actions</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">
                      {analyticsData.capturesByStatus.pending}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}