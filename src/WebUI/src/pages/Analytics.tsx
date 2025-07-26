import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Users,
  Globe,
  MousePointerClick,
  Smartphone,
  Monitor,
  Tablet,
  Calendar,
  Clock,
  Filter,
  RefreshCw
} from "lucide-react";

// Sample data
const clicksData = [
  { date: "Mon", clicks: 120, unique: 90 },
  { date: "Tue", clicks: 220, unique: 160 },
  { date: "Wed", clicks: 180, unique: 130 },
  { date: "Thu", clicks: 290, unique: 220 },
  { date: "Fri", clicks: 340, unique: 280 },
  { date: "Sat", clicks: 180, unique: 120 },
  { date: "Sun", clicks: 140, unique: 90 },
];

const deviceData = [
  { name: "Desktop", value: 65 },
  { name: "Mobile", value: 30 },
  { name: "Tablet", value: 5 },
];

const browserData = [
  { name: "Chrome", value: 60 },
  { name: "Safari", value: 20 },
  { name: "Firefox", value: 10 },
  { name: "Edge", value: 8 },
  { name: "Other", value: 2 },
];

const locationData = [
  { country: "United States", clicks: 450, percent: 45 },
  { country: "United Kingdom", clicks: 200, percent: 20 },
  { country: "Canada", clicks: 120, percent: 12 },
  { country: "Germany", clicks: 80, percent: 8 },
  { country: "France", clicks: 70, percent: 7 },
  { country: "Others", clicks: 80, percent: 8 },
];

const timeData = [
  { hour: "00:00", clicks: 10 },
  { hour: "02:00", clicks: 5 },
  { hour: "04:00", clicks: 2 },
  { hour: "06:00", clicks: 8 },
  { hour: "08:00", clicks: 25 },
  { hour: "10:00", clicks: 45 },
  { hour: "12:00", clicks: 60 },
  { hour: "14:00", clicks: 58 },
  { hour: "16:00", clicks: 50 },
  { hour: "18:00", clicks: 40 },
  { hour: "20:00", clicks: 30 },
  { hour: "22:00", clicks: 15 },
];

