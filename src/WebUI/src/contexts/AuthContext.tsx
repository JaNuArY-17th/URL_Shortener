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
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Login failed. Please check your credentials.",
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