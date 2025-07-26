import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Lock,
  Bell,
  Globe,
  Shield,
  CreditCard,
  Save,
  Link2,
  ArrowLeft,
  Trash2,
  LogOut
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    company: "",
    website: ""
  });
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    marketingEmails: false,
    urlCreationEmails: true,
    browserNotifications: false,
  });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handlePreferenceChange = (key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Success",
      description: "Your profile has been updated",
    });
    
    setIsSaving(false);
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
              <h1 className="text-xl font-bold">Account Settings</h1>
              <p className="text-xs text-muted-foreground">Manage your preferences and account details</p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <div className="flex overflow-x-auto pb-2 -mx-4 px-4">
            <TabsList className="h-auto p-1 flex">
              <TabsTrigger value="profile" className="gap-2 px-4">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2 px-4">
                <Lock className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2 px-4">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="domains" className="gap-2 px-4">
                <Globe className="h-4 w-4" />
                Domains
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-2 px-4">
                <CreditCard className="h-4 w-4" />
                Billing
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and how we can contact you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name"
                      name="name"
                      placeholder="Your name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Your email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company (Optional)</Label>
                    <Input 
                      id="company"
                      name="company"
                      placeholder="Your company"
                      value={profileForm.company}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input 
                      id="website"
                      name="website"
                      placeholder="Your website"
                      value={profileForm.website}
                      onChange={handleProfileChange}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveProfile} 
                    className="gap-2"
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input 
                      id="currentPassword"
                      type="password"
                      placeholder="Enter your current password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword"
                      type="password"
                      placeholder="Enter your new password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your new password"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button className="gap-2">
                    <Shield className="h-4 w-4" />
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">Two-factor authentication</h4>
                      <Badge variant="outline" className="text-xs">Recommended</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  Manage how we email you about your account activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-medium">Email notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive emails about your account activity
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-medium">URL Creation emails</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications when new short URLs are created
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.urlCreationEmails}
                      onCheckedChange={(checked) => handlePreferenceChange('urlCreationEmails', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-medium">Marketing emails</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive emails about new features and tips
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.marketingEmails}
                      onCheckedChange={(checked) => handlePreferenceChange('marketingEmails', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Browser Notifications</CardTitle>
                <CardDescription>
                  Manage push notifications in your browser
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-medium">Push notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when someone clicks your links
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.browserNotifications}
                    onCheckedChange={(checked) => handlePreferenceChange('browserNotifications', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Domains Tab */}
          <TabsContent value="domains" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Domains</CardTitle>
                <CardDescription>
                  Use your own domain for branded short links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-dashed rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Link2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No custom domains added</p>
                      <p className="text-xs text-muted-foreground">
                        Add your own domain to create branded short links
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">Add Domain</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  You are currently on the free plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold">Free Plan</h3>
                      <p className="text-sm text-muted-foreground">Basic URL shortening</p>
                    </div>
                    <Badge>Current</Badge>
                  </div>
                  <ul className="space-y-2 mb-4">
                    <li className="text-sm flex items-center gap-2">
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Up to 50 links per month
                    </li>
                    <li className="text-sm flex items-center gap-2">
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Basic analytics
                    </li>
                    <li className="text-sm flex items-center gap-2">
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      7-day link history
                    </li>
                  </ul>
                  <Button className="w-full" variant="gradient">Upgrade to Pro</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Danger Zone */}
        <div className="mt-10">
          <h3 className="text-lg font-medium mb-4">Danger Zone</h3>
          <Card className="border-destructive/50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="font-medium text-destructive">Delete Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all your data
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={logout}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 