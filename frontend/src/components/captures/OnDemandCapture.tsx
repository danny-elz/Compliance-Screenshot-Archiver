import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { TriggerCaptureRequest, Capture, UrlPreview, ViewportPreset, CaptureOptions } from '@/types';
import { apiClient } from '@/lib/api';
import { 
  Camera, 
  Globe, 
  FileText, 
  Image, 
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Monitor,
  Tablet,
  Smartphone,
  Settings,
  Eye,
  Clock,
  Tag,
  FileIcon,
  Hash,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  Maximize,
  Square,
  X
} from 'lucide-react';

interface OnDemandCaptureProps {
  onCaptureComplete?: (capture: Capture) => void;
}

// Viewport presets
const VIEWPORT_PRESETS: ViewportPreset[] = [
  { name: 'Desktop (1920x1080)', width: 1920, height: 1080, icon: 'Monitor' },
  { name: 'Laptop (1366x768)', width: 1366, height: 768, icon: 'Monitor' },
  { name: 'Tablet (768x1024)', width: 768, height: 1024, icon: 'Tablet' },
  { name: 'Mobile (375x667)', width: 375, height: 667, icon: 'Smartphone' },
  { name: 'Mobile Large (414x896)', width: 414, height: 896, icon: 'Smartphone' },
  { name: 'Custom', width: 0, height: 0, icon: 'Settings' }
];

