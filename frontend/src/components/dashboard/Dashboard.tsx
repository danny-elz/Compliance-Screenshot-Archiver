import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OnDemandCapture } from '@/components/captures/OnDemandCapture';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar, 
  Archive, 
  Camera, 
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react';

interface DashboardStats {
  totalSchedules: number;
  activeSchedules: number;
  totalCaptures: number;
  recentCaptures: number;
  lastCaptureTime?: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSchedules: 0,
    activeSchedules: 0,
    totalCaptures: 0,
    recentCaptures: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setIsLoading(true);
      
      // Load schedules and captures data
      const [schedulesResponse, capturesResponse] = await Promise.all([
        apiClient.getSchedules(),
        apiClient.getCaptures(100)
      ]);

      if (schedulesResponse.data && capturesResponse.data) {
        const schedules = schedulesResponse.data;
        const captures = capturesResponse.data.items;
        
        // Calculate stats
        const now = Date.now() / 1000;
        const last24Hours = now - (24 * 60 * 60);
        
        setStats({
          totalSchedules: schedules.length,
          activeSchedules: schedules.filter(s => s.enabled).length,
          totalCaptures: captures.length,
          recentCaptures: captures.filter(c => c.created_at > last24Hours).length,
          lastCaptureTime: captures.length > 0 
            ? new Date(captures[0].created_at * 1000).toISOString()
            : undefined
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend 
  }: {
    title: string;
    value: string | number;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`p-2 rounded-full ${
            trend === 'up' ? 'bg-green-100' :
            trend === 'down' ? 'bg-red-100' :
            'bg-blue-100'
          }`}>
            <Icon className={`h-5 w-5 ${
              trend === 'up' ? 'text-green-600' :
              trend === 'down' ? 'text-red-600' :
              'text-blue-600'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back{user?.name ? `, ${user.name}` : ''}!
        </h1>
        <p className="text-muted-foreground">
          Monitor your compliance screenshot archiving and capture new content instantly.
        </p>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Schedules"
            value={stats.totalSchedules}
            description={`${stats.activeSchedules} active`}
            icon={Calendar}
            trend="neutral"
          />
          <StatCard
            title="Total Captures"
            value={stats.totalCaptures}
            description="All time"
            icon={Archive}
            trend="up"
          />
          <StatCard
            title="Recent Activity"
            value={stats.recentCaptures}
            description="Last 24 hours"
            icon={Activity}
            trend={stats.recentCaptures > 0 ? "up" : "neutral"}
          />
          <StatCard
            title="System Status"
            value="Operational"
            description="All systems running"
            icon={CheckCircle}
            trend="up"
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* On-Demand Capture */}
        <div className="lg:col-span-2">
          <OnDemandCapture onCaptureComplete={loadDashboardStats} />
        </div>

        {/* Quick Actions & Info */}
        <div className="space-y-6">
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span>System Health</span>
              </CardTitle>
              <CardDescription>Current system status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">API Service</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Capture Engine</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Ready</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Available</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>Latest capture activity</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.lastCaptureTime ? (
                <div className="space-y-2">
                  <p className="text-sm">Last capture completed</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(stats.lastCaptureTime).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">
                    {stats.recentCaptures} captures in the last 24 hours
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No captures yet</p>
                  <p className="text-xs text-muted-foreground">
                    Create a schedule or trigger a capture to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>Compliance</span>
              </CardTitle>
              <CardDescription>Security & compliance status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Object Lock Enabled</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Encryption Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Audit Logging</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">7-Year Retention</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}