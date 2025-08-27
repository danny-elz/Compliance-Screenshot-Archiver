import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Schedule } from '@/types';
import { apiClient } from '@/lib/api';
import { Plus, Calendar, Globe, Play, Pause, Edit, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface SchedulesListProps {
  onCreateSchedule: () => void;
  onEditSchedule: (schedule: Schedule) => void;
}

export function SchedulesList({ onCreateSchedule, onEditSchedule }: SchedulesListProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSchedules = async () => {
    try {
      setError('');
      const response = await apiClient.getSchedules();
      if (response.data) {
        setSchedules(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleToggleSchedule = async (schedule: Schedule) => {
    try {
      setError('');
      await apiClient.updateSchedule(schedule.id, {
        enabled: !schedule.enabled
      });
      // Reload schedules to reflect the change
      await loadSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle schedule');
    }
  };

  const handleDeleteSchedule = async (schedule: Schedule) => {
    if (!confirm(`Are you sure you want to delete the schedule for ${schedule.url}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setError('');
      await apiClient.deleteSchedule(schedule.id);
      // Reload schedules to reflect the change
      await loadSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
    }
  };

  const formatCronDescription = (cronExpression: string): string => {
    // Simple cron parser for common patterns
    const parts = cronExpression.split(' ');
    if (parts.length < 5) return cronExpression;
    
    const [minute, hour, day, month, dayOfWeek] = parts;
    
    if (minute === '0' && hour === '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      return 'Every hour';
    }
    if (day === '*' && month === '*' && dayOfWeek === '*') {
      return `Daily at ${hour}:${minute.padStart(2, '0')}`;
    }
    if (day === '*' && month === '*' && dayOfWeek !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Weekly on ${days[parseInt(dayOfWeek)]} at ${hour}:${minute.padStart(2, '0')}`;
    }
    if (dayOfWeek === '*' && month === '*') {
      return `Monthly on day ${day} at ${hour}:${minute.padStart(2, '0')}`;
    }
    
    return cronExpression;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading schedules...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button onClick={loadSchedules} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Capture Schedules</h2>
          <p className="text-muted-foreground">
            Automated webpage capture schedules for compliance archiving
          </p>
        </div>
        <Button onClick={onCreateSchedule}>
          <Plus className="h-4 w-4 mr-2" />
          New Schedule
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No schedules configured</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create your first capture schedule to start archiving web content automatically.
            </p>
            <Button onClick={onCreateSchedule}>
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className={`${!schedule.enabled ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <CardTitle className="text-sm font-medium truncate">
                      {new URL(schedule.url).hostname}
                    </CardTitle>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    schedule.enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {schedule.enabled ? 'Active' : 'Paused'}
                  </div>
                </div>
                <CardDescription className="text-xs break-all">
                  {schedule.url}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {formatCronDescription(schedule.cron)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-3 h-3 rounded-full ${
                    schedule.artifact_type === 'pdf' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-muted-foreground">
                    {schedule.artifact_type.toUpperCase()} captures
                  </span>
                </div>

                <div className="text-xs text-muted-foreground">
                  Schedule ID: {schedule.id.slice(0, 8)}...
                </div>

                <div className="flex items-center space-x-1 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleSchedule(schedule)}
                    className="flex-1"
                  >
                    {schedule.enabled ? (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditSchedule(schedule)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteSchedule(schedule)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}