export function OnDemandCapture({ onCaptureComplete }: OnDemandCaptureProps) {
  const [formData, setFormData] = useState<TriggerCaptureRequest>({
    url: '',
    artifact_type: 'pdf'
  });
  const [captureOptions, setCaptureOptions] = useState<CaptureOptions>({
    viewport_width: 1920,
    viewport_height: 1080,
    wait_until: 'load',
    full_page: true,
    delay: 0,
    tags: [],
    notes: ''
  });
  const [selectedViewport, setSelectedViewport] = useState<ViewportPreset>(VIEWPORT_PRESETS[0]);
  const [customViewport, setCustomViewport] = useState({ width: 1920, height: 1080 });
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureResult, setCaptureResult] = useState<Capture | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [urlPreview, setUrlPreview] = useState<UrlPreview | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  // URL preview functionality
  const debouncedPreviewUrl = useCallback(
    debounce(async (url: string) => {
      if (!url) {
        setUrlPreview(null);
        return;
      }

      try {
        new URL(url); // Validate URL
        setUrlPreview({ status: 'loading' });
        const response = await apiClient.previewUrl(url);
        if (response.data) {
          setUrlPreview(response.data);
        }
      } catch {
        setUrlPreview({ status: 'error', error: 'Invalid URL format' });
      }
    }, 1000),
    []
  );

  useEffect(() => {
    if (formData.url !== previewUrl) {
      setPreviewUrl(formData.url);
      debouncedPreviewUrl(formData.url);
    }
  }, [formData.url, debouncedPreviewUrl, previewUrl]);

  // Handle viewport selection
  const handleViewportChange = (presetName: string) => {
    const preset = VIEWPORT_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setSelectedViewport(preset);
      if (preset.name !== 'Custom') {
        setCaptureOptions(prev => ({
          ...prev,
          viewport_width: preset.width,
          viewport_height: preset.height
        }));
      }
    }
  };

  // Handle custom viewport changes
  const handleCustomViewportChange = (dimension: 'width' | 'height', value: number) => {
    setCustomViewport(prev => ({ ...prev, [dimension]: value }));
    setCaptureOptions(prev => ({
      ...prev,
      [`viewport_${dimension}`]: value
    }));
  };

  // Handle tag management
  const addTag = () => {
    if (tagInput.trim() && !captureOptions.tags.includes(tagInput.trim())) {
      setCaptureOptions(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCaptureOptions(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCaptureResult(null);
    setProgress(0);
    
    if (!formData.url) {
      setError('URL is required');
      return;
    }

    // Validate URL format
    try {
      new URL(formData.url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsCapturing(true);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      // Build complete request with all options
      const captureRequest: TriggerCaptureRequest = {
        ...formData,
        viewport_width: captureOptions.viewport_width,
        viewport_height: captureOptions.viewport_height,
        wait_until: captureOptions.wait_until,
        full_page: captureOptions.full_page,
        delay: captureOptions.delay,
        tags: captureOptions.tags,
        notes: captureOptions.notes
      };

      const response = await apiClient.triggerCapture(captureRequest);

      clearInterval(progressInterval);
      setProgress(100);

      if (response.data) {
        setCaptureResult(response.data);
        onCaptureComplete?.(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capture failed');
    } finally {
      setIsCapturing(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const handleDownload = async (capture: Capture) => {
    try {
      const response = await apiClient.getCaptureDownloadUrl(capture.id);
      if (response.data?.download_url) {
        // Create a temporary link element to trigger download
        const link = document.createElement('a');
        link.href = response.data.download_url;
        link.download = `${capture.id}.${capture.artifact_type}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to get download URL:', err);
    }
  };

  const reset = () => {
    setCaptureResult(null);
    setError('');
    setFormData({ url: '', artifact_type: 'pdf' });
    setCaptureOptions({
      viewport_width: 1920,
      viewport_height: 1080,
      wait_until: 'load',
      full_page: true,
      delay: 0,
      tags: [],
      notes: ''
    });
    setSelectedViewport(VIEWPORT_PRESETS[0]);
    setUrlPreview(null);
    setShowAdvanced(false);
    setTagInput('');
    setProgress(0);
  };

  // Estimated file size calculation (rough estimation)
  const estimateFileSize = () => {
    const baseSize = formData.artifact_type === 'pdf' ? 50 : 200; // KB
    const viewportMultiplier = (captureOptions.viewport_width * captureOptions.viewport_height) / (1920 * 1080);
    const pageMultiplier = captureOptions.full_page ? 2.5 : 1;
    return Math.round(baseSize * viewportMultiplier * pageMultiplier);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="h-5 w-5 text-blue-600" />
          <span>On-Demand Capture</span>
        </CardTitle>
        <CardDescription>
          Instantly capture and archive any webpage for compliance purposes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!captureResult ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL Input with Preview */}
            <div className="space-y-3">
              <Label htmlFor="capture-url" className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span>Target URL</span>
              </Label>
              <Input
                id="capture-url"
                type="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                disabled={isCapturing}
                required
                className="text-base"
              />
              
              {/* URL Preview */}
              {urlPreview && (
                <div className="border rounded-lg p-4 bg-gray-50/50">
                  {urlPreview.status === 'loading' && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading preview...</span>
                    </div>
                  )}
                  
                  {urlPreview.status === 'success' && (
                    <div className="flex items-start space-x-3">
                      {urlPreview.favicon && (
                        <img 
                          src={urlPreview.favicon} 
                          alt="Favicon" 
                          className="w-4 h-4 mt-0.5 flex-shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {urlPreview.title || 'Untitled Page'}
                        </p>
                        {urlPreview.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {urlPreview.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <FileIcon className="h-3 w-3" />
                            <span>~{estimateFileSize()} KB estimated</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    </div>
                  )}
                  
                  {urlPreview.status === 'error' && (
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{urlPreview.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Capture Options Tabs */}
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Options</TabsTrigger>
                <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Format Selection */}
                <div className="space-y-3">
                  <Label>Capture Format</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <label 
                      className={`flex items-center justify-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.artifact_type === 'pdf' 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value="pdf"
                        checked={formData.artifact_type === 'pdf'}
                        onChange={(e) => setFormData({ ...formData, artifact_type: e.target.value as 'pdf' | 'png' })}
                        disabled={isCapturing}
                        className="sr-only"
                      />
                      <FileText className="h-5 w-5 text-red-600" />
                      <div className="text-left">
                        <div className="text-sm font-medium">PDF Document</div>
                        <div className="text-xs text-muted-foreground">Full page, searchable</div>
                      </div>
                    </label>
                    
                    <label 
                      className={`flex items-center justify-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.artifact_type === 'png' 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value="png"
                        checked={formData.artifact_type === 'png'}
                        onChange={(e) => setFormData({ ...formData, artifact_type: e.target.value as 'pdf' | 'png' })}
                        disabled={isCapturing}
                        className="sr-only"
                      />
                      <Image className="h-5 w-5 text-blue-600" />
                      <div className="text-left">
                        <div className="text-sm font-medium">PNG Image</div>
                        <div className="text-xs text-muted-foreground">High quality screenshot</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Viewport Selection */}
                <div className="space-y-3">
                  <Label>Viewport Size</Label>
                  <Select 
                    value={selectedViewport.name} 
                    onValueChange={handleViewportChange}
                    disabled={isCapturing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEWPORT_PRESETS.map((preset) => (
                        <SelectItem key={preset.name} value={preset.name}>
                          <div className="flex items-center space-x-2">
                            {preset.icon === 'Monitor' && <Monitor className="h-4 w-4" />}
                            {preset.icon === 'Tablet' && <Tablet className="h-4 w-4" />}
                            {preset.icon === 'Smartphone' && <Smartphone className="h-4 w-4" />}
                            {preset.icon === 'Settings' && <Settings className="h-4 w-4" />}
                            <span>{preset.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedViewport.name === 'Custom' && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Width (px)</Label>
                        <Input
                          type="number"
                          value={customViewport.width}
                          onChange={(e) => handleCustomViewportChange('width', parseInt(e.target.value) || 0)}
                          disabled={isCapturing}
                          min={320}
                          max={3840}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Height (px)</Label>
                        <Input
                          type="number"
                          value={customViewport.height}
                          onChange={(e) => handleCustomViewportChange('height', parseInt(e.target.value) || 0)}
                          disabled={isCapturing}
                          min={240}
                          max={2160}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Full Page Toggle */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Maximize className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium">Full Page Capture</div>
                      <div className="text-xs text-muted-foreground">Capture entire page content</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={captureOptions.full_page}
                      onChange={(e) => setCaptureOptions(prev => ({ ...prev, full_page: e.target.checked }))}
                      disabled={isCapturing}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-4 mt-4">
                {/* Wait Condition */}
                <div className="space-y-3">
                  <Label>Wait Condition</Label>
                  <Select 
                    value={captureOptions.wait_until} 
                    onValueChange={(value) => setCaptureOptions(prev => ({ ...prev, wait_until: value as any }))}
                    disabled={isCapturing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="load">Page Load (Default)</SelectItem>
                      <SelectItem value="domcontentloaded">DOM Content Loaded</SelectItem>
                      <SelectItem value="networkidle">Network Idle</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Network Idle waits for no network activity for 500ms
                  </p>
                </div>

                {/* Capture Delay */}
                <div className="space-y-3">
                  <Label>Capture Delay</Label>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <Input
                      type="number"
                      value={captureOptions.delay}
                      onChange={(e) => setCaptureOptions(prev => ({ ...prev, delay: parseInt(e.target.value) || 0 }))}
                      disabled={isCapturing}
                      min={0}
                      max={10}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">seconds</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Additional delay after page load before capturing
                  </p>
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <Label>Tags</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Add a tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      disabled={isCapturing}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={addTag}
                      disabled={!tagInput.trim() || isCapturing}
                      size="sm"
                      variant="outline"
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                  {captureOptions.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {captureOptions.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            disabled={isCapturing}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Add capture notes or description..."
                    value={captureOptions.notes}
                    onChange={(e) => setCaptureOptions(prev => ({ ...prev, notes: e.target.value }))}
                    disabled={isCapturing}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {isCapturing && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Capturing webpage...</span>
                  </div>
                  <span className="text-sm font-mono text-blue-700">{progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="space-y-1 text-xs text-blue-800">
                  <p>Format: {formData.artifact_type.toUpperCase()}</p>
                  <p>Viewport: {captureOptions.viewport_width}x{captureOptions.viewport_height}</p>
                  <p>Wait condition: {captureOptions.wait_until}</p>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base" 
              disabled={isCapturing || !formData.url}
              size="lg"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Start Enhanced Capture
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold">Capture Complete!</p>
                <p className="text-sm text-green-600">Successfully captured and archived the webpage</p>
              </div>
            </div>

            {/* Enhanced Results Display */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {urlPreview?.favicon && (
                      <img 
                        src={urlPreview.favicon} 
                        alt="Favicon" 
                        className="w-4 h-4"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {urlPreview?.title || new URL(captureResult.url).hostname}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        {captureResult.url}
                      </p>
                    </div>
                  </div>
                  <Badge variant={captureResult.artifact_type === 'pdf' ? 'destructive' : 'default'}>
                    {captureResult.artifact_type === 'pdf' 
                      ? <FileText className="h-3 w-3 mr-1" />
                      : <Image className="h-3 w-3 mr-1" />
                    }
                    {captureResult.artifact_type.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Capture Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Monitor className="h-4 w-4 text-blue-600" />
                      <span className="text-muted-foreground">Viewport:</span>
                      <span className="font-mono">{captureOptions.viewport_width}×{captureOptions.viewport_height}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-muted-foreground">Captured:</span>
                      <span>{new Date().toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Square className="h-4 w-4 text-blue-600" />
                      <span className="text-muted-foreground">Type:</span>
                      <span>{captureOptions.full_page ? 'Full Page' : 'Viewport Only'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="text-muted-foreground">User:</span>
                      <span>Admin User</span>
                    </div>
                  </div>
                </div>
                
                {/* Tags */}
                {captureOptions.tags.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Tag className="h-4 w-4 text-blue-600" />
                      <span className="text-muted-foreground">Tags:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {captureOptions.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                {captureOptions.notes && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-muted-foreground">Notes:</span>
                    </div>
                    <p className="text-sm bg-gray-50 p-2 rounded border">
                      {captureOptions.notes}
                    </p>
                  </div>
                )}
                
                {/* Technical Details */}
                <div className="pt-2 border-t space-y-1">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    <span>ID: {captureResult.id || captureResult.capture_id}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground font-mono">
                    <Hash className="h-3 w-3" />
                    <span>SHA-256: {captureResult.sha256}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => handleDownload(captureResult)}
                className="h-12"
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Capture
              </Button>
              <Button 
                variant="outline" 
                onClick={reset}
                className="h-12"
                size="lg"
              >
                <Camera className="h-5 w-5 mr-2" />
                Capture Another
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}