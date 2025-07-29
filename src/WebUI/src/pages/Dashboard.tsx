import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { urlAPI, analyticsAPI } from "@/services/api";
import { 
  Link2, 
  Copy, 
  ExternalLink, 
  Eye, 
  Calendar, 
  TrendingUp, 
  Plus,
  BarChart3,
  Settings,
  User,
  LogOut,
  Loader2,
  RefreshCw,
  Clock,
  Tag,
  XCircle,
  Check,
  AlertCircle
} from "lucide-react";

interface ShortenedUrl {
  shortCode: string;
  originalUrl: string;
  shortUrl: string;
  createdAt: string;
  clicks: number;
  uniqueVisitors?: number;
  active?: boolean;
  expanded?: boolean;
  details?: {
    metadata?: {
      tags?: string[];
    };
    expiresAt?: string | null;
    lastAccessedAt?: string | null;
    updatedAt?: string;
  };
}

interface AnalyticsSummary {
  totalClicks: number;
  clicksToday: number;
  activeUrls: number;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [url, setUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [showCustomAlias, setShowCustomAlias] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUrls, setIsLoadingUrls] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [shortenedUrls, setShortenedUrls] = useState<ShortenedUrl[]>([]);
  const [stats, setStats] = useState<AnalyticsSummary>({
    totalClicks: 0,
    clicksToday: 0,
    activeUrls: 0
  });
  const { toast } = useToast();

