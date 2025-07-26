import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Link2, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsSubmitted(true);
      toast({
        title: "Success",
        description: "Password reset instructions have been sent to your email",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      {/* Back to Login button */}
      <div className="absolute top-4 left-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2"
          asChild
        >
          <Link to="/login">
            <ArrowLeft className="h-4 w-4" />
            Back to Login
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
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            {!isSubmitted 
              ? "Enter your email to receive password reset instructions" 
              : "Check your email for reset instructions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                variant="gradient"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Reset Instructions"}
              </Button>
              
              <div className="text-center mt-4">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
                  Remember your password? Sign in
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6 py-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 flex items-center justify-center rounded-full">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  We've sent password reset instructions to:
                </p>
                <p className="font-medium">{email}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please check your email inbox and follow the instructions to reset your password.
                </p>
              </div>
              
              <div className="pt-2">
                <Button variant="outline" asChild className="mt-2">
                  <Link to="/login">Return to Login</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 