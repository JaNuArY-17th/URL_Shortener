import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Link2,
  ExternalLink,
  Copy,
  Clock,
  Calendar,
  Eye,
  BarChart3,
  Loader2,
  Check,
  XCircle,
  Search,
  Filter,
  RefreshCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { urlAPI, getSocket, connectSocket } from "@/services/api";
import { AuthenticatedHeader } from "@/components/AuthenticatedHeader";

interface ShortenedUrl {
  shortCode: string;
  originalUrl: string;
  shortUrl: string;
  createdAt: string;
  clicks: number;
  uniqueVisitors?: number;
  active?: boolean;
  urlExpanded?: boolean;
}

export default function History() {
  const { user } = useAuth();
  const [urls, setUrls] = useState<ShortenedUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const { toast } = useToast();
  
  const fetchUrls = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch all URLs without active filter to get both active and inactive
      const response = await urlAPI.getUrls(1, 100, undefined, user?.id);
      
      if (response?.data) {
        setUrls(response.data.map((url: ShortenedUrl) => ({
          shortCode: url.shortCode,
          originalUrl: url.originalUrl,
          shortUrl: `https://url-shortener-obve.onrender.com/${url.shortCode}`,
          createdAt: url.createdAt,
          clicks: url.clicks || 0,
          uniqueVisitors: url.uniqueVisitors || 0,
          active: url.active,
          urlExpanded: false
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
      setIsLoading(false);
    }
  }, [user, toast]);
  
  useEffect(() => {
    if (user?.id) {
      fetchUrls();
    }
  }, [user, fetchUrls]);
  
  // Set up websocket connection for real-time updates
  useEffect(() => {
    const socket = getSocket();
    
    // Check if socket is connected
    if (!socket.connected) {
      const token = localStorage.getItem('token');
      if (token) {
        console.log("Connecting socket in History component");
        connectSocket(token);
      }
    }
    
    // Listen for redirect events (URL clicks)
    socket.on('url.redirect', (data) => {
      console.log('History: Received URL click event:', data);
      
      if (data && data.shortCode) {
        // Update the click count for the matching URL
        setUrls(prevUrls => {
          return prevUrls.map(url => {
            if (url.shortCode === data.shortCode) {
              return { 
                ...url, 
                clicks: (url.clicks || 0) + 1 
              };
            }
            return url;
          });
        });
      }
    });

    return () => {
      // Clean up listener on unmount
      socket.off('url.redirect');
      // Note: Don't disconnect the socket as it might be used by other components
    };
  }, []);
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "URL copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const toggleUrlExpand = (shortCode: string) => {
    setUrls(prevUrls => {
      return prevUrls.map(url => {
        if (url.shortCode === shortCode) {
          return { ...url, urlExpanded: !url.urlExpanded };
        }
        return url;
      });
    });
  };
  
  const handleActivateUrl = async (shortCode: string) => {
    try {
      await urlAPI.updateUrl(shortCode, { active: true });
      setUrls(prevUrls => {
        return prevUrls.map(url => {
          if (url.shortCode === shortCode) {
            return { ...url, active: true };
          }
          return url;
        });
      });
      toast({
        title: "Success",
        description: "URL has been activated",
      });
    } catch (error) {
      console.error('Error activating URL:', error);
      toast({
        title: "Error",
        description: "Failed to activate URL",
        variant: "destructive",
      });
    }
  };
  
  const handleDisableUrl = async (shortCode: string) => {
    try {
      await urlAPI.disableUrl(shortCode);
      setUrls(prevUrls => {
        return prevUrls.map(url => {
          if (url.shortCode === shortCode) {
            return { ...url, active: false };
          }
          return url;
        });
      });
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
    }
  };
  
  const handleRefreshCache = async (shortCode: string) => {
    try {
      await urlAPI.refreshCache(shortCode);
      toast({
        title: "Success",
        description: "URL cache has been refreshed",
      });
    } catch (error) {
      console.error('Error refreshing URL cache:', error);
      toast({
        title: "Error",
        description: "Failed to refresh URL cache",
        variant: "destructive",
      });
    }
  };
  
  // Filter and sort URLs
  const filteredUrls = urls.filter(url => {
    // Status filter
    if (statusFilter === "active" && !url.active) return false;
    if (statusFilter === "inactive" && url.active) return false;
    
    // Search term filter
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      return (
        url.shortCode.toLowerCase().includes(term) ||
        url.originalUrl.toLowerCase().includes(term)
      );
    }
    
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "clicks":
        return b.clicks - a.clicks;
      case "createdAt":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "shortCode":
        return a.shortCode.localeCompare(b.shortCode);
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">URL History</h1>
            <p className="text-muted-foreground">View and manage all your shortened URLs</p>
          </div>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
        
        <Card className="mb-8 shadow-soft">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search URLs..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>{statusFilter === "all" ? "All URLs" : statusFilter === "active" ? "Active URLs" : "Inactive URLs"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All URLs</SelectItem>
                  <SelectItem value="active">Active URLs</SelectItem>
                  <SelectItem value="inactive">Inactive URLs</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Sort by {sortBy === "createdAt" ? "Date Created" : sortBy === "clicks" ? "Clicks" : "Short Code"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date Created</SelectItem>
                  <SelectItem value="clicks">Clicks</SelectItem>
                  <SelectItem value="shortCode">Short Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading your URL history...</p>
            </div>
          </div>
        ) : filteredUrls.length > 0 ? (
          <div className="grid gap-4">
            {filteredUrls.map((item) => (
              <Card key={item.shortCode} className={`shadow-soft transition-all duration-200 ${item.active ? 'border-primary/10' : 'border-destructive/10 bg-destructive/5'}`}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={item.active ? "default" : "destructive"}>
                          {item.active ? <Check className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {item.active ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Created: {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => item.active ? handleDisableUrl(item.shortCode) : handleActivateUrl(item.shortCode)}
                        >
                          {item.active ? 
                            <XCircle className="h-3.5 w-3.5" /> : 
                            <Check className="h-3.5 w-3.5" />
                          }
                          {item.active ? "Disable" : "Activate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleRefreshCache(item.shortCode)}
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                          Cache
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link to={`/analytics?shortCode=${item.shortCode}`}>
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                    
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
                            {item.shortUrl}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://url-shortener-obve.onrender.com/${item.shortCode}`, '_blank')}
                            className="shrink-0"
                            disabled={!item.active}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </Button>
                          <Button
                            variant="outline"
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
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Card className="shadow-soft p-8 mx-auto max-w-md">
              <CardContent className="flex flex-col items-center gap-4 p-6">
                <Link2 className="h-12 w-12 text-muted-foreground" />
                <CardTitle>No URLs Found</CardTitle>
                <CardDescription>
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your filters to see more results" 
                    : "You haven't created any shortened URLs yet"}
                </CardDescription>
                <Button asChild>
                  <Link to="/dashboard">Create a URL</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 