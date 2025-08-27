import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Capture, FilterState } from '@/types';
import { apiClient } from '@/lib/api';
import { 
  Archive, 
  Search, 
  Download, 
  Shield, 
  Filter,
  FileText,
  Image,
  Calendar,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Trash2,
  Eye,
  Copy,
  ChevronDown,
  X,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface CapturesListProps {
  onVerifyCapture: (capture: Capture) => void;
}

interface LocalFilterState {
  search: string;
  artifact_type?: 'png' | 'pdf' | '';
  status: string;
  date_from: string;
  date_to: string;
}

export function CapturesList({ onVerifyCapture }: CapturesListProps) {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<LocalFilterState>({
    search: '',
    artifact_type: '',
    status: '',
    date_from: '',
    date_to: ''
  });
  const [selectedCaptures, setSelectedCaptures] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const loadCaptures = async () => {
    try {
      setError('');
      setIsLoading(true);
      const response = await apiClient.getCaptures(50);
      if (response.data) {
        setCaptures(response.data.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load captures');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCaptures();
  }, []);

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

  const filteredCaptures = captures.filter(capture => {
    const matchesSearch = !filters.search || 
      capture.url.toLowerCase().includes(filters.search.toLowerCase()) ||
      capture.id.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesType = !filters.artifact_type || capture.artifact_type === filters.artifact_type;
    const matchesStatus = !filters.status || capture.status === filters.status;
    
    const matchesDateRange = (!filters.date_from || capture.created_at >= new Date(filters.date_from).getTime() / 1000) &&
                           (!filters.date_to || capture.created_at <= new Date(filters.date_to).getTime() / 1000);
    
    return matchesSearch && matchesType && matchesStatus && matchesDateRange;
  });

  const clearFilters = () => {
    setFilters({
      search: '',
      artifact_type: '',
      status: '',
      date_from: '',
      date_to: ''
    });
  };

  const toggleCaptureSelection = (captureId: string) => {
    setSelectedCaptures(prev => 
      prev.includes(captureId) 
        ? prev.filter(id => id !== captureId)
        : [...prev, captureId]
    );
  };

  const toggleAllSelection = () => {
    setSelectedCaptures(prev => 
      prev.length === filteredCaptures.length ? [] : filteredCaptures.map(c => c.id)
    );
  };

  const handleBulkDownload = async () => {
    for (const captureId of selectedCaptures) {
      const capture = captures.find(c => c.id === captureId);
      if (capture) {
        await handleDownload(capture);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getFileTypeIcon = (artifactType: string) => {
    return artifactType === 'pdf' 
      ? <FileText className="h-4 w-4 text-red-600" />
      : <Image className="h-4 w-4 text-blue-600" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading captures...</p>
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
            <Button onClick={loadCaptures} variant="outline" size="sm">
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
          <h2 className="text-2xl font-bold">Capture Archive</h2>
          <p className="text-muted-foreground">
            Browse and manage your compliance screenshot archive
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Captures</CardTitle>
            <CardDescription>
              Filter the archive by URL, date range, or file type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="filter-url">URL Contains</Label>
                <Input
                  id="filter-url"
                  placeholder="Search by URL or ID..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="filter-type">File Type</Label>
                <select
                  id="filter-type"
                  value={filters.artifact_type || ''}
                  onChange={(e) => setFilters({ ...filters, artifact_type: (e.target.value as 'png' | 'pdf') || undefined })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">All Types</option>
                  <option value="pdf">PDF</option>
                  <option value="png">PNG</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-status">Status</Label>
                <select
                  id="filter-status"
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-from">From Date</Label>
                <Input
                  id="filter-from"
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-to">To Date</Label>
                <Input
                  id="filter-to"
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex space-x-2 mt-4">
              <Button onClick={loadCaptures}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredCaptures.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <Archive className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No captures found</h3>
            <p className="text-sm text-muted-foreground text-center">
              {captures.length === 0 
                ? 'No captures have been created yet. Create a schedule or trigger an on-demand capture to start archiving.'
                : 'No captures match your current filters. Try adjusting the filter criteria.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCaptures.length > 0 && (
            <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedCaptures.length === filteredCaptures.length}
                  onChange={toggleAllSelection}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">
                  {selectedCaptures.length > 0 
                    ? `${selectedCaptures.length} of ${filteredCaptures.length} selected`
                    : `${filteredCaptures.length} capture${filteredCaptures.length !== 1 ? 's' : ''}`
                  }
                </span>
              </div>
              
              {selectedCaptures.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkDownload}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Selected ({selectedCaptures.length})
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <div className="grid gap-4">
            {filteredCaptures.map((capture) => (
              <Card key={capture.id} className={selectedCaptures.includes(capture.id) ? "ring-2 ring-primary" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedCaptures.includes(capture.id)}
                        onChange={() => toggleCaptureSelection(capture.id)}
                        className="rounded border-gray-300 mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">
                            {new URL(capture.url).hostname}
                          </span>
                          {getStatusIcon(capture.status)}
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            {capture.status}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground break-all">
                          {capture.url}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(capture.created_at * 1000), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            {getFileTypeIcon(capture.artifact_type)}
                            <span>{capture.artifact_type.toUpperCase()}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1 font-mono">
                            <Shield className="h-3 w-3" />
                            <span>{capture.sha256.substring(0, 12)}...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onVerifyCapture(capture)}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Verify
                      </Button>
                      
                      {capture.status === 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => handleDownload(capture)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}