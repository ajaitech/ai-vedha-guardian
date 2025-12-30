// AiVedha Guard - Subscription Confirmation Page
// Handles redirect after successful payment

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Shield, CreditCard, Calendar, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AivedhaAPI from '@/lib/api';
import { logger } from '@/lib/logger';
import { APP_CONFIG } from '@/config';

interface SubscriptionDetails {
  subscriptionId: string;
  planCode: string;
  planName: string;
  credits: number;
  price: number;
  currency: string;
  status: string;
}

type ConfirmationStatus = 'loading' | 'success' | 'error';

const SubscriptionConfirmPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<ConfirmationStatus>('loading');
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [error, setError] = useState<string>('');

  // Extract parameters from PayPal redirect URL
  const subscriptionId = searchParams.get('subscription_id') || '';
  const planName = searchParams.get('plan_name') || '';
  const planCode = searchParams.get('plan_code') || '';
  const amount = searchParams.get('amount') || '';
  const currency = searchParams.get('currency') || 'USD';
  const customerName = searchParams.get('customer_name') || '';
  const customerEmail = searchParams.get('customer_email') || '';
  const urlCredits = searchParams.get('credits') || '';

  useEffect(() => {
    const confirmSubscription = async () => {
      if (!subscriptionId && !planCode) {
        setError('Missing subscription information');
        setStatus('error');
        return;
      }

      try {
        // CRITICAL: Check if already activated (idempotency)
        const permanentKey = `subscription_activated_${subscriptionId || planCode}`;
        if (localStorage.getItem(permanentKey)) {
          logger.log("Subscription already activated");
          setStatus('success');
          return;
        }

        // CRITICAL: Set lock IMMEDIATELY to prevent race condition
        const lockKey = `subscription_lock_${subscriptionId || planCode}`;
        const existingLock = sessionStorage.getItem(lockKey);
        if (existingLock) {
          logger.warn("Subscription activation already in progress (locked)");
          return;
        }
        sessionStorage.setItem(lockKey, new Date().toISOString());

        // Get current user from localStorage
        const userStr = localStorage.getItem('currentUser');
        let userEmail = customerEmail;
        let userName = customerName;

        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            userEmail = userEmail || user.email || '';
            userName = userName || user.fullName || user.name || '';
          } catch (e) {
            logger.error('Failed to parse user data:', e);
          }
        }

        if (!userEmail) {
          setError('Unable to identify user. Please log in and try again.');
          setStatus('error');
          return;
        }

        // Get plan details from API if not in URL params
        let creditAmount = parseInt(urlCredits) || 0;
        let planAmount = amount ? parseFloat(amount) : 0;
        let resolvedPlanName = planName || planCode;

        if (!urlCredits || !amount) {
          try {
            const response = await AivedhaAPI.getPublicPlans();
            if (response.success && response.plans.length > 0) {
              const basePlanCode = planCode.toLowerCase().replace(/_monthly|_yearly|_usd/g, '');
              const matchedPlan = response.plans.find(p =>
                p.plan_code.toLowerCase() === basePlanCode ||
                basePlanCode.includes(p.plan_code.toLowerCase())
              );
              if (matchedPlan) {
                creditAmount = creditAmount || matchedPlan.credits;
                planAmount = planAmount || matchedPlan.price;
                resolvedPlanName = resolvedPlanName || matchedPlan.name;
              }
            }
          } catch (err) {
            logger.warn('Failed to fetch plan from API:', err);
          }
        }

        // Call backend to activate subscription
        const activationResult = await AivedhaAPI.activateSubscription({
          email: userEmail,
          fullName: userName,
          plan: planCode,
          credits: creditAmount,
          amount: planAmount,
          currency: currency,
          paymentMethod: 'Card',
          timestamp: new Date().toISOString()
        });

        if (activationResult.success) {
          // CRITICAL: Mark as permanently activated to prevent re-activation
          const permanentKey = `subscription_activated_${subscriptionId || planCode}`;
          localStorage.setItem(permanentKey, new Date().toISOString());

          // Update localStorage
          const currentUser = userStr ? JSON.parse(userStr) : {};
          const updatedUser = {
            ...currentUser,
            email: userEmail,
            plan: resolvedPlanName,
            credits: activationResult.user?.credits || creditAmount,
            subscriptionActive: true,
            subscriptionPlan: planCode,
            subscriptionId: subscriptionId,
            subscriptionDate: new Date().toISOString()
          };
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));

          setSubscription({
            subscriptionId: subscriptionId,
            planCode: planCode,
            planName: resolvedPlanName,
            credits: creditAmount,
            price: planAmount,
            currency: currency,
            status: 'active',
          });

          setStatus('success');
          triggerConfetti();
        } else {
          setError('Failed to confirm subscription. Please contact support.');
          setStatus('error');
        }

      } catch (err) {
        logger.error('Confirmation error:', err);
        setError(err instanceof Error ? err.message : 'Failed to confirm subscription');
        setStatus('error');
      }
    };

    confirmSubscription();
  }, [subscriptionId, planCode, planName, amount, currency, customerEmail, customerName, urlCredits]);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'],
      });
    }, 250);
  };

  const formatPrice = (price: number) => {
    return `$${price}`; // USD only globally
  };

  // Loading State
  if (status === 'loading') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Confirming Your Subscription
            </h2>
            <p className="text-muted-foreground">
              Please wait while we activate your account...
            </p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // Error State
  if (status === 'error') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center p-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <Card className="bg-card/80 backdrop-blur-md border-red-500/30">
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <CardTitle className="text-2xl">Confirmation Failed</CardTitle>
                <CardDescription>
                  {error || 'Something went wrong while confirming your subscription.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => window.location.reload()}
                  variant="default"
                  size="lg"
                  className="w-full"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Need help? Contact us at{' '}
                  <a href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`} className="text-primary hover:underline">
                    {APP_CONFIG.SUPPORT_EMAIL}
                  </a>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // Success State
  return (
    <Layout>
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <Card className="bg-card/80 backdrop-blur-md border-2 border-primary/30 shadow-lg">
            {/* Success Icon */}
            <CardHeader className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.6, delay: 0.2 }}
                className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
              >
                <CheckCircle className="w-14 h-14 text-white" />
              </motion.div>

              <CardTitle className="text-3xl">Subscription Activated</CardTitle>
              <CardDescription className="text-lg">
                Welcome to <span className="font-semibold text-primary">{subscription?.planName}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Subscription Details Card */}
              <div className="bg-gradient-to-r from-primary to-primary/70 rounded-2xl p-6 text-primary-foreground">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-8 h-8" />
                  <div>
                    <p className="text-sm opacity-80">Your Plan</p>
                    <p className="text-xl font-bold">{subscription?.planName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/20 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm opacity-80">Credits</span>
                    </div>
                    <p className="text-2xl font-bold">{subscription?.credits}</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm opacity-80">Price</span>
                    </div>
                    <p className="text-lg font-bold">
                      {subscription && formatPrice(subscription.price)}/mo
                    </p>
                  </div>
                </div>
              </div>

              {/* Subscription ID */}
              {subscription?.subscriptionId && (
                <div className="bg-muted/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Subscription ID</span>
                    </div>
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {subscription.subscriptionId}
                    </code>
                  </div>
                </div>
              )}

              {/* What's Next */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">What's Next?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    Start your first AI Gemini 3.0 powered security audit
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    Download detailed PDF reports for all your scans
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    Get AI-powered remediation recommendations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    Share verified security certificates with clients
                  </li>
                </ul>
              </div>

              {/* CTA buttons */}
              <div className="space-y-3 pt-4">
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="default"
                  size="lg"
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() => navigate('/security-audit')}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Start Your First Audit
                </Button>
              </div>

              {/* Support Footer */}
              <p className="text-center text-sm text-muted-foreground">
                Questions? Contact{' '}
                <a href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`} className="text-primary hover:underline">
                  {APP_CONFIG.SUPPORT_EMAIL}
                </a>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default SubscriptionConfirmPage;
