import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/services/api";
import { AuthenticatedHeader } from "@/components/AuthenticatedHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Key,
  Check,
  Save,
  Loader2,
  ArrowLeft,
  UserCircle,
  Calendar
} from "lucide-react";

const Profile = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || ""
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  // Validation errors
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Update form data when user information changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        email: user.email || ""
      });
    }
  }, [user]);

  // Fetch updated profile data
  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      await authAPI.getProfile();
      // The context should update automatically via the token validation system
    } catch (error) {
      console.error("Failed to fetch profile data:", error);
      toast({
        title: "Error",
        description: "Could not load your profile information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile information
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const newErrors = {
      name: profileForm.name.trim() === "" ? "Name is required" : "",
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email) ? "Valid email is required" : "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    };
    
    if (newErrors.name || newErrors.email) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      await authAPI.updateProfile({
        name: profileForm.name,
        email: profileForm.email
      });
      
      toast({
        title: "Success",
        description: "Your profile has been updated",
      });
      
      // Refresh user data
      await fetchProfileData();
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Error",
        description: "Could not update your profile",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Change password
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const newErrors = {
      name: "",
      email: "",
      currentPassword: passwordForm.currentPassword.trim() === "" ? "Current password is required" : "",
      newPassword: passwordForm.newPassword.length < 8 ? "Password must be at least 8 characters" : "",
      confirmPassword: passwordForm.newPassword !== passwordForm.confirmPassword ? "Passwords do not match" : ""
    };
    
    if (newErrors.currentPassword || newErrors.newPassword || newErrors.confirmPassword) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      toast({
        title: "Success",
        description: "Your password has been changed",
      });
      
      // Reset form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error("Failed to change password:", error);
      toast({
        title: "Error",
        description: "Could not update your password. Please check your current password.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedHeader />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">User Profile</h1>

        <div className="max-w-3xl mx-auto">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{user?.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />
                    {user?.email}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile" className="gap-2">
                    <User className="h-4 w-4" />
                    Profile Information
                  </TabsTrigger>
                  <TabsTrigger value="security" className="gap-2">
                    <Key className="h-4 w-4" />
                    Security
                  </TabsTrigger>
                </TabsList>
              </div>

              <CardContent className="p-6">
                <TabsContent value="profile" className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Account Information</h3>
                    </div>

                    <Separator />

                    <div>
                      <dl className="space-y-4 mb-6">
                        <div className="grid grid-cols-3 gap-4">
                          <dt className="text-sm font-medium text-muted-foreground">User ID</dt>
                          <dd className="col-span-2 text-sm">{user?.id}</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                          <dd className="col-span-2 text-sm">{user?.role || "User"}</dd>
                        </div>
                        {(user as any)?.createdAt && (
                          <div className="grid grid-cols-3 gap-4">
                            <dt className="text-sm font-medium text-muted-foreground">Member Since</dt>
                            <dd className="col-span-2 text-sm flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {new Date((user as any).createdAt).toLocaleDateString()}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <h3 className="text-lg font-medium">Edit Profile</h3>
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          placeholder="Your name"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          className={errors.name ? "border-destructive" : ""}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Your email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          className={errors.email ? "border-destructive" : ""}
                        />
                        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                      </div>
                      
                      <Button 
                        type="submit"
                        disabled={isLoading}
                        className="gap-2"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                      </Button>
                    </form>
                  </div>
                </TabsContent>
                
                <TabsContent value="security" className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Change Password</h3>
                    </div>
                    
                    <Separator />
                    
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          placeholder="Your current password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          className={errors.currentPassword ? "border-destructive" : ""}
                        />
                        {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword}</p>}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="New password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className={errors.newPassword ? "border-destructive" : ""}
                        />
                        {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword}</p>}
                      </div>
                      
          <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm new password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          className={errors.confirmPassword ? "border-destructive" : ""}
                        />
                        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                      </div>
                      
                      <Button 
                        type="submit"
                        variant="default" 
                        className="gap-2"
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                        Update Password
                      </Button>
                    </form>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
          </div>
      </div>
    </div>
  );
};

export default Profile; 