  // Fetch data when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      fetchUrls();
      fetchAnalyticsSummary();
    }
  }, [user]);

  const fetchUrls = async () => {
    try {
      setIsLoadingUrls(true);
      // Pass user ID to get only the current user's URLs
      const response = await urlAPI.getUrls(1, 10, true, user?.id);
      
      if (response?.data) {
        setShortenedUrls(response.data.map((url: any) => ({
          shortCode: url.shortCode,
          originalUrl: url.originalUrl,
          shortUrl: `${window.location.origin}/${url.shortCode}`,
          createdAt: url.createdAt,
          clicks: url.clicks || 0,
          uniqueVisitors: url.uniqueVisitors || 0,
          active: url.active
        })));
      } else {
        setShortenedUrls([]);
      }
    } catch (error) {
      console.error('Error fetching URLs:', error);
      toast({
        title: "Error",
        description: "Failed to load your URLs",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUrls(false);
    }
  };

  const fetchAnalyticsSummary = async () => {
    try {
      setIsLoadingStats(true);
      const response = await analyticsAPI.getSummary();
      
      if (response) {
        setStats({
          totalClicks: response.totalClicks || 0,
          clicksToday: response.clicksToday || 0,
          activeUrls: response.activeUrls || 0
        });
      }
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      // Don't show error toast for analytics to avoid overwhelming the user
    } finally {
      setIsLoadingStats(false);
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleShorten = async () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a URL to shorten",
        variant: "destructive",
      });
      return;
    }

    if (!validateUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (including http:// or https://)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call API to create short URL with proper payload
      const response = await urlAPI.shorten({
        originalUrl: url,
        customAlias: customAlias || undefined,
        expiresAt: expiresAt || undefined
      });
      
      // After successful creation, refresh the URLs list
      await fetchUrls();
      
      // Update URL count in stats
      setStats(prev => ({
        ...prev,
        activeUrls: prev.activeUrls + 1
      }));

      // Reset form
      setUrl("");
      setCustomAlias("");
      setExpiresAt("");
      setShowCustomAlias(false);

      toast({
        title: "Success!",
        description: "Your URL has been shortened successfully",
      });
    } catch (error) {
      console.error('Error shortening URL:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to shorten URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Short URL copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const toggleUrlDetails = async (shortCode: string) => {
    // Find the URL in the list
    const updatedUrls = [...shortenedUrls];
    const urlIndex = updatedUrls.findIndex(u => u.shortCode === shortCode);
    
    if (urlIndex === -1) return;
    
    // Toggle expanded state
    updatedUrls[urlIndex].expanded = !updatedUrls[urlIndex].expanded;
    
    // If expanding and no details available, fetch them
    if (updatedUrls[urlIndex].expanded && !updatedUrls[urlIndex].details) {
      try {
        const response = await urlAPI.getUrl(shortCode);
        
        if (response?.data) {
          updatedUrls[urlIndex].details = {
            metadata: response.data.metadata,
            expiresAt: response.data.expiresAt,
            lastAccessedAt: response.data.lastAccessedAt,
            updatedAt: response.data.updatedAt
          };
        }
      } catch (error) {
        console.error('Error fetching URL details:', error);
        toast({
          title: "Error",
          description: "Failed to load URL details",
          variant: "destructive",
        });
      }
    }
    
    // Update state with expanded/collapsed URLs
    setShortenedUrls(updatedUrls);
  };
  
  // Function to disable a URL
  const handleDisableUrl = async (shortCode: string) => {
    try {
      setIsLoading(true);
      await urlAPI.disableUrl(shortCode);
      
      // Update the URL in the list
      const updatedUrls = shortenedUrls.map(url => {
        if (url.shortCode === shortCode) {
          return { ...url, active: false };
        }
        return url;
      });
      
      setShortenedUrls(updatedUrls);
      
      toast({
        title: "Success",
        description: "URL has been disabled",
      });
    } catch (error) {
      console.error('Error disabling URL:', error);
      toast({
        title: "Error",
        description: "Failed to disable URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to refresh URL cache
  const handleRefreshCache = async (shortCode: string) => {
    try {
      setIsLoading(true);
      await urlAPI.refreshCache(shortCode);
      
      toast({
        title: "Success",
        description: "URL cache has been refreshed",
      });
    } catch (error) {
      console.error('Error refreshing cache:', error);
      toast({
        title: "Error",
        description: "Failed to refresh cache",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to update URL
  const handleUpdateUrl = async (shortCode: string, data: {
    active?: boolean;
    expiresAt?: string | null;
    metadata?: { tags: string[] };
  }) => {
    try {
      setIsLoading(true);
      await urlAPI.updateUrl(shortCode, data);
      
      // Update the URL in the list and refetch to get fresh data
      await fetchUrls();
      
      toast({
        title: "Success",
        description: "URL has been updated",
      });
    } catch (error) {
      console.error('Error updating URL:', error);
      toast({
        title: "Error",
        description: "Failed to update URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Link2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                QuickLink
              </h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              asChild
            >
              <Link to="/analytics">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              asChild
            >
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              asChild
            >
              <Link to="/settings">
                <User className="h-4 w-4" />
                {user?.name || 'Account'}
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total URLs</p>
                  {isLoadingStats ? (
                    <div className="h-8 flex items-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <p className="text-2xl font-bold">{stats.activeUrls}</p>
                  )}
                </div>
                <div className="p-3 bg-gradient-primary rounded-full">
                  <Link2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                  {isLoadingStats ? (
                    <div className="h-8 flex items-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <p className="text-2xl font-bold">{stats.totalClicks}</p>
                  )}
                </div>
                <div className="p-3 bg-gradient-primary rounded-full">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Clicks Today</p>
                  {isLoadingStats ? (
                    <div className="h-8 flex items-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <p className="text-2xl font-bold">{stats.clicksToday}</p>
                  )}
                </div>
                <div className="p-3 bg-gradient-primary rounded-full">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* URL Shortener */}
        <Card className="shadow-soft border-0 bg-gradient-secondary mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Plus className="h-6 w-6 text-primary" />
              Create New Short URL
            </CardTitle>
            <CardDescription>
              Transform long URLs into short, shareable links instantly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4">
              <Input
                placeholder="Enter your long URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full"
                onKeyPress={(e) => e.key === 'Enter' && !showCustomAlias && handleShorten()}
              />
              
              {showCustomAlias && (
                <>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Custom alias:</span>
                    <Input 
                      placeholder="your-custom-code (optional)"
                      value={customAlias}
                      onChange={(e) => setCustomAlias(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Expires at:</span>
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCustomAlias(!showCustomAlias)}
                  className="sm:ml-auto"
                >
                  {showCustomAlias ? "Hide advanced options" : "Advanced options"}
                </Button>
                
                <Button 
                  onClick={handleShorten} 
                  disabled={isLoading}
                  variant="gradient"
                  size="lg"
                  className="min-w-[120px]"
                >
                  {isLoading ? "Shortening..." : "Shorten"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* URLs List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Shortened URLs</h2>
            <div className="flex items-center gap-2">
              {!isLoadingUrls && (
                <Badge variant="secondary" className="text-sm">
                  {shortenedUrls.length} {shortenedUrls.length === 1 ? 'URL' : 'URLs'}
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                asChild
              >
                <Link to="/analytics">
                  <BarChart3 className="h-4 w-4" />
                  View Analytics
                </Link>
              </Button>
            </div>
          </div>

          {isLoadingUrls ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading your URLs...</p>
              </div>
            </div>
          ) : shortenedUrls.length > 0 ? (
            <div className="grid gap-4">
              {shortenedUrls.map((item) => (
                <Card key={item.shortCode} className="shadow-soft hover:shadow-elegant transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* URLs */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-muted-foreground">Original URL</div>
                            <p className="text-sm truncate font-mono bg-muted px-2 py-1 rounded">
                              {item.originalUrl}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(item.originalUrl, '_blank')}
                            className="shrink-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">Short URL</div>
                            <p className="text-lg font-mono text-primary font-semibold">
                              {window.location.origin}/{item.shortCode}
                            </p>
                          </div>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => copyToClipboard(`${window.location.origin}/${item.shortCode}`)}
                            className="shrink-0"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between gap-6 pt-2 border-t">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Eye className="h-4 w-4" />
                            <span>{item.clicks} clicks</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                          {item.active === false ? (
                            <Badge variant="destructive" className="text-xs py-0 h-5 gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Disabled
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-xs py-0 h-5 gap-1">
                              <Check className="h-3 w-3" />
                              Active
                            </Badge>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2 text-xs"
                          onClick={() => toggleUrlDetails(item.shortCode)}
                        >
                          <BarChart3 className="h-3 w-3" />
                          {item.expanded ? 'Hide Details' : 'Show Details'}
                        </Button>
                      </div>

                      {/* Expanded Details Section */}
                      {item.expanded && (
                        <div className="pt-3 mt-2 border-t border-dashed animate-fade-down">
                          <h4 className="text-sm font-medium mb-2">URL Details</h4>
                          
                          {!item.details ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Created</p>
                                <p className="font-medium">{formatDate(item.createdAt)}</p>
                              </div>
                              
                              <div>
                                <p className="text-muted-foreground">Last Updated</p>
                                <p className="font-medium">{formatDate(item.details.updatedAt)}</p>
                              </div>
                              
                              <div>
                                <p className="text-muted-foreground">Expires</p>
                                <p className="font-medium">{item.details.expiresAt ? formatDate(item.details.expiresAt) : 'Never'}</p>
                              </div>
                              
                              <div>
                                <p className="text-muted-foreground">Last Clicked</p>
                                <p className="font-medium">{formatDate(item.details.lastAccessedAt)}</p>
                              </div>
                              
                              <div className="col-span-full">
                                <p className="text-muted-foreground">Tags</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {item.details.metadata?.tags && item.details.metadata.tags.length > 0 ? (
                                    item.details.metadata.tags.map((tag, index) => (
                                      <Badge key={index} variant="outline">{tag}</Badge>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No tags</p>
                                  )}
                                </div>
                              </div>
                              
                                                            <div className="col-span-full mt-2">
                                <div className="flex flex-wrap gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-1 text-xs flex-1"
                                    asChild
                                  >
                                    <Link to={`/analytics?url=${item.shortCode}`}>
                                      <BarChart3 className="h-3 w-3" />
                                      Analytics
                                    </Link>
                                  </Button>
                                  
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-1 text-xs flex-1"
                                    onClick={() => handleRefreshCache(item.shortCode)}
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                    Refresh Cache
                                  </Button>
                                  
                                  {item.active !== false && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="gap-1 text-xs flex-1 text-destructive hover:text-destructive"
                                      onClick={() => handleDisableUrl(item.shortCode)}
                                    >
                                      <XCircle className="h-3 w-3" />
                                      Disable
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              {/* URL Update Form */}
                              <div className="col-span-full mt-4 pt-3 border-t">
                                <h4 className="text-sm font-medium mb-3">Update URL Settings</h4>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-xs text-muted-foreground">Expiration Date</label>
                                    <Input
                                      type="datetime-local"
                                      size="sm"
                                      className="h-8 text-xs mt-1"
                                      defaultValue={item.details?.expiresAt ? new Date(item.details.expiresAt).toISOString().slice(0, 16) : ''}
                                      onChange={(e) => {
                                        // Just store temporarily, will submit on button click
                                        item.details = { 
                                          ...item.details,
                                          expiresAt: e.target.value || null
                                        };
                                      }}
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Tag className="h-3 w-3" />
                                      Tags (comma separated)
                                    </label>
                                    <Input
                                      type="text"
                                      size="sm"
                                      className="h-8 text-xs mt-1"
                                      placeholder="e.g. important, marketing, temporary"
                                      defaultValue={item.details?.metadata?.tags?.join(', ') || ''}
                                      onChange={(e) => {
                                        const tags = e.target.value
                                          .split(',')
                                          .map(tag => tag.trim())
                                          .filter(tag => tag);
                                        
                                        // Just store temporarily
                                        item.details = {
                                          ...item.details,
                                          metadata: {
                                            ...(item.details?.metadata || {}),
                                            tags
                                          }
                                        };
                                      }}
                                    />
                                  </div>
                                  
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    className="gap-1 text-xs w-full"
                                    onClick={() => {
                                      if (!item.details) return;
                                      
                                      handleUpdateUrl(item.shortCode, {
                                        expiresAt: item.details.expiresAt,
                                        metadata: {
                                          tags: item.details.metadata?.tags || []
                                        }
                                      });
                                    }}
                                  >
                                    <Check className="h-3 w-3" />
                                    Save Changes
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border rounded-lg bg-muted/30">
              <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-primary/10 mb-4">
                <Link2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">No URLs found</h3>
              <p className="text-muted-foreground mb-6">
                You haven't created any short URLs yet. Create your first one above.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 