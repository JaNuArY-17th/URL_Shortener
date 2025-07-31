import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, connectSocket, disconnectSocket } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  sendSignupOtp: (name: string, email: string, password: string) => Promise<boolean>;
  verifySignupOtp: (name: string, email: string, password: string, otpCode: string) => Promise<boolean>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<boolean>;
  logout: () => void;
  validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          // First try to use stored user data
          setUser(JSON.parse(storedUser));
          
          // Then validate the token
          const isValid = await validateToken();
          if (isValid) {
            console.log('Token is valid, connecting socket');
            connectSocket(token);
          } else {
            // If token validation fails, reset user
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            console.log('Token validation failed, removing stored data');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Clear local storage on error
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    return () => {
      // Clean up socket on unmount
      disconnectSocket();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      
      if (response.token && response.user) {
        setUser(response.user);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));

        // Connect socket after successful login
        console.log('Login successful, connecting socket');
        connectSocket(response.token);

        toast({
          title: "Success",
          description: "You have been logged in successfully.",
        });
        return true;
      } else {
        toast({
          title: "Error",
          description: "Login failed. Invalid response from server.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle different status codes
      let errorMessage = "Login failed. Please try again.";
      let errorTitle = "Login Failed";
      
      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message;
        
        switch (status) {
          case 400:
            errorTitle = "Invalid Credentials";
            errorMessage = serverMessage || "Invalid email or password. Please check your credentials.";
            break;
          case 401:
            errorTitle = "Unauthorized";
            errorMessage = serverMessage || "Invalid email or password.";
            break;
          case 403:
            errorTitle = "Access Forbidden";
            errorMessage = serverMessage || "Your account access has been restricted.";
            break;
          case 404:
            errorTitle = "Account Not Found";
            errorMessage = serverMessage || "No account found with this email address.";
            break;
          case 429:
            errorTitle = "Too Many Attempts";
            errorMessage = serverMessage || "Too many login attempts. Please try again later.";
            break;
          case 500:
            errorTitle = "Server Error";
            errorMessage = serverMessage || "Server error occurred. Please try again later.";
            break;
          default:
            errorTitle = "Login Failed";
            errorMessage = serverMessage || `Login failed with status ${status}. Please try again.`;
        }
      } else if (error.request) {
        errorTitle = "Network Error";
        errorMessage = "Unable to connect to server. Please check your internet connection.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await authAPI.register(name, email, password);
      
      if (response.token && response.user) {
        setUser(response.user);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Connect socket after successful registration
        console.log('Registration successful, connecting socket');
        connectSocket(response.token);

        toast({
          title: "Success",
          description: "Your account has been created successfully.",
        });
        return true;
      } else {
        toast({
          title: "Error",
          description: "Registration failed. Invalid response from server.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Registration failed. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const sendSignupOtp = async (name: string, email: string, password: string) => {
    try {
      const response = await authAPI.sendSignupOtp(name, email, password);
      toast({
        title: "Success",
        description: "Verification code sent to your email.",
      });
      return true;
    } catch (error: any) {
      console.error('Send signup OTP error:', error);
      
      // Handle different status codes
      let errorMessage = "Failed to send verification code. Please try again.";
      let errorTitle = "Verification Failed";
      
      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message;
        
        switch (status) {
          case 400:
            errorTitle = "Invalid Information";
            errorMessage = serverMessage || "Please check your information and try again.";
            break;
          case 409:
            errorTitle = "Account Already Exists";
            errorMessage = serverMessage || "An account with this email already exists.";
            break;
          case 429:
            errorTitle = "Too Many Requests";
            errorMessage = serverMessage || "Too many verification requests. Please try again later.";
            break;
          case 500:
            errorTitle = "Server Error";
            errorMessage = serverMessage || "Server error occurred. Please try again later.";
            break;
          default:
            errorTitle = "Verification Failed";
            errorMessage = serverMessage || `Request failed with status ${status}. Please try again.`;
        }
      } else if (error.request) {
        errorTitle = "Network Error";
        errorMessage = "Unable to connect to server. Please check your internet connection.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const verifySignupOtp = async (name: string, email: string, password: string, otpCode: string) => {
    try {
      const response = await authAPI.verifySignupOtp(name, email, password, otpCode);
      
      if (response.token && response.user) {
        setUser(response.user);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Connect socket after successful registration
        console.log('Registration successful, connecting socket');
        connectSocket(response.token);

        toast({
          title: "Success",
          description: "Your account has been created successfully.",
        });
        return true;
      } else {
        toast({
          title: "Error",
          description: "Registration failed. Invalid response from server.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('Verify signup OTP error:', error);
      
      // Handle different status codes
      let errorMessage = "Invalid or expired verification code.";
      let errorTitle = "Verification Failed";
      
      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message;
        
        switch (status) {
          case 400:
            errorTitle = "Invalid Code";
            errorMessage = serverMessage || "Invalid or expired verification code. Please try again.";
            break;
          case 409:
            errorTitle = "Account Already Exists";
            errorMessage = serverMessage || "An account with this email already exists.";
            break;
          case 429:
            errorTitle = "Too Many Attempts";
            errorMessage = serverMessage || "Too many verification attempts. Please try again later.";
            break;
          case 500:
            errorTitle = "Server Error";
            errorMessage = serverMessage || "Server error occurred. Please try again later.";
            break;
          default:
            errorTitle = "Verification Failed";
            errorMessage = serverMessage || `Verification failed with status ${status}. Please try again.`;
        }
      } else if (error.request) {
        errorTitle = "Network Error";
        errorMessage = "Unable to connect to server. Please check your internet connection.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = () => {
    // Disconnect socket when logging out
    console.log('Logging out, disconnecting socket');
    disconnectSocket();
    
    // Clear user data
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
    
    navigate('/login');
  };

  const updateProfile = async (data: { name?: string; email?: string }) => {
    try {
      const response = await authAPI.updateProfile(data);
      if (response.user) {
        setUser(response.user);
        // Update localStorage immediately to reflect changes
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const validateToken = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const response = await authAPI.validateToken(token);
      return response.valid === true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        sendSignupOtp,
        verifySignupOtp,
        updateProfile,
        logout,
        validateToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 