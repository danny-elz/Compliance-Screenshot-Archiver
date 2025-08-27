import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreateScheduleRequest, Schedule } from '@/types';
import { apiClient } from '@/lib/api';
import { AlertCircle, Clock, Globe, Settings } from 'lucide-react';

interface ScheduleFormProps {
  schedule?: Schedule;
  onSuccess: (schedule: Schedule) => void;
  onCancel: () => void;
}

export function ScheduleForm({ schedule, onSuccess, onCancel }: ScheduleFormProps) {
  const [formData, setFormData] = useState<CreateScheduleRequest & { enabled: boolean }>({
    url: schedule?.url || '',
    cron: schedule?.cron || '0 9 * * *', // 9 AM daily
    artifact_type: schedule?.artifact_type || 'pdf',
    viewport_width: schedule?.viewport_width || 1280,
    viewport_height: schedule?.viewport_height || 800,
    enabled: schedule?.enabled ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!formData.url) {
        throw new Error('URL is required');
      }

      // Validate URL format
      try {
        new URL(formData.url);
      } catch {
        throw new Error('Please enter a valid URL');
      }

      // For now, only creating schedules is supported by the backend
      const response = await apiClient.createSchedule(formData);

      if (response.data) {
        onSuccess(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonCronOptions = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Daily at 9 AM', value: '0 9 * * *' },
    { label: 'Daily at 6 PM', value: '0 18 * * *' },
    { label: 'Weekly on Monday at 9 AM', value: '0 9 * * 1' },
    { label: 'Monthly on 1st at 9 AM', value: '0 9 1 * *' },
  ];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>{schedule ? 'Edit Schedule' : 'Create Schedule'}</span>
        </CardTitle>
        <CardDescription>
          Configure automated webpage captures for compliance archiving
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="url" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Target URL</span>
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-muted-foreground">
              The webpage URL to capture for compliance archiving
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Schedule</span>
            </Label>
            <div className="space-y-2">
              {commonCronOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2 p-2 rounded border cursor-pointer hover:bg-accent"
                >
                  <input
                    type="radio"
                    name="cron_preset"
                    value={option.value}
                    checked={formData.cron === option.value}
                    onChange={(e) => setFormData({ ...formData, cron: e.target.value })}
                    disabled={isSubmitting}
                    className="text-primary"
                  />
                  <span className="text-sm">{option.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {option.value}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-2">
              <Label htmlFor="custom_cron" className="text-xs">Custom Cron Expression</Label>
              <Input
                id="custom_cron"
                placeholder="0 9 * * *"
                value={formData.cron}
                onChange={(e) => setFormData({ ...formData, cron: e.target.value })}
                disabled={isSubmitting}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: minute hour day month day-of-week (0-6, Sunday=0)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Capture Format</Label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="artifact_type"
                  value="pdf"
                  checked={formData.artifact_type === 'pdf'}
                  onChange={(e) => setFormData({ ...formData, artifact_type: e.target.value as 'pdf' | 'png' })}
                  disabled={isSubmitting}
                  className="text-primary"
                />
                <span className="text-sm">PDF (Full Page)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="artifact_type"
                  value="png"
                  checked={formData.artifact_type === 'png'}
                  onChange={(e) => setFormData({ ...formData, artifact_type: e.target.value as 'pdf' | 'png' })}
                  disabled={isSubmitting}
                  className="text-primary"
                />
                <span className="text-sm">PNG (Screenshot)</span>
              </label>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              disabled={isSubmitting}
              className="text-primary"
            />
            <Label htmlFor="enabled">Enable schedule</Label>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting 
                ? (schedule ? 'Updating...' : 'Creating...') 
                : (schedule ? 'Update Schedule' : 'Create Schedule')
              }
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}