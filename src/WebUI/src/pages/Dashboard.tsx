import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
  LogOut
} from "lucide-react";

interface ShortenedUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  createdAt: string;
  clicks: number;
}

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shortenedUrls, setShortenedUrls] = useState<ShortenedUrl[]>([
    {
      id: "1",
      originalUrl: "https://example.com/very-long-url-that-needs-shortening",
      shortCode: "abc123",
      shortUrl: "https://short.ly/abc123",
      createdAt: "2024-01-15T10:30:00Z",
      clicks: 42
    },
    {
      id: "2", 
      originalUrl: "https://another-example.com/another-very-long-url",
      shortCode: "def456",
      shortUrl: "https://short.ly/def456",
      createdAt: "2024-01-14T15:45:00Z",
      clicks: 18
    }
  ]);
  const { toast } = useToast();

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const generateShortCode = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const shortCode = generateShortCode();
    const newUrl: ShortenedUrl = {
      id: Date.now().toString(),
      originalUrl: url,
      shortCode,
      shortUrl: `https://short.ly/${shortCode}`,
      createdAt: new Date().toISOString(),
      clicks: 0,
    };

    setShortenedUrls(prev => [newUrl, ...prev]);
    setUrl("");
    setIsLoading(false);

    toast({
      title: "Success!",
      description: "Your URL has been shortened successfully",
    });
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

  const totalClicks = shortenedUrls.reduce((sum, url) => sum + url.clicks, 0);
  const totalUrls = shortenedUrls.length;

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
            <Button variant="ghost" size="sm" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              John Doe
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
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
                  <p className="text-2xl font-bold">{totalUrls}</p>
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
                  <p className="text-2xl font-bold">{totalClicks}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Avg. Clicks</p>
                  <p className="text-2xl font-bold">
                    {totalUrls > 0 ? Math.round(totalClicks / totalUrls) : 0}
                  </p>
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
            <div className="flex gap-2">
              <Input
                placeholder="Enter your long URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleShorten()}
              />
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
          </CardContent>
        </Card>

        {/* URLs List */}
        {shortenedUrls.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Shortened URLs</h2>
              <Badge variant="secondary" className="text-sm">
                {shortenedUrls.length} {shortenedUrls.length === 1 ? 'URL' : 'URLs'}
              </Badge>
            </div>

            <div className="grid gap-4">
              {shortenedUrls.map((item) => (
                <Card key={item.id} className="shadow-soft hover:shadow-elegant transition-all duration-200">
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
                              {item.shortUrl}
                            </p>
                          </div>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => copyToClipboard(item.shortUrl)}
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
                          <Eye className="h-4 w-4" />
                          <span>{item.clicks} clicks</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 