const referrerData = [
  { name: "Direct", value: 40 },
  { name: "Social", value: 25 },
  { name: "Email", value: 20 },
  { name: "Organic", value: 10 },
  { name: "Other", value: 5 },
];

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API fetch
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              asChild
              className="mr-2"
            >
              <Link to="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold">Analytics Dashboard</h1>
              <p className="text-xs text-muted-foreground">Track and analyze your shortened URLs performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={refreshData}
              disabled={isLoading}
              className={isLoading ? "animate-spin" : ""}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">1,470</p>
                    <div className="flex items-center text-xs font-medium text-green-600">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>12.5%</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <MousePointerClick className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unique Visitors</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">890</p>
                    <div className="flex items-center text-xs font-medium text-green-600">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>8.2%</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg. Click Rate</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">32%</p>
                    <div className="flex items-center text-xs font-medium text-red-600">
                      <ArrowDownRight className="h-3 w-3" />
                      <span>2.1%</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Countries</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">26</p>
                    <div className="flex items-center text-xs font-medium text-green-600">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>4 new</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Clicks Over Time */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Clicks Over Time</CardTitle>
            <CardDescription>Total and unique clicks over the selected period</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clicksData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(24, 24, 27, 0.9)', 
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                  }} 
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="clicks" 
                  name="Total Clicks"
                  stroke="#4f46e5" 
                  fill="#4f46e5"
                  fillOpacity={0.3}
                  activeDot={{ r: 6 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="unique" 
                  name="Unique Clicks"
                  stroke="#06b6d4" 
                  fill="#06b6d4"
                  fillOpacity={0.3}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Detailed Analytics Tabs */}
        <Tabs defaultValue="devices" className="space-y-6">
          <TabsList className="h-auto p-1">
            <TabsTrigger value="devices" className="gap-2 px-4">
              <Monitor className="h-4 w-4" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2 px-4">
              <Globe className="h-4 w-4" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="times" className="gap-2 px-4">
              <Clock className="h-4 w-4" />
              Times
            </TabsTrigger>
            <TabsTrigger value="sources" className="gap-2 px-4">
              <Filter className="h-4 w-4" />
              Sources
            </TabsTrigger>
          </TabsList>
          
          {/* Devices Tab */}
          <TabsContent value="devices" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Device Types</CardTitle>
                  <CardDescription>Distribution of clicks by device type</CardDescription>
                </CardHeader>
                <CardContent className="h-80 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip 
                        formatter={(value) => `${value}%`}
                        contentStyle={{ 
                          backgroundColor: 'rgba(24, 24, 27, 0.9)', 
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Browsers</CardTitle>
                  <CardDescription>Distribution of clicks by browser</CardDescription>
                </CardHeader>
                <CardContent className="h-80 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={browserData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {browserData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip 
                        formatter={(value) => `${value}%`}
                        contentStyle={{ 
                          backgroundColor: 'rgba(24, 24, 27, 0.9)', 
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Device Overview</CardTitle>
                  <CardDescription>Summary of device usage statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Monitor className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Desktop</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">65%</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">30%</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Tablet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tablet</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">5%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Countries</CardTitle>
                <CardDescription>Distribution of clicks by country</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={locationData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.2} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="country" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(24, 24, 27, 0.9)', 
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="clicks" name="Clicks" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Countries</CardTitle>
                  <CardDescription>Detailed breakdown by country</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {locationData.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <span>{item.country}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{item.clicks} clicks</span>
                          <Badge variant="secondary">{item.percent}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                  <CardDescription>Visual representation of global reach</CardDescription>
                </CardHeader>
                <CardContent className="h-60 flex items-center justify-center">
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2">Map visualization</Badge>
                    <p className="text-sm text-muted-foreground">
                      Interactive map would be displayed here
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Times Tab */}
          <TabsContent value="times" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Time of Day</CardTitle>
                  <CardDescription>When your links are clicked most</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timeData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.2} />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'rgba(24, 24, 27, 0.9)', 
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="clicks" name="Clicks" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Day of Week</CardTitle>
                  <CardDescription>Which days see the most activity</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={clicksData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.2} />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(24, 24, 27, 0.9)', 
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="clicks" name="Clicks" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Peak Hours</CardTitle>
                  <CardDescription>When your links get the most engagement</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Based on your local timezone</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium text-muted-foreground">Peak Hour</p>
                    <p className="text-2xl font-bold">12:00 PM</p>
                    <p className="text-sm text-muted-foreground">60 clicks/hour</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium text-muted-foreground">Best Day</p>
                    <p className="text-2xl font-bold">Friday</p>
                    <p className="text-sm text-muted-foreground">340 total clicks</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium text-muted-foreground">Most Active Period</p>
                    <p className="text-2xl font-bold">10AM - 2PM</p>
                    <p className="text-sm text-muted-foreground">213 clicks on average</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Sources Tab */}
          <TabsContent value="sources" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                  <CardDescription>Where your clicks are coming from</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={referrerData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {referrerData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip 
                        formatter={(value) => `${value}%`}
                        contentStyle={{ 
                          backgroundColor: 'rgba(24, 24, 27, 0.9)', 
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Top Referrers</CardTitle>
                  <CardDescription>Websites sending traffic to your links</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">1</Badge>
                        <span>Direct / None</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">588 clicks</span>
                        <Badge variant="secondary">40%</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">2</Badge>
                        <span>Facebook</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">220 clicks</span>
                        <Badge variant="secondary">15%</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">3</Badge>
                        <span>Twitter</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">147 clicks</span>
                        <Badge variant="secondary">10%</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">4</Badge>
                        <span>Gmail</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">132 clicks</span>
                        <Badge variant="secondary">9%</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">5</Badge>
                        <span>Instagram</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">102 clicks</span>
                        <Badge variant="secondary">7%</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
} 