import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="p-3 bg-gradient-primary rounded-full mb-6">
        <Link2 className="h-8 w-8 text-white" />
      </div>
      
      <div className="text-center max-w-md">
        <h1 className="text-7xl font-bold mb-2 text-primary">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page not found</h2>
        <p className="text-muted-foreground mb-8">
          Sorry, we couldn't find the page you're looking for. The URL may be misspelled or the page you're looking for is no longer available.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link to={-1 as any}>
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="mt-16 text-sm text-muted-foreground">
        <p>Need help? <Link to="/" className="text-primary hover:underline">Contact Support</Link></p>
      </div>
    </div>
  );
};

export default NotFound;
