import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Link2, Loader2, Check, X } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// Password validation rules (matching backend constraints)
const passwordRules = [
  {
    id: 'length',
    label: 'At least 8 characters',
    test: (password: string) => password.length >= 8
  },
  {
    id: 'uppercase',
    label: 'At least one uppercase letter',
    test: (password: string) => /[A-Z]/.test(password)
  },
  {
    id: 'number',
    label: 'At least one number',
    test: (password: string) => /[0-9]/.test(password)
  },
  {
    id: 'special',
    label: 'At least one special character',
    test: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }
];

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(
    passwordRules.map(rule => ({ ...rule, valid: false }))
  );
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: OTP Verification
  const [otp, setOtp] = useState("");
  const { toast } = useToast();
  const { sendSignupOtp, verifySignupOtp, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Real-time password validation
    if (name === 'password') {
      validatePassword(value);
    }
  };

  const validatePassword = (password: string) => {
    const updatedValidation = passwordRules.map(rule => ({
      ...rule,
      valid: rule.test(password)
    }));
    setPasswordValidation(updatedValidation);
  };

  // Check if password meets all requirements
  const isPasswordValid = passwordValidation.every(rule => rule.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (!isPasswordValid) {
      const failedRules = passwordValidation.filter(rule => !rule.valid);
      const failedMessages = failedRules.map(rule => rule.label).join(', ');
      toast({
        title: "Password Requirements Not Met",
        description: `Please ensure your password has: ${failedMessages}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await sendSignupOtp(formData.name, formData.email, formData.password);
      if (success) {
        setStep(2); // Move to OTP verification step
      }
    } catch (error) {
      // Error handling is done in sendSignupOtp
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter the complete 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await verifySignupOtp(formData.name, formData.email, formData.password, otp);
      if (success) {
        navigate("/dashboard");
      }
    } catch (error) {
      // Error handling is done in verifySignupOtp
    }
  };

  const handleResendOtp = async () => {
    try {
      await sendSignupOtp(formData.name, formData.email, formData.password);
      setOtp(""); // Clear current OTP
    } catch (error) {
      // Error handling is done in sendSignupOtp
    }
  };

  // Step 2: OTP Verification
  if (step === 2) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
        {/* Back button */}
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setStep(1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Brand logo */}
        <div className="mb-6 flex items-center gap-2">
          <div className="p-2 bg-gradient-primary rounded-lg">
            <Link2 className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            QuickLink
          </h2>
        </div>
        
        <Card className="w-full max-w-md shadow-soft">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
            <CardDescription>
              We've sent a 6-digit verification code to {formData.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                variant="gradient" 
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify & Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive the code?
              </p>
              <Button
                variant="link"
                className="p-0 h-auto text-primary"
                onClick={handleResendOtp}
                disabled={isLoading}
              >
                Resend code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Registration Form
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      {/* Back to home button */}
      <div className="absolute top-4 left-4">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          asChild
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Brand logo */}
      <div className="mb-6 flex items-center gap-2">
        <div className="p-2 bg-gradient-primary rounded-lg">
          <Link2 className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          QuickLink
        </h2>
      </div>
      
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Sign up to start shortening URLs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setShowPasswordRequirements(true)}
                  onBlur={() => setShowPasswordRequirements(false)}
                  className="pl-10 pr-10"
                  autoComplete="new-password"
                  data-1p-ignore
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Password Requirements Indicator */}
              {(showPasswordRequirements || formData.password.length > 0) && (
                <div className="mt-2 p-3 bg-muted/50 rounded-md border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Password Requirements:</p>
                  <div className="space-y-1">
                    {passwordValidation.map((rule) => (
                      <div key={rule.id} className="flex items-center gap-2 text-xs">
                        {rule.valid ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <X className="h-3 w-3 text-red-500" />
                        )}
                        <span className={rule.valid ? "text-green-600" : "text-red-600"}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 pr-10"
                  autoComplete="new-password"
                  data-1p-ignore
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              variant="gradient" 
              disabled={isLoading || !isPasswordValid}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 