import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { analyticsAPI, urlAPI } from "@/services/api";
import { getSocket } from "@/services/api";
import { AuthenticatedHeader } from "@/components/AuthenticatedHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  BarChart4,
  LineChart,
  PieChart,
  Calendar,
  Download,
  ArrowLeft,
  ExternalLink,
  Clock,
  MapPin,
  Globe,
  Eye,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define types for our API responses
interface AnalyticsSummary {
  totalClicks: number;
  clicksToday: number;
  activeUrls: number;
  uniqueVisitors: number;
  topReferrers?: { source: string, count: number }[];
  topLocations?: { location: string, count: number }[];
}

interface TimeseriesData {
  labels: string[];
  clicks: number[];
  uniqueVisitors: number[];
}

interface UrlAnalytics {
  shortCode: string;
  originalUrl: string;
  clicks: number;
  uniqueVisitors: number;
  createdAt: string;
  lastAccessedAt: string | null;
  referrers: { source: string, count: number }[];
  browsers: { name: string, count: number }[];
  devices: { type: string, count: number }[];
  locations: { country: string, count: number }[];
  clicksByDay: { date: string, clicks: number }[];
}

interface AnalyticsFilters {
  period: string;
  startDate?: string;
  endDate?: string;
  shortCode?: string;
}

