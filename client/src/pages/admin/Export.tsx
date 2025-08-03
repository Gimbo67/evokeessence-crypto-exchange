import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Info, Github, Package, AlertCircle, CheckCircle, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/admin/Header';

interface ExportInfo {
  totalFiles: number;
  estimatedSize: number;
  estimatedSizeMB: number;
  fileTypes: { [key: string]: number };
  excludedPatterns: string[];
  lastUpdated: string;
}

export default function AdminExport() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { toast } = useToast();

  // Get export information
  const { data: exportInfo, isLoading, error } = useQuery<ExportInfo>({
    queryKey: ['/api/export', 'info'],
    queryFn: async () => {
      const response = await fetch('/api/export/info');
      if (!response.ok) {
        throw new Error('Failed to fetch export information');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3
  });

  // Download project files
  const downloadProject = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(10);

      const response = await fetch('/api/export/download');
      
      if (!response.ok) {
        throw new Error('Failed to download project files');
      }

      setDownloadProgress(50);

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `evokeessence-crypto-exchange-${new Date().toISOString().split('T')[0]}.zip`;

      setDownloadProgress(80);

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadProgress(100);
      
      toast({
        title: 'Download Complete',
        description: `Project files downloaded as ${filename}`,
      });

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download project files',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Export</h1>
          <p className="text-gray-600">Export your complete project or push to GitHub repository</p>
        </div>

        <div className="grid gap-6">
          {/* GitHub Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                GitHub Integration
              </CardTitle>
              <CardDescription>
                Push your project to GitHub for version control and collaboration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  To push to GitHub, follow the instructions in the <code>GITHUB_SETUP.md</code> file in your project root.
                  This includes creating a repository, configuring Git, and pushing your code.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Quick Setup Steps:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Create a new repository on GitHub</li>
                  <li>Run: <code className="bg-gray-100 px-1 rounded">git remote add origin [your-repo-url]</code></li>
                  <li>Run: <code className="bg-gray-100 px-1 rounded">git add . && git commit -m "Initial commit"</code></li>
                  <li>Run: <code className="bg-gray-100 px-1 rounded">git push -u origin main</code></li>
                </ol>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">
                  Sensitive files are already protected by .gitignore
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Project Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Project Export
              </CardTitle>
              <CardDescription>
                Download a complete ZIP archive of your project files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading export information...</p>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load export information. Please try again.
                  </AlertDescription>
                </Alert>
              )}

              {exportInfo && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{exportInfo.totalFiles}</div>
                      <div className="text-sm text-gray-600">Total Files</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{exportInfo.estimatedSizeMB} MB</div>
                      <div className="text-sm text-gray-600">Estimated Size</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{Object.keys(exportInfo.fileTypes).length}</div>
                      <div className="text-sm text-gray-600">File Types</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{exportInfo.excludedPatterns.length}</div>
                      <div className="text-sm text-gray-600">Excluded Patterns</div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">File Types Included:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(exportInfo.fileTypes)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 10)
                        .map(([ext, count]) => (
                          <Badge key={ext} variant="secondary">
                            {ext === 'no-extension' ? 'no ext' : ext}: {count}
                          </Badge>
                        ))}
                      {Object.keys(exportInfo.fileTypes).length > 10 && (
                        <Badge variant="outline">
                          +{Object.keys(exportInfo.fileTypes).length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Security - Excluded from Export:</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• Environment files (.env*)</div>
                      <div>• Database files (*.sqlite*)</div>
                      <div>• SSL certificates (*.pem, *.key, *.crt)</div>
                      <div>• Service account keys</div>
                      <div>• Node modules and build artifacts</div>
                      <div>• Logs and temporary files</div>
                    </div>
                  </div>

                  {isDownloading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Preparing download...</span>
                        <span className="text-sm text-gray-600">{downloadProgress}%</span>
                      </div>
                      <Progress value={downloadProgress} className="w-full" />
                    </div>
                  )}

                  <Button 
                    onClick={downloadProject} 
                    disabled={isDownloading}
                    className="w-full"
                    size="lg"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    {isDownloading ? 'Preparing Download...' : 'Download Project Files'}
                  </Button>

                  <div className="text-xs text-gray-500 text-center">
                    Last updated: {new Date(exportInfo.lastUpdated).toLocaleString()}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Export Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                What's Included?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-green-600">✓ Included</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Complete source code (frontend + backend)</li>
                    <li>• Database schema and migrations</li>
                    <li>• Configuration files</li>
                    <li>• Documentation (README, setup guides)</li>
                    <li>• Mobile app projects (React Native)</li>
                    <li>• Package.json and dependencies list</li>
                    <li>• TypeScript configuration</li>
                    <li>• Tailwind and Vite configuration</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-red-600">✗ Excluded (Security)</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Environment variables (.env files)</li>
                    <li>• Database files and backups</li>
                    <li>• SSL certificates and private keys</li>
                    <li>• Service account credentials</li>
                    <li>• User session data</li>
                    <li>• Build artifacts and node_modules</li>
                    <li>• Logs and temporary files</li>
                    <li>• Large asset uploads</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}