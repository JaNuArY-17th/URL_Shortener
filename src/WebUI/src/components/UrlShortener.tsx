import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, ExternalLink, Eye, Calendar, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { urlAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { getSocket } from "@/services/api";

interface ShortenedUrl {
  shortCode: string;
  originalUrl: string;
  shortUrl: string;
  createdAt: string;
  clicks?: number;
  uniqueVisitors?: number;
  active?: boolean;
  urlExpanded?: boolean; // Track if original URL is expanded
}

export function UrlShortener() {
  const [url, setUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);
  const [shortenedUrls, setShortenedUrls] = useState<ShortenedUrl[]>([]);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserUrls();
    }
  }, [isAuthenticated, user]);

  // Set up socket listeners for URL click updates
  useEffect(() => {
    const socket = getSocket();
    
    // Listen for redirect events (URL clicks)
    socket.on('url.redirect', (data) => {
      if (data && data.shortCode) {
        // Update the click count for the matching URL
        setShortenedUrls(prevUrls => {
          return prevUrls.map(url => {
            if (url.shortCode === data.shortCode) {
              return { ...url, clicks: (url.clicks || 0) + 1 };
            }
            return url;
          });
        });
      }
    });

    return () => {
      // Clean up listeners on unmount
      socket.off('url.redirect');
    };
  }, []);

  const fetchUserUrls = async () => {
    if (!isAuthenticated || !user?.id) return;

    try {
      setIsLoadingUrls(true);
      // Pass the user ID explicitly to filter URLs belonging to the current user
      const response = await urlAPI.getUrls(1, 5, true, user.id);

      if (response?.data) {
        setShortenedUrls(response.data.map((url: any) => ({
          shortCode: url.shortCode,
          originalUrl: url.originalUrl,
          shortUrl: `https://url-shortener-obve.onrender.com/${url.shortCode}`, // Use API gateway domain
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
      // Call API to shorten URL
      const response = await urlAPI.shorten({
        originalUrl: url,
        expiresAt: expiresAt || undefined,
      });

      // Add new URL to the list
      const newUrl: ShortenedUrl = {
        shortCode: response.shortCode,
        originalUrl: url,
        shortUrl: `https://url-shortener-obve.onrender.com/${response.shortCode}`, // Use API gateway domain
        createdAt: response.createdAt || new Date().toISOString(),
        clicks: 0,
        uniqueVisitors: 0,
        active: true
      };

      // Refresh the URLs list to include the new one with proper user association
      if (isAuthenticated && user?.id) {
        // If user is logged in, fetch updated URLs
        await fetchUserUrls();
      } else {
        // If not logged in, just update the local state
        setShortenedUrls(prev => [newUrl, ...prev]);
      }
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

  const formatDate = (dateString: string) => {
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

  return (
    <div className="space-y-8">
      {/* URL Shortening Form */}
      <Card className="shadow-soft border-0 bg-gradient-secondary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Shorten Your URL
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
              onKeyPress={(e) => e.key === 'Enter' && handleShorten()}
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

      {/* Results Section */}
      {isLoadingUrls ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : shortenedUrls.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Shortened URLs</h2>
            <Badge variant="secondary" className="text-sm">
              {shortenedUrls.length} {shortenedUrls.length === 1 ? 'URL' : 'URLs'}
            </Badge>
          </div>

          <div className="grid gap-4">
            {shortenedUrls.map((item) => (
              <Card key={item.shortCode} className="shadow-soft hover:shadow-elegant transition-all duration-200 animate-fade-in">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* URLs */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-4 w-full">
                        <div className="flex-1 min-w-0 w-full overflow-hidden">
                          <div className="text-sm text-muted-foreground">Original URL</div>
                          <div 
                            className="cursor-pointer max-w-full"
                            onClick={() => toggleUrlExpand(item.shortCode)}
                          >
                            {item.urlExpanded ? (
                              <p className="text-sm font-mono bg-muted px-2 py-1 rounded break-words w-full">
                                {item.originalUrl}
                              </p>
                            ) : (
                              <p className="text-sm truncate font-mono bg-muted px-2 py-1 rounded w-full overflow-hidden text-ellipsis">
                                {item.originalUrl}
                              </p>
                            )}
                          </div>
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
                            https://url-shortener-obve.onrender.com/{item.shortCode}
                          </p>
                        </div>
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

                    {/* Stats */}
                    <div className="flex items-center gap-6 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(item.createdAt)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        {item.clicks || 0} clicks
                      </div>
                      {item.active !== false && (
                        <div className="flex items-center gap-2 text-sm text-success">
                          <TrendingUp className="h-4 w-4" />
                          Active
                        </div>
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