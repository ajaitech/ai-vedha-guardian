/**
 * AiVedha Guardian - Referral Program Page
 * Landing page for referral program with SEO metadata
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  Users,
  Shield,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Crown,
  Zap,
  Share2,
} from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { ReferralSection } from "@/components/ReferralSection";

export default function Referral() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useSession();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Set page title and meta tags
  useEffect(() => {
    document.title = "Referral Program - Earn Free Credits | AiVedha Guard";

    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Join the AiVedha Guard referral program. Invite friends and earn 10 free security audit credits for each successful referral.');
    }
  }, []);

  // Check for referral code in URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    const fromEmail = searchParams.get('from');

    if (refCode) {
      setReferralCode(refCode);
      // Store for later activation
      localStorage.setItem('pendingReferralCode', refCode);
      if (fromEmail) {
        localStorage.setItem('pendingReferralFrom', fromEmail);
      }
    }
  }, [searchParams]);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      // Preserve referral code in navigation
      const refCode = searchParams.get('ref');
      const fromEmail = searchParams.get('from');
      let loginUrl = '/login';
      if (refCode) {
        loginUrl += `?ref=${refCode}`;
        if (fromEmail) {
          loginUrl += `&from=${encodeURIComponent(fromEmail)}`;
        }
      }
      navigate(loginUrl);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="mb-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0">
              <Gift className="h-3 w-3 mr-1" />
              Referral Program
            </Badge>

            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-orbitron">
              Share & Earn{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">
                Free Credits
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Invite your friends to AiVedha Guard and both of you earn 10 free security audit credits!
            </p>

            {referralCode && (
              <motion.div
                className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-6 py-3 mb-8"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <Sparkles className="h-5 w-5 text-emerald-500" />
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  You've been referred! Sign up to claim your 10 free credits
                </span>
              </motion.div>
            )}

            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold px-8 py-6 text-lg rounded-xl"
            >
              {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>

          {/* How It Works */}
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-center text-foreground mb-8 font-orbitron">
              How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: 1,
                  icon: Share2,
                  title: "Share Your Link",
                  description: "Get your unique referral link from your dashboard and share it with friends",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10"
                },
                {
                  step: 2,
                  icon: Users,
                  title: "Friend Signs Up",
                  description: "Your friend creates an account using your referral link",
                  color: "text-violet-500",
                  bg: "bg-violet-500/10"
                },
                {
                  step: 3,
                  icon: Gift,
                  title: "Both Earn Credits",
                  description: "You and your friend each receive 10 free security audit credits!",
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10"
                }
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Card className="bg-card/80 backdrop-blur-md border-border/50 h-full text-center">
                    <CardContent className="pt-8 pb-6">
                      <div className={`w-16 h-16 ${item.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                        <item.icon className={`h-8 w-8 ${item.color}`} />
                      </div>
                      <Badge variant="secondary" className="mb-3">Step {item.step}</Badge>
                      <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                      <p className="text-muted-foreground text-sm">{item.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Benefits Grid */}
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-center text-foreground mb-8 font-orbitron">
              Referral Benefits
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* For You */}
              <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-6 w-6 text-amber-500" />
                    For You (Referrer)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "10 credits for each successful referral",
                    "Unlimited referrals on paid plans",
                    "Track all your referrals in dashboard",
                    "Special referral leaderboard badges"
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-foreground">{benefit}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* For Friend */}
              <Card className="bg-gradient-to-br from-emerald-500/5 to-green-500/5 border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-6 w-6 text-emerald-500" />
                    For Your Friend
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "10 FREE credits on first signup",
                    "Full access to all security features",
                    "AI-powered vulnerability scanning",
                    "Professional security certificates"
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-foreground">{benefit}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Plan Comparison */}
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-2xl font-bold text-center text-foreground mb-8 font-orbitron">
              Referral Rewards by Plan
            </h2>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Free Plan */}
              <Card className="border-border/50">
                <CardHeader className="text-center">
                  <CardTitle>Aarambh (Free)</CardTitle>
                  <CardDescription>Perfect for getting started</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">1</p>
                    <p className="text-muted-foreground text-sm">Referral bonus (one-time)</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>Earn 10 credits once</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Unlimited sharing (no bonus after 1st)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Paid Plans */}
              <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
                <CardHeader className="text-center">
                  <Badge className="w-fit mx-auto mb-2 bg-amber-500/20 text-amber-600 border-amber-500/30">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                  <CardTitle>Paid Plans</CardTitle>
                  <CardDescription>Raksha, Kavach, Suraksha, Enterprise</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-600">Unlimited</p>
                    <p className="text-muted-foreground text-sm">Referral bonuses forever</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span>10 credits per referral</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-500" />
                      <span>No limits on referrals</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Logged-in User Section */}
          {isAuthenticated && user && (
            <motion.div
              className="max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h2 className="text-2xl font-bold text-center text-foreground mb-6 font-orbitron">
                Your Referral Dashboard
              </h2>
              <ReferralSection userEmail={user.email} userName={user.name} />
            </motion.div>
          )}

          {/* CTA Section */}
          {!isAuthenticated && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20 max-w-2xl mx-auto">
                <CardContent className="py-8">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Ready to Start Earning?
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Sign up now and get your unique referral link to start earning free credits!
                  </p>
                  <button
                    onClick={handleGetStarted}
                    className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3 rounded-xl"
                  >
                    Create Free Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}
