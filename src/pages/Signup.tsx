import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Eye, EyeOff, Mail, Lock, User, Loader2, Gift } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import AivedhaAPI from "@/lib/api";
import { logger } from "@/lib/logger";
import { isValidEmail } from "@/utils/validation";
import { getErrorMessage } from "@/utils/type-guards";

// Free credits for new users
const FREE_CREDITS = 3;

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: true,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.agreeToTerms) {
      newErrors.terms = "You must agree to the terms and privacy policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Register user via API
      const response = await AivedhaAPI.registerUser({
        email: formData.email,
        password: formData.password,
        fullName: formData.name,
        defaultCredits: FREE_CREDITS,
        plan: "Aarambh",
        isNewUser: true
      });

      if (response.success) {
        // Create user session with free credits
        // Set onboardingCompleted=true because email signup already collects all needed info
        // This prevents duplicate onboarding popup on dashboard
        const user = {
          email: formData.email,
          fullName: formData.name,
          credits: FREE_CREDITS,
          plan: "Aarambh",
          loginMethod: "email",
          isNewUser: true,
          onboardingCompleted: true // Email signup = onboarding complete (name+email already collected)
        };

        // Store user data
        localStorage.setItem("currentUser", JSON.stringify(user));
        if (response.token) {
          localStorage.setItem("authToken", response.token);
        }

        // Free plan is automatically assigned during registration

        toast({
          title: "Welcome to AiVedha Guard!",
          description: `Your account has been created with ${FREE_CREDITS} free credits. Start your first security audit now!`,
        });

        navigate("/dashboard");
      } else {
        throw new Error(response.error || "Registration failed");
      }
    } catch (error: unknown) {
      logger.error("Signup error:", error);

      // Check if it's a duplicate email error
      const errorMessage = getErrorMessage(error);
      if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
        toast({
          variant: "destructive",
          title: "Email Already Registered",
          description: "This email is already registered. Please sign in instead.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: errorMessage || "Unable to create account. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-md border border-border/50 shadow-3d">
          <CardHeader className="text-center space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <Shield className="h-12 w-12 text-primary" aria-hidden="true" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-md animate-pulse-glow" aria-hidden="true"></div>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Create Account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Join AiVedha Guard and secure your digital realm
            </CardDescription>

            {/* Free Credits Banner */}
            <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-primary/10 rounded-lg border border-primary/20" role="status" aria-live="polite">
              <Gift className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-primary">
                Get {FREE_CREDITS} free credits on signup!
              </span>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className={`pl-10 bg-background/50 border-border/50 focus:border-primary ${errors.name ? "border-red-500" : ""}`}
                    placeholder="Enter your full name"
                    disabled={isLoading}
                    required
                    aria-describedby={errors.name ? "name-error" : undefined}
                    aria-invalid={errors.name ? "true" : undefined}
                  />
                </div>
                {errors.name && <p id="name-error" className="text-xs text-red-500" role="alert">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`pl-10 bg-background/50 border-border/50 focus:border-primary ${errors.email ? "border-red-500" : ""}`}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    required
                    aria-describedby={errors.email ? "email-error" : undefined}
                    aria-invalid={errors.email ? "true" : undefined}
                  />
                </div>
                {errors.email && <p id="email-error" className="text-xs text-red-500" role="alert">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={`pl-10 pr-10 bg-background/50 border-border/50 focus:border-primary ${errors.password ? "border-red-500" : ""}`}
                    placeholder="At least 8 characters"
                    disabled={isLoading}
                    required
                    aria-describedby={errors.password ? "password-error" : undefined}
                    aria-invalid={errors.password ? "true" : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                {errors.password && <p id="password-error" className="text-xs text-red-500" role="alert">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className={`pl-10 pr-10 bg-background/50 border-border/50 focus:border-primary ${errors.confirmPassword ? "border-red-500" : ""}`}
                    placeholder="Re-enter your password"
                    disabled={isLoading}
                    required
                    aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                    aria-invalid={errors.confirmPassword ? "true" : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && <p id="confirmPassword-error" className="text-xs text-red-500" role="alert">{errors.confirmPassword}</p>}
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                  disabled={isLoading}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:text-primary-hover">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:text-primary-hover">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.terms && <p id="terms-error" className="text-xs text-red-500" role="alert">{errors.terms}</p>}

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-medium rounded-xl"
                disabled={!formData.agreeToTerms || isLoading}
                aria-busy={isLoading}
                aria-label={isLoading ? "Creating your account" : "Create account"}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Social Login Link */}
            <div className="text-center">
              <Link to="/login">
                <Button variant="outline" className="h-12 rounded-xl" aria-label="Sign in with Google or GitHub">
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google or GitHub
                </Button>
              </Link>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
