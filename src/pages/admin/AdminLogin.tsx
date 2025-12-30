import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { isValidEmail } from '@/utils/validation';

// Admin API base URL
const ADMIN_API_URL = import.meta.env.PROD
  ? 'https://admin-api.aivedha.ai'
  : 'https://admin-api.aivedha.ai';

// Allowed admin subdomains
const ALLOWED_ADMIN_HOSTS = [
  'admin.aivedha.ai',
  'localhost',
  '127.0.0.1',
];

interface AdminLoginResponse {
  success: boolean;
  token?: string;
  user?: {
    admin_user_id: string;
    email: string;
    name: string;
    role: string;
    location?: string;
  };
  expires_in?: number;
  error?: string;
  message?: string;
}

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidSubdomain, setIsValidSubdomain] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Check subdomain on mount
  useEffect(() => {
    const currentHost = window.location.hostname;

    // In development, allow localhost
    if (import.meta.env.DEV) {
      setIsValidSubdomain(true);
      return;
    }

    // In production, must be admin.aivedha.ai
    const isValid = ALLOWED_ADMIN_HOSTS.some(host =>
      currentHost === host || currentHost.endsWith(`.${host}`)
    );

    setIsValidSubdomain(isValid);

    // If already authenticated and valid subdomain, redirect to dashboard
    if (isValid) {
      const adminToken = localStorage.getItem('adminToken');
      const tokenExpiry = localStorage.getItem('adminTokenExpiry');
      if (adminToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        const returnUrl = (location.state as { from?: string })?.from || '/admin/dashboard';
        navigate(returnUrl, { replace: true });
      }
    }
  }, [navigate, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate email format before API call
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate password is not empty
    if (!password.trim()) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${ADMIN_API_URL}/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      const data: AdminLoginResponse = await response.json();

      if (data.success && data.token && data.user) {
        // Store admin session with JWT token
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminUser', JSON.stringify(data.user));

        // Store token expiry time
        if (data.expires_in) {
          const expiryTime = Date.now() + (data.expires_in * 1000);
          localStorage.setItem('adminTokenExpiry', expiryTime.toString());
        }

        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.user.name}!`
        });

        // Redirect to intended destination or dashboard
        const returnUrl = (location.state as { from?: string })?.from || '/admin/dashboard';
        navigate(returnUrl, { replace: true });
      } else {
        // Handle specific error messages from API
        const errorMessage = data.message || 'Invalid credentials. Please try again.';
        setError(errorMessage);
      }
    } catch (err) {
      logger.error('Admin login error:', err);
      setError('Unable to connect to authentication service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show error if invalid subdomain
  if (!isValidSubdomain) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-destructive/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            Admin portal is only accessible via the admin subdomain.
          </p>
          <p className="text-sm text-muted-foreground">
            Please access the admin portal via{' '}
            <a
              href="https://admin.aivedha.ai"
              className="text-primary hover:underline font-medium"
            >
              admin.aivedha.ai
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary mr-2" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">AiVedha Guard</h1>
              <p className="text-sm text-muted-foreground">Admin Portal</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Admin Login
            </CardTitle>
            <CardDescription>
              Access the administrative dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" variant="invertPrimary" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>© 2024, Aivibe Software Services Pvt Ltd</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;