const Analytics = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Get shortCode from URL query parameter if present
  const urlParams = new URLSearchParams(location.search);
  const shortCodeParam = urlParams.get('url') || undefined;

  // States for various data
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesData | null>(null);
  const [urlAnalytics, setUrlAnalytics] = useState<UrlAnalytics | null>(null);
  const [overview, setOverview] = useState<any>(null);

  // States for URL and filters
  const [selectedShortCode, setSelectedShortCode] = useState<string | undefined>(shortCodeParam);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    period: 'week',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    endDate: new Date().toISOString().split('T')[0], // Today
  });

  // State for available URLs to select
  const [availableUrls, setAvailableUrls] = useState<{ shortCode: string, originalUrl: string }[]>([]);
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);

  // Function to fetch all analytics data
  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Fetch summary
      const summaryData = await analyticsAPI.getSummary();
      setSummary(summaryData);

      // Fetch overview data with period filter
      const overviewData = await analyticsAPI.getOverview(filters.period);
      setOverview(overviewData);

      // Fetch timeseries data
      try {
        const timeseriesData = await analyticsAPI.getClicksTimeseries({
          period: filters.period,
          shortCode: selectedShortCode
        });
        setTimeseries(timeseriesData);
        console.log("Timeseries data:", timeseriesData);
      } catch (error) {
        console.error("Failed to fetch timeseries data", error);
      }

      // If a shortCode is selected, fetch detailed analytics for that URL
      if (selectedShortCode) {
        try {
          const urlAnalyticsData = await analyticsAPI.getUrlAnalytics(selectedShortCode, filters.period);
          setUrlAnalytics(urlAnalyticsData);
          console.log("URL analytics data:", urlAnalyticsData);

          // Auto-switch to URL tab if a specific URL was requested
          if (shortCodeParam && activeTab === "overview") {
            setActiveTab("url");
          }
        } catch (error) {
          console.error("Failed to fetch URL analytics", error);
        }
      }
    } catch (error) {
      console.error("Failed to fetch analytics data", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
      } finally {
        setIsLoading(false);
      }
    };

  // Function to fetch available URLs for the dropdown
  const fetchAvailableUrls = async () => {
    setIsLoadingUrls(true);
    try {
      const response = await urlAPI.getUrls(1, 100, true);
      if (response?.data) {
        setAvailableUrls(response.data.map((url: any) => ({
          shortCode: url.shortCode,
          originalUrl: url.originalUrl
        })));
      }
    } catch (error) {
      console.error("Failed to fetch URLs", error);
    } finally {
      setIsLoadingUrls(false);
    }
  };

  // Function to handle URL selection change
  const handleUrlChange = (shortCode: string) => {
    setSelectedShortCode(shortCode);
    // Update URL with the selected shortCode
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('url', shortCode);
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  // Function to handle period filter change
  const handlePeriodChange = (period: string) => {
    setFilters({ ...filters, period });
  };

  // Function to handle date range filter change
  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setFilters({ ...filters, startDate, endDate });
  };

  // Function to export analytics data
  const handleExportAnalytics = async (format: 'csv' | 'json' | 'xlsx') => {
    try {
      const blob = await analyticsAPI.exportAnalytics({
        shortCode: selectedShortCode,
        startDate: filters.startDate,
        endDate: filters.endDate,
        format
      });

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${selectedShortCode || 'all'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Analytics data exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Failed to export analytics", error);
      toast({
        title: "Error",
        description: "Failed to export analytics data",
        variant: "destructive"
      });
    }
  };

  // Effect to load initial data
  useEffect(() => {
    fetchAnalyticsData();
    fetchAvailableUrls();
  }, []);

  // Effect to reload data when filters or selected URL changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [filters.period, selectedShortCode]);

  // Set up socket listeners for URL click updates
  useEffect(() => {
    const socket = getSocket();

    // Listen for redirect events (URL clicks)
    socket.on('url.redirect', (data) => {
      if (data && data.shortCode) {
        // Update the overview stats
        setOverview(prev => {
          if (!prev) return prev;

          const updatedSummary = {
            ...prev.summary,
            totalClicks: prev.summary.totalClicks + 1
          };

          // Update top URLs if this URL is in the list
          const updatedTopUrls = prev.topUrls.map(url => {
            if (url.shortCode === data.shortCode) {
              return {
                ...url,
                clicks: url.clicks + 1,
                lastAccessedAt: new Date().toISOString()
              };
            }
            return url;
          });

          return {
            ...prev,
            summary: updatedSummary,
            topUrls: updatedTopUrls
          };
        });

        // Update specific URL details if currently viewing that URL
        if (selectedShortCode && selectedShortCode === data.shortCode) {
          setUrlAnalytics(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              clicks: (prev.clicks || 0) + 1,
              lastAccessedAt: new Date().toISOString()
            };
          });
        }
      }
    });

    return () => {
      // Clean up listeners on unmount
      socket.off('url.redirect');
    };
  }, [selectedShortCode]);

  // Helper function to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold">Analytics</h1>

          <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 w-full md:w-auto">
            <div className="flex-1 md:flex-initial">
              <Select
                value={filters.period}
                onValueChange={handlePeriodChange}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 md:flex-initial">
              <Select
                value={selectedShortCode}
                onValueChange={handleUrlChange}
                disabled={isLoadingUrls}
              >
                <SelectTrigger className="h-9 min-w-[200px]">
                  <SelectValue placeholder="All URLs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={undefined}>All URLs</SelectItem>
                  {availableUrls.map((url) => (
                    <SelectItem key={url.shortCode} value={url.shortCode}>
                      {url.shortCode} - {url.originalUrl.substring(0, 20)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => handleExportAnalytics('csv')}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clicks">Click Analytics</TabsTrigger>
            <TabsTrigger value="url" disabled={!selectedShortCode}>URL Details</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex justify-center items-center h-60">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="shadow-soft">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Clicks</p>
                          <p className="text-3xl font-bold">{summary?.totalClicks || 0}</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Eye className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-soft">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Today's Clicks</p>
                          <p className="text-3xl font-bold">{summary?.clicksToday || 0}</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-soft">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Active URLs</p>
                          <p className="text-3xl font-bold">{summary?.activeUrls || 0}</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full">
                          <LineChart className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-soft">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Unique Visitors</p>
                          <p className="text-3xl font-bold">{summary?.uniqueVisitors || 0}</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full">
                          <PieChart className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Overview Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Top Locations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {summary?.topLocations?.length ? (
                        <ul className="space-y-2">
                          {summary.topLocations.slice(0, 5).map((location, index) => (
                            <li key={index} className="flex justify-between items-center">
                              <span>{location.location || 'Unknown'}</span>
                              <Badge variant="outline">{location.count} clicks</Badge>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No location data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Top Referrers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {summary?.topReferrers?.length ? (
                        <ul className="space-y-2">
                          {summary.topReferrers.slice(0, 5).map((referrer, index) => (
                            <li key={index} className="flex justify-between items-center">
                              <span>{referrer.source || 'Direct'}</span>
                              <Badge variant="outline">{referrer.count} clicks</Badge>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No referrer data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Raw JSON preview for debugging */}
                {/* <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle>Raw Overview Data</CardTitle>
                    <CardDescription>For development purposes</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-60 overflow-auto">
                    <pre className="text-xs">
                      {JSON.stringify(overview, null, 2)}
                    </pre>
                  </CardContent>
                </Card> */}
              </TabsContent>

              {/* CLICKS TAB */}
              <TabsContent value="clicks" className="space-y-4">
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle>Click Timeseries</CardTitle>
                    <CardDescription>
                      {selectedShortCode ? `Analytics for /${selectedShortCode}` : 'Analytics for all URLs'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {timeseries?.labels?.length ? (
                      <div className="h-80">
                        {/* 
                        In a real app, render a chart here using Chart.js, Recharts, or another library
                        For now, we'll just show the raw data 
                        */}
                        <div className="overflow-auto max-h-full">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Date</th>
                                <th className="text-right p-2">Clicks</th>
                                <th className="text-right p-2">Unique Visitors</th>
                              </tr>
                            </thead>
                            <tbody>
                              {timeseries.labels.map((label, index) => (
                                <tr key={index} className="border-b hover:bg-muted/30">
                                  <td className="p-2">{label}</td>
                                  <td className="text-right p-2">{timeseries.clicks[index]}</td>
                                  <td className="text-right p-2">{timeseries.uniqueVisitors[index]}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
          </div>
        ) : (
                      <div className="h-40 flex items-center justify-center">
                        <p className="text-muted-foreground">No click data available for the selected period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-soft">
            <CardHeader>
                      <CardTitle>Export Options</CardTitle>
            </CardHeader>
            <CardContent>
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">Start Date</label>
                            <Input
                              type="date"
                              value={filters.startDate}
                              onChange={(e) => handleDateRangeChange(e.target.value, filters.endDate || '')}
                            />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">End Date</label>
                            <Input
                              type="date"
                              value={filters.endDate}
                              onChange={(e) => handleDateRangeChange(filters.startDate || '', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleExportAnalytics('csv')}
                          >
                            <Download className="h-4 w-4" />
                            CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleExportAnalytics('json')}
                          >
                            <Download className="h-4 w-4" />
                            JSON
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleExportAnalytics('xlsx')}
                          >
                            <Download className="h-4 w-4" />
                            Excel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle>Raw Timeseries Data</CardTitle>
                      <CardDescription>For development purposes</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-60 overflow-auto">
                      <pre className="text-xs">
                        {JSON.stringify(timeseries, null, 2)}
              </pre>
                    </CardContent>
                  </Card> */}
                </div>
              </TabsContent>

              {/* URL DETAILS TAB */}
              <TabsContent value="url" className="space-y-4">
                {urlAnalytics ? (
                  <>
                    <Card className="shadow-soft">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="default">/{urlAnalytics.shortCode}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => window.open(urlAnalytics.originalUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Visit Original URL
                          </Button>
                        </div>
                        <p className="text-sm font-mono truncate">{urlAnalytics.originalUrl}</p>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Total Clicks</p>
                            <p className="text-2xl font-bold">{urlAnalytics.clicks}</p>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Unique Visitors</p>
                            <p className="text-2xl font-bold">{urlAnalytics.uniqueVisitors}</p>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="text-sm font-medium">{formatDate(urlAnalytics.createdAt).split(',')[0]}</p>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Last Click</p>
                            <p className="text-sm font-medium">{formatDate(urlAnalytics.lastAccessedAt).split(',')[0]}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="shadow-soft">
                        <CardHeader>
                          <CardTitle className="text-base">Referrers</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {urlAnalytics.referrers?.length ? (
                            <ul className="space-y-2">
                              {urlAnalytics.referrers.slice(0, 5).map((referrer, index) => (
                                <li key={index} className="flex justify-between items-center">
                                  <span className="truncate max-w-[70%]">{referrer.source || 'Direct'}</span>
                                  <Badge variant="outline">{referrer.count} clicks</Badge>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground text-center py-4">No referrer data available</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="shadow-soft">
                        <CardHeader>
                          <CardTitle className="text-base">Locations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {urlAnalytics.locations?.length ? (
                            <ul className="space-y-2">
                              {urlAnalytics.locations.slice(0, 5).map((location, index) => (
                                <li key={index} className="flex justify-between items-center">
                                  <span>{location.country || 'Unknown'}</span>
                                  <Badge variant="outline">{location.count} clicks</Badge>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground text-center py-4">No location data available</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="shadow-soft">
                        <CardHeader>
                          <CardTitle className="text-base">Browsers</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {urlAnalytics.browsers?.length ? (
                            <ul className="space-y-2">
                              {urlAnalytics.browsers.slice(0, 5).map((browser, index) => (
                                <li key={index} className="flex justify-between items-center">
                                  <span>{browser.name || 'Unknown'}</span>
                                  <Badge variant="outline">{browser.count} clicks</Badge>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground text-center py-4">No browser data available</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="shadow-soft">
                        <CardHeader>
                          <CardTitle className="text-base">Devices</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {urlAnalytics.devices?.length ? (
                            <ul className="space-y-2">
                              {urlAnalytics.devices.slice(0, 5).map((device, index) => (
                                <li key={index} className="flex justify-between items-center">
                                  <span>{device.type || 'Unknown'}</span>
                                  <Badge variant="outline">{device.count} clicks</Badge>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground text-center py-4">No device data available</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="shadow-soft">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Daily Clicks
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {urlAnalytics.clicksByDay?.length ? (
                          <div className="h-60">
                            {/* 
                            In a real app, render a chart here using Chart.js, Recharts, or another library
                            For now, we'll just show the raw data 
                            */}
                            <div className="overflow-auto max-h-full">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-2">Date</th>
                                    <th className="text-right p-2">Clicks</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {urlAnalytics.clicksByDay.map((day, index) => (
                                    <tr key={index} className="border-b hover:bg-muted/30">
                                      <td className="p-2">{new Date(day.date).toLocaleDateString()}</td>
                                      <td className="text-right p-2">{day.clicks}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="h-40 flex items-center justify-center">
                            <p className="text-muted-foreground">No daily click data available</p>
                          </div>
                        )}
            </CardContent>
          </Card>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-60">
                    <p className="text-muted-foreground mb-4">Select a URL to view detailed analytics</p>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("overview")}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Go to Overview
                    </Button>
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics; 