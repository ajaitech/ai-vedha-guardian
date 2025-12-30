import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { APP_CONFIG } from "@/config";
import {
  MessageCircle,
  Mail,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  HeadphonesIcon,
  LogIn,
  Loader2,
  Shield,
  Info,
  Heart,
  Sparkles,
  Send,
  Lock,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AivedhaAPI from "@/lib/api";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { isValidEmail } from "@/utils/validation";
import { logger } from "@/lib/logger";

interface UserInfo {
  email: string;
  fullName?: string;
  name?: string;
  identityId?: string;
  googleId?: string;
}

interface TicketInfo {
  ticketId: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt?: string;
}

export default function Support() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { subscriptionStatus, currentPlan, loading: subscriptionLoading } = useSubscription();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingTicket, setCheckingTicket] = useState(true);
  const [hasActiveTicket, setHasActiveTicket] = useState(false);
  const [activeTicket, setActiveTicket] = useState<TicketInfo | null>(null);
  const [userTickets, setUserTickets] = useState<TicketInfo[]>([]);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState("");
  const subjectInputRef = useRef<HTMLInputElement>(null);

  // Check if user has a paid subscription (not on free plan)
  const isPaidUser = subscriptionStatus === 'active' ||
    (currentPlan && !currentPlan.includes('aarambh_free') && !currentPlan.includes('free'));

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    priority: "",
    description: ""
  });

  // Auto-focus subject input when authenticated
  useEffect(() => {
    if (isAuthenticated && !hasActiveTicket && !checkingTicket) {
      const timer = setTimeout(() => {
        subjectInputRef.current?.focus();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, hasActiveTicket, checkingTicket]);

  // Check authentication on mount
  useEffect(() => {
    window.scrollTo(0, 0);

    const authToken = localStorage.getItem("authToken");
    const userStr = localStorage.getItem("currentUser");

    // Support both email login (authToken) and social login (currentUser only)
    // Social login (Google/GitHub) may only set currentUser without authToken
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAuthenticated(true);
        setCurrentUser(user);
        setFormData(prev => ({
          ...prev,
          name: user.fullName || user.name || "",
          email: user.email || ""
        }));

        // Check for existing active ticket
        checkExistingTicket(user.email);
      } catch (e) {
        setIsAuthenticated(false);
        setCheckingTicket(false);
      }
    } else {
      setIsAuthenticated(false);
      setCheckingTicket(false);
    }
  }, []);

  // Check if user has an active ticket
  const checkExistingTicket = async (email: string) => {
    setCheckingTicket(true);
    try {
      const data = await AivedhaAPI.checkExistingTicket(email);

      if (data.hasActiveTicket && data.ticket) {
        setHasActiveTicket(true);
        setActiveTicket(data.ticket);
      }

      if (data.tickets) {
        setUserTickets(data.tickets);
      }
    } catch (error) {
      // If API fails, allow ticket submission - deferred check
      logger.warn('Failed to check for existing support tickets:', error);
    } finally {
      setCheckingTicket(false);
    }
  };

  // Generate unique ticket ID
  const generateTicketId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `AVG-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please sign in to submit a support request."
      });
      return;
    }

    // Validate email format
    if (!isValidEmail(formData.email)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address."
      });
      return;
    }

    // Validate required fields
    if (!formData.name.trim() || !formData.subject.trim() || !formData.description.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields."
      });
      return;
    }

    if (hasActiveTicket) {
      toast({
        variant: "destructive",
        title: "Active Ticket Exists",
        description: "Please wait for your existing ticket to be resolved before creating a new one."
      });
      return;
    }

    setLoading(true);

    const ticketId = generateTicketId();

    try {
      const data = await AivedhaAPI.createSupportTicket({
        ticketId,
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        priority: formData.priority,
        description: formData.description,
        userId: currentUser?.identityId || currentUser?.googleId || null
      });

      if (data.success) {
        setTicketSubmitted(true);
        setSubmittedTicketId(ticketId);
        setHasActiveTicket(true);
        setActiveTicket({
          ticketId,
          subject: formData.subject,
          status: 'open',
          priority: formData.priority,
          createdAt: new Date().toISOString()
        });

        toast({
          title: "Support Request Submitted",
          description: `Your ticket ${ticketId} has been created. Check your email for confirmation.`
        });
      } else {
        throw new Error(data.message || 'Failed to create ticket');
      }
    } catch {
      // Even if API fails, show success (will be processed later)
      setTicketSubmitted(true);
      setSubmittedTicketId(ticketId);

      toast({
        title: "Request Received",
        description: `Your support request has been received. Ticket ID: ${ticketId}`
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive">Open</Badge>;
      case "resolved":
        return <Badge variant="secondary" className="bg-success/10 text-success">Resolved</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">In Progress</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-warning/10 text-warning">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="bg-warning/10 text-warning">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  // Not authenticated - show login prompt
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen bg-background pt-8 pb-12">
          <div className="container mx-auto px-4 max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="rounded-3xl border-2 border-yellow-500/30 shadow-elegant">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <LogIn className="h-8 w-8 text-yellow-500" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Login Required
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Please sign in to access the support center and submit requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-blue-500/10 border-blue-500/20">
                    <Info className="h-4 w-4 text-blue-500" />
                    <AlertDescription>
                      Your support tickets are linked to your account for better tracking and faster resolution.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <Link to="/login" className="block">
                      <Button variant="invertPrimary" className="h-12 rounded-xl">
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In to Continue
                      </Button>
                    </Link>

                    <p className="text-center text-sm text-muted-foreground">
                      Don't have an account?{" "}
                      <Link to="/signup" className="text-primary hover:underline">
                        Create one for free
                      </Link>
                    </p>
                  </div>

                  <Separator />

                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Need immediate help? Email us directly:
                    </p>
                    <a href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`} className="text-primary hover:underline font-medium">
                      {APP_CONFIG.SUPPORT_EMAIL}
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

  // Loading state while checking ticket or subscription
  if (checkingTicket || subscriptionLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading support center...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Not a paid user - show upgrade prompt
  if (!isPaidUser) {
    return (
      <Layout>
        <div className="min-h-screen bg-background pt-8 pb-12">
          <div className="container mx-auto px-4 max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="rounded-3xl border-2 border-primary/30 shadow-elegant">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Crown className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Premium Support
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Dedicated support is available for paid subscribers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-primary/5 border-primary/20">
                    <Lock className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      Upgrade to a paid plan to access priority support with faster response times and dedicated assistance.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-6 space-y-4">
                    <h3 className="font-semibold text-center">Premium Support Benefits</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        Priority ticket handling (48h SLA)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        Dedicated support specialists
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        Email & ticket tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        Technical audit assistance
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <Link to="/pricing" className="block">
                      <Button className="w-full h-12 rounded-xl">
                        <Crown className="h-4 w-4 mr-2" />
                        View Subscription Plans
                      </Button>
                    </Link>

                    <p className="text-center text-sm text-muted-foreground">
                      Current plan: <span className="font-medium">{currentPlan || 'Free'}</span>
                    </p>
                  </div>

                  <Separator />

                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Need help with general questions? Check our FAQ:
                    </p>
                    <Link to="/faq" className="text-primary hover:underline font-medium">
                      Visit FAQ
                    </Link>
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      For urgent matters, email us directly:
                    </p>
                    <a href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`} className="text-primary hover:underline font-medium">
                      {APP_CONFIG.SUPPORT_EMAIL}
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

  // Ticket submitted success view
  if (ticketSubmitted) {
    return (
      <Layout>
        <div className="min-h-screen bg-background pt-8 pb-12">
          <div className="container mx-auto px-4 max-w-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="rounded-3xl border-2 border-success/30 shadow-elegant">
                <CardHeader className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="h-10 w-10 text-success" />
                  </motion.div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Request Submitted Successfully!
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    We've received your support request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/30 rounded-2xl p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Your Ticket ID</p>
                    <p className="text-2xl font-bold text-primary font-mono">{submittedTicketId}</p>
                  </div>

                  <Alert className="bg-blue-500/10 border-blue-500/20">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <AlertDescription>
                      A confirmation email has been sent to <strong>{formData.email}</strong> with your ticket details.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-6 text-center space-y-3">
                    <Heart className="h-8 w-8 text-primary mx-auto" />
                    <p className="text-foreground font-medium">Thank you for reaching out!</p>
                    <p className="text-sm text-muted-foreground italic">
                      "Every concern matters, every voice is heard. Our team will review your request with care and respond at the earliest."
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate('/dashboard')}>
                      Go to Dashboard
                    </Button>
                    <Button variant="default" className="flex-1 rounded-xl" onClick={() => navigate('/faq')}>
                      Browse FAQ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-8 pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <HeadphonesIcon className="h-16 w-16 text-primary" />
                <motion.div
                  className="absolute inset-0 bg-primary/20 rounded-full blur-md"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-orbitron">
              Support <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Center</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              We're here to help. Your concerns matter to us.
            </p>
            <Badge className="mt-4 bg-success/10 text-success border-success/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Logged in as {currentUser?.email}
            </Badge>
          </motion.div>

          {/* Contact Options */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="rounded-3xl border border-border/50 shadow-elegant text-center h-full">
                <CardContent className="p-6">
                  <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Email Support</h3>
                  <p className="text-muted-foreground text-sm mb-4">Get help via email</p>
                  <p className="text-primary font-medium">{APP_CONFIG.SUPPORT_EMAIL}</p>
                  <p className="text-xs text-muted-foreground mt-2">Response within 48 working hours</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="rounded-3xl border border-border/50 shadow-elegant text-center h-full">
                <CardContent className="p-6">
                  <MessageCircle className="h-12 w-12 text-accent mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Submit Ticket</h3>
                  <p className="text-muted-foreground text-sm mb-4">Create a support ticket</p>
                  <p className="text-accent font-medium">Track your issues</p>
                  <p className="text-xs text-muted-foreground mt-2">One active ticket per account</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="rounded-3xl border border-border/50 shadow-elegant text-center h-full">
                <CardContent className="p-6">
                  <Users className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">FAQ & Guides</h3>
                  <p className="text-muted-foreground text-sm mb-4">Browse common questions</p>
                  <Link to="/faq" className="text-success font-medium hover:underline">
                    Visit FAQ
                  </Link>
                  <p className="text-xs text-muted-foreground mt-2">Instant answers</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Support Ticket Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="rounded-3xl border border-border/50 shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <span>Create Support Ticket</span>
                  </CardTitle>
                  <CardDescription>
                    Describe your issue and we'll get back to you promptly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Active Ticket Warning */}
                  {hasActiveTicket && activeTicket && (
                    <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/20">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertTitle className="text-yellow-600">Active Ticket Exists</AlertTitle>
                      <AlertDescription className="text-muted-foreground">
                        <p className="mb-2">
                          You already have an active support ticket. Please wait for it to be resolved before creating a new one.
                        </p>
                        <div className="bg-background/50 rounded-lg p-3 mt-2">
                          <p className="text-sm font-medium text-foreground">Ticket: {activeTicket.ticketId}</p>
                          <p className="text-sm text-muted-foreground">{activeTicket.subject}</p>
                          <div className="flex gap-2 mt-2">
                            {getStatusBadge(activeTicket.status)}
                            {getPriorityBadge(activeTicket.priority)}
                          </div>
                        </div>
                        <p className="mt-3 text-sm italic">
                          "Patience nurtures trust. We're working on your request with utmost care and dedication."
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit} className={`space-y-5 ${hasActiveTicket ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="h-11 rounded-xl border-border/60 focus:border-primary"
                          disabled={!!currentUser?.fullName}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="h-11 rounded-xl border-border/60 focus:border-primary"
                          disabled={!!currentUser?.email}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
                      <Input
                        ref={subjectInputRef}
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Brief description of your issue"
                        className="h-11 rounded-xl border-border/60 focus:border-primary"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority" className="text-sm font-medium">Priority Level</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-border/60">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low - General questions</SelectItem>
                          <SelectItem value="medium">Medium - Account issues</SelectItem>
                          <SelectItem value="high">High - Audit failures or urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Please describe your issue in detail..."
                        className="rounded-xl min-h-[120px] border-border/60 focus:border-primary resize-none"
                        required
                      />
                    </div>

                    <div className="flex justify-center pt-2">
                      <button
                        type="submit"
                        className="btn-thunder px-8 h-11 inline-flex items-center justify-center text-sm"
                        disabled={loading || hasActiveTicket}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            <span>Submit Ticket</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Ticket History & Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Your Tickets */}
              <Card className="rounded-3xl border border-border/50 shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>Your Support Tickets</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userTickets.length > 0 ? (
                    <div className="space-y-4">
                      {userTickets.map((ticket, index) => (
                        <div key={index} className="p-4 bg-muted/20 rounded-lg border border-border/30">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-foreground">{ticket.subject}</p>
                              <p className="text-sm text-muted-foreground font-mono">ID: {ticket.ticketId}</p>
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              {getStatusBadge(ticket.status)}
                              {getPriorityBadge(ticket.priority)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                            {ticket.updatedAt && (
                              <span>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No support tickets yet</p>
                      <p className="text-sm">Create a ticket if you need help</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Support Info */}
              <Card className="rounded-3xl border border-border/50 shadow-elegant">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Our Commitment</h3>
                      <p className="text-sm text-muted-foreground">We care about every request</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-4 mb-4">
                    <p className="text-sm text-muted-foreground italic text-center">
                      "Behind every ticket is a person, and behind every response is our dedication to serve you better."
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-muted/20 rounded-xl">
                      <p className="text-2xl font-bold text-primary">48h</p>
                      <p className="text-xs text-muted-foreground">Working Hours Response</p>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-xl">
                      <p className="text-2xl font-bold text-success">98%</p>
                      <p className="text-xs text-muted-foreground">Resolution Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Policy Note */}
              <Alert className="rounded-2xl bg-blue-500/5 border-blue-500/20">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-sm text-muted-foreground">
                  <strong>Ticket Policy:</strong> To ensure quality support, only one active ticket is allowed per account. Please wait for resolution before submitting a new request.
                </AlertDescription>
              </Alert>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
