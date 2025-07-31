import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Link2,
  ExternalLink,
  Copy,
  Trash,
  Settings,
  Loader2,
  BarChart3,
  TrendingUp,
  Calendar,
  Eye,
  Check,
  XCircle,
  AlertCircle,
  RefreshCcw,
  ArrowUp,
  History,
  Tag as TagIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { urlAPI, analyticsAPI, getSocket, connectSocket } from "@/services/api";
import { AuthenticatedHeader } from "@/components/AuthenticatedHeader";

interface ShortenedUrl {
  shortCode: string;
  originalUrl: string;
  shortUrl: string;
  createdAt: string;
  clicks: number;
  uniqueVisitors?: number;
  active?: boolean;
  expanded?: boolean;
  urlExpanded?: boolean; // Track if original URL is expanded
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
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
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
  const navigate = useNavigate();

  // Add state for refreshing URLs
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch data when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      // Console log to track user ID for debugging
      console.log("Fetching data for user:", user.id);
      
      fetchUrls();
      fetchAnalyticsSummary();
      
      // Set up socket connection when user is available
      const socket = getSocket();
      
      // Check if socket is connected
      if (!socket.connected) {
        const token = localStorage.getItem('token');
        if (token) {
          console.log("Connecting socket in Dashboard useEffect");
          connectSocket(token);
        }
      }
    }
  }, [user]);

  // Separate useEffect for WebSocket setup to avoid running on every user change
  useEffect(() => {
    const socket = getSocket();
    
    // Check if socket is connected
    if (!socket.connected) {
      const token = localStorage.getItem('token');
      if (token) {
        console.log("Connecting socket in WebSocket useEffect");
        connectSocket(token);
      }
    }
    
    // Listen for redirect events (URL clicks)
    socket.on('url.redirect', (data) => {
      console.log('Received URL click event:', data);
      
      if (data && data.shortCode) {
        // Update the click count for the matching URL
        setShortenedUrls(prevUrls => {
          return prevUrls.map(url => {
            if (url.shortCode === data.shortCode) {
              // Update click count and return updated URL
              return { 
                ...url, 
                clicks: (url.clicks || 0) + 1,
                // If details are loaded, update those too
                details: url.details ? {
                  ...url.details,
                  lastAccessedAt: new Date().toISOString()
                } : url.details
              };
            }
            return url;
          });
        });

        // Update analytics summary
        setStats(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            totalClicks: (prev.totalClicks || 0) + 1,
            clicksToday: (prev.clicksToday || 0) + 1
          };
        });
      }
    });

    return () => {
      // Clean up listeners on unmount
      socket.off('url.redirect');
      // Note: Don't disconnect the socket here as it might be used by other components
    };
  }, []);

  // Remove topUrls state and related functions
  
  const fetchUrls = async () => {
    try {
      setIsLoadingUrls(true);
      // Pass user ID to get only the current user's URLs, limit to 5 most recent
      const response = await urlAPI.getUrls(1, 5, true, user?.id);
      
      if (response?.data) {
        setShortenedUrls(response.data.map((url: any) => ({
          shortCode: url.shortCode,
          originalUrl: url.originalUrl,
          shortUrl: `https://url-shortener-obve.onrender.com/${url.shortCode}`,
          createdAt: url.createdAt,
          clicks: url.clicks || 0,
          uniqueVisitors: url.uniqueVisitors || 0,
          active: url.active
        })));
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
      console.log("Fetching analytics summary for user:", user?.id);
      
      // Log localStorage user and token for debugging
      console.log("localStorage user:", localStorage.getItem('user'));
      console.log("localStorage token exists:", !!localStorage.getItem('token'));
      
      const response = await analyticsAPI.getSummary();
      console.log("Analytics summary response:", response);

      if (response) {
        // Store the stats with defaults to prevent undefined values
        setStats({
          totalClicks: response.totalClicks || 0,
          clicksToday: response.clicksToday || 0,
          activeUrls: response.activeUrls || 0
        });
      }
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      // Set default values on error to avoid undefined
      setStats({
        totalClicks: 0,
        clicksToday: 0,
        activeUrls: 0
      });
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
        expiresAt: expiresAt || undefined,
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
      setExpiresAt("");
      setShowAdvanced(false);

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

  // Function to toggle URL expansion
  const toggleUrlExpand = (shortCode: string) => {
    const updatedUrls = shortenedUrls.map(url => {
      if (url.shortCode === shortCode) {
        return { ...url, urlExpanded: !url.urlExpanded };
      }
      return url;
    });
    setShortenedUrls(updatedUrls);
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

  // Function to refresh all URLs cache
  const refreshAllUrls = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // Refresh the cache for first few URLs
      for (const url of shortenedUrls.slice(0, 5)) {
        await urlAPI.refreshCache(url.shortCode);
      }
      
      toast({
        title: "Cache Refreshed",
        description: "Your URL cache has been refreshed successfully",
      });
    } catch (error) {
      console.error('Error refreshing cache:', error);
      toast({
        title: "Error",
        description: "Failed to refresh URL cache",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AuthenticatedHeader />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">URL Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Manage and track your shortened URLs
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="col-span-1 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Total Clicks</CardTitle>
              <CardDescription>All time clicks on your URLs</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="h-12 flex items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold">{stats.totalClicks}</p>
                  <div className="ml-2 text-sm text-muted-foreground">
                    <span className="text-xs bg-primary/10 text-primary py-0.5 px-1 rounded">
                      {stats.clicksToday} today
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Active URLs</CardTitle>
              <CardDescription>Currently active shortened URLs</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="h-12 flex items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold">{stats.activeUrls}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              <CardDescription>Common URL management tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  className="gap-2 "
                  onClick={() => refreshAllUrls()}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Refresh Cache
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 "
                  asChild
                >
                  <Link to="/analytics">
                    <BarChart3 className="h-4 w-4" />
                    View Analytics
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Your URLs</h2>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <ArrowUp className="h-4 w-4" />
            Back to Top
          </Button>
        </div>

        {/* Create New URL Section */}
        <Card className="mb-8 shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Link2 className="h-6 w-6 text-primary" />
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
                onKeyPress={(e) => e.key === 'Enter' && !showAdvanced && handleShorten()}
              />

              {showAdvanced && (
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Expires at:</span>
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="flex-1"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="sm:ml-auto"
                >
                  {showAdvanced ? "Hide advanced options" : "Advanced options"}
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

        {/* URL List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Your Recent URLs</h3>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-2"
            >
              <Link to="/history">
                <History className="h-4 w-4" />
                View All URLs
              </Link>
            </Button>
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
                        <div className="flex items-center justify-between gap-4 w-full">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="text-sm text-muted-foreground">Original URL</div>
                            <div className="flex items-center">
                              <div
                                className="cursor-pointer flex-1 min-w-0"
                                style={{ maxWidth: "calc(100% - 48px)" }}
                                onClick={() => toggleUrlExpand(item.shortCode)}
                              >
                                <div className="bg-muted rounded px-2 py-1 max-w-full" style={{ maxHeight: item.urlExpanded ? 'none' : '28px' }}>
                                  {item.urlExpanded ? (
                                    <p className="text-sm font-mono break-words">
                                      {item.originalUrl}
                                    </p>
                                  ) : (
                                    <div className="relative">
                                      <p className="text-sm font-mono truncate">
                                        {item.originalUrl.length > 150 ? item.originalUrl.substring(0, 150) : item.originalUrl}
                                        <span className="text-muted-foreground">{item.originalUrl.length > 150 ? '...' : ''}</span>
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(item.originalUrl, '_blank')}
                                className="ml-2 shrink-0 h-8 w-8 flex-none"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">Short URL</div>
                            <p className="text-lg font-mono text-primary font-semibold">
                              https://url-shortener-obve.onrender.com/{item.shortCode}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`https://url-shortener-obve.onrender.com/${item.shortCode}`, '_blank')}
                              className="shrink-0"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Open
                            </Button>
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => copyToClipboard(`https://url-shortener-obve.onrender.com/${item.shortCode}`)}
                              className="shrink-0"
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                          </div>
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
                            <Badge variant="default" className="text-xs py-0 h-5 gap-1">
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
                                    <RefreshCcw className="h-3 w-3" />
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
                                      className="h-8 text-xs mt-1 text-sm"
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
                                      <TagIcon className="h-3 w-3" />
                                      Tags (comma separated)
                                    </label>
                                    <Input
                                      type="text"
                                      className="h-8 text-xs mt-1 text-sm"
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
      </div>
    </div>
  );
} 