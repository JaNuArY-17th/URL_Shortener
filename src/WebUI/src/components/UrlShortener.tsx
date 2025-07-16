import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, ExternalLink, Eye, Calendar, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShortenedUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  createdAt: string;
  clicks: number;
}

export function UrlShortener() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shortenedUrls, setShortenedUrls] = useState<ShortenedUrl[]>([]);
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

      {/* Results Section */}
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
              <Card key={item.id} className="shadow-soft hover:shadow-elegant transition-all duration-200 animate-fade-in">
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
                        <Calendar className="h-4 w-4" />
                        {formatDate(item.createdAt)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        {item.clicks} clicks
                      </div>
                      <div className="flex items-center gap-2 text-sm text-success">
                        <TrendingUp className="h-4 w-4" />
                        Active
                      </div>
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