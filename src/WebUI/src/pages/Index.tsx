import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UrlShortener } from "@/components/UrlShortener";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Shield, BarChart3, Globe } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-12">
          <div className="space-y-2">
            <Badge variant="secondary" className="mb-4">
              ✨ Now with real-time analytics
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Shorten URLs.<br />
              <span className="text-foreground">Track Everything.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform long URLs into powerful, trackable short links. Perfect for social media, 
              email campaigns, and analytics.
            </p>
          </div>
        </div>

        {/* URL Shortener */}
        <div className="max-w-4xl mx-auto mb-16">
          <UrlShortener />
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose QuickLink?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our URL shortener provides enterprise-grade features with a simple, 
              intuitive interface that anyone can use.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center shadow-soft hover:shadow-elegant transition-all duration-200 hover:scale-105">
              <CardContent className="p-6">
                <div className="p-3 bg-gradient-primary rounded-full w-fit mx-auto mb-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">
                  Generate short URLs instantly with our optimized infrastructure
                </p>
              </CardContent>
            </Card>

            <Card className="text-center shadow-soft hover:shadow-elegant transition-all duration-200 hover:scale-105">
              <CardContent className="p-6">
                <div className="p-3 bg-gradient-primary rounded-full w-fit mx-auto mb-4">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Secure & Reliable</h3>
                <p className="text-sm text-muted-foreground">
                  Enterprise-grade security with 99.9% uptime guarantee
                </p>
              </CardContent>
            </Card>

            <Card className="text-center shadow-soft hover:shadow-elegant transition-all duration-200 hover:scale-105">
              <CardContent className="p-6">
                <div className="p-3 bg-gradient-primary rounded-full w-fit mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Advanced Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Track clicks, locations, and performance in real-time
                </p>
              </CardContent>
            </Card>

            <Card className="text-center shadow-soft hover:shadow-elegant transition-all duration-200 hover:scale-105">
              <CardContent className="p-6">
                <div className="p-3 bg-gradient-primary rounded-full w-fit mx-auto mb-4">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Custom Domains</h3>
                <p className="text-sm text-muted-foreground">
                  Use your own domain for branded short links
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
