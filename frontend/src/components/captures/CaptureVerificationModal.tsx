import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Capture } from '@/types';
import { apiClient } from '@/lib/api';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Download,
  FileText,
  Image,
  Calendar,
  Globe,
  Hash,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface CaptureVerificationModalProps {
  capture: Capture;
  onClose: () => void;
}

export function CaptureVerificationModal({ capture, onClose }: CaptureVerificationModalProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    reason?: string;
    object_lock_verified?: boolean;
  } | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setIsVerifying(true);
    setError('');
    setVerificationResult(null);

    try {
      const response = await apiClient.verifyCapture(capture.sha256);
      if (response.data) {
        setVerificationResult(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownload = async () => {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  const getFileTypeIcon = (artifactType: string) => {
    return artifactType === 'pdf' 
      ? <FileText className="h-5 w-5 text-red-600" />
      : <Image className="h-5 w-5 text-blue-600" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span>Capture Verification</span>
            </CardTitle>
            <CardDescription>
              Verify the integrity and authenticity of this capture
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Capture Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Capture Details</h3>
            
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-medium text-sm">{new URL(capture.url).hostname}</p>
                    <p className="text-xs text-muted-foreground break-all">{capture.url}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium">Captured</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(capture.created_at * 1000), 'MMM d, yyyy h:mm:ss a')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  {getFileTypeIcon(capture.artifact_type)}
                  <div>
                    <p className="text-sm font-medium">File Type</p>
                    <p className="text-xs text-muted-foreground">
                      {capture.artifact_type.toUpperCase()} Document
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hash Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cryptographic Hash</h3>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Hash className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">SHA-256</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(capture.sha256)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <p className="text-xs font-mono bg-white p-2 rounded border break-all">
                {capture.sha256}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This SHA-256 hash uniquely identifies the captured file and can be used to verify its integrity.
              </p>
            </div>
          </div>

          {/* Verification Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Integrity Verification</h3>
              <Button onClick={handleVerify} disabled={isVerifying}>
                {isVerifying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Verify Now
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-700 rounded-lg">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {verificationResult && (
              <div className={`space-y-3`}>
                <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                  verificationResult.verified 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {verificationResult.verified ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {verificationResult.verified ? 'Hash Verification Successful' : 'Hash Verification Failed'}
                    </p>
                    {verificationResult.reason && (
                      <p className="text-xs">{verificationResult.reason}</p>
                    )}
                  </div>
                </div>
                
                {verificationResult.verified && verificationResult.object_lock_verified !== undefined && (
                  <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                    verificationResult.object_lock_verified 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {verificationResult.object_lock_verified ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {verificationResult.object_lock_verified ? 'Object Lock Active' : 'Object Lock Not Found'}
                      </p>
                      <p className="text-xs">
                        {verificationResult.object_lock_verified 
                          ? 'File is protected from modification in S3' 
                          : 'File may not have immutable protection'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm text-blue-900 mb-2">About Integrity Verification</h4>
              <p className="text-xs text-blue-800 mb-2">
                This verification performs two important checks:
              </p>
              <ul className="text-xs text-blue-800 space-y-1 ml-4">
                <li><strong>Hash Verification:</strong> Confirms the SHA-256 hash exists in our database, proving the file's integrity and authenticity.</li>
                <li><strong>Object Lock Check:</strong> Verifies that the file is protected by AWS S3 Object Lock, ensuring immutability for compliance.</li>
              </ul>
              <p className="text-xs text-blue-700 mt-2">
                Both checks together provide comprehensive evidence for regulatory compliance and audit purposes.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {capture.status === 'completed' && (
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}