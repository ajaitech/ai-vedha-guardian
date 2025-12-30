import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Layout } from "@/components/Layout";
import { XCircle, RefreshCw, CreditCard, HelpCircle, ArrowLeft, Shield } from "lucide-react";
import { APP_CONFIG } from "@/config";

export default function PaymentFailed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get error details from URL params
  // Backend sends: reason=cancelled, error_code, code, error_message, message
  const errorCode = searchParams.get("error_code") || searchParams.get("code") || searchParams.get("reason") || "";
  const errorMessage = searchParams.get("error_message") || searchParams.get("message") || "";
  const planCode = searchParams.get("plan") || searchParams.get("plan_code") || "";
  const transactionId = searchParams.get("transaction_id") || searchParams.get("txn_id") || "";

  useEffect(() => {
    window.scrollTo(0, 0);
    // Clear payment_in_progress session so user can retry
    sessionStorage.removeItem('payment_in_progress');
  }, []);

  // Extended error messages with backend error codes
  const getErrorDescription = (code: string, message: string): { description: string; retryable: boolean; suggestion: string } => {
    const errorMap: Record<string, { description: string; retryable: boolean; suggestion: string }> = {
      // Backend error codes
      'PAYMENT_001': {
        description: 'Payment system is temporarily unavailable.',
        retryable: true,
        suggestion: 'Please wait a few minutes and try again.'
      },
      'PAYMENT_002': {
        description: 'The selected plan is not available.',
        retryable: false,
        suggestion: 'Please go back to the pricing page and select a valid plan.'
      },
      'PAYMENT_003': {
        description: 'The coupon code has expired or is invalid.',
        retryable: true,
        suggestion: 'Try removing the coupon code and proceeding with the full price.'
      },
      'PAYMENT_004': {
        description: 'You already have an active subscription.',
        retryable: false,
        suggestion: 'Please visit your dashboard to manage your existing subscription.'
      },
      'PAYMENT_005': {
        description: 'You do not have permission to complete this transaction.',
        retryable: false,
        suggestion: 'Please contact support if you believe this is an error.'
      },
      'PAYMENT_006': {
        description: 'This transaction has already been processed.',
        retryable: false,
        suggestion: 'Check your email for confirmation or visit your dashboard.'
      },
      'PAYMENT_007': {
        description: 'Too many payment attempts. Rate limit exceeded.',
        retryable: true,
        suggestion: 'Please wait a few minutes before trying again.'
      },
      'PAYMENT_008': {
        description: 'Invalid payment method.',
        retryable: true,
        suggestion: 'Please try using a different payment method or card.'
      },
      'PAYMENT_009': {
        description: 'Your payment was declined by your bank.',
        retryable: true,
        suggestion: 'Please contact your bank or try a different card.'
      },
      'PAYMENT_010': {
        description: 'Payment verification failed.',
        retryable: true,
        suggestion: 'Please try again or contact support.'
      },
      'PAYMENT_011': {
        description: 'Required information is missing.',
        retryable: true,
        suggestion: 'Please ensure all required fields are filled out correctly.'
      },
      'PAYMENT_012': {
        description: 'User account not found.',
        retryable: false,
        suggestion: 'Please log in again or create a new account.'
      },
      // Standard PayPal/card error codes
      'card_declined': {
        description: 'Your card was declined.',
        retryable: true,
        suggestion: 'Please try a different payment method or contact your bank.'
      },
      'insufficient_funds': {
        description: 'Insufficient funds in your account.',
        retryable: true,
        suggestion: 'Please try a different card or add funds to your account.'
      },
      'expired_card': {
        description: 'Your card has expired.',
        retryable: true,
        suggestion: 'Please use a valid, non-expired card.'
      },
      'invalid_card': {
        description: 'Invalid card details.',
        retryable: true,
        suggestion: 'Please check your card number, expiry date, and CVV.'
      },
      'processing_error': {
        description: 'Payment processing error occurred.',
        retryable: true,
        suggestion: 'Please wait a moment and try again.'
      },
      'authentication_required': {
        description: 'Additional authentication required.',
        retryable: true,
        suggestion: 'Please complete the 3D Secure verification with your bank.'
      },
      'payment_timeout': {
        description: 'Payment session timed out.',
        retryable: true,
        suggestion: 'Please try again from the beginning.'
      },
      'cancelled': {
        description: 'Payment was cancelled.',
        retryable: true,
        suggestion: 'You can try again when you are ready.'
      },
      'network_error': {
        description: 'Network connection lost during payment.',
        retryable: true,
        suggestion: 'Please check your internet connection and try again.'
      },
    };

    const normalizedCode = code?.toUpperCase() || '';
    const errorInfo = errorMap[normalizedCode] || errorMap[code?.toLowerCase() || ''];

    if (errorInfo) {
      return errorInfo;
    }

    if (message) {
      return {
        description: message,
        retryable: true,
        suggestion: 'Please try again or contact support if the issue persists.'
      };
    }

    return {
      description: 'There was an issue processing your payment.',
      retryable: true,
      suggestion: 'Please try again or contact support for assistance.'
    };
  };

  const errorInfo = getErrorDescription(errorCode, errorMessage);

  return (
    <Layout>
      <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-background via-background to-red-500/5">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Failed Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center"
              >
                <XCircle className="h-10 w-10 text-red-500" />
              </motion.div>

              <h1 className="text-3xl font-bold text-foreground mb-2 font-orbitron">
                Payment Failed
              </h1>
              <p className="text-muted-foreground">
                We couldn't process your payment at this time
              </p>
            </div>

            {/* Error Details Card */}
            <Card className="bg-card/80 backdrop-blur-md border-2 border-red-500/30 shadow-lg mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <XCircle className="h-5 w-5" />
                  Transaction Failed
                </CardTitle>
                <CardDescription>
                  Don't worry - you haven't been charged
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Error Message */}
                <Alert className="bg-red-500/10 border-red-500/20">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-200">
                    <p className="font-medium">{errorInfo.description}</p>
                    {errorInfo.suggestion && (
                      <p className="text-sm mt-1 text-red-300">{errorInfo.suggestion}</p>
                    )}
                  </AlertDescription>
                </Alert>

                {/* Transaction Details */}
                {(transactionId || errorCode) && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/5 to-orange-500/5 border border-red-500/20">
                    <h3 className="font-medium text-foreground mb-3">Error Details</h3>
                    <div className="space-y-2 text-sm">
                      {errorCode && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Error Code</span>
                          <span className="font-mono text-red-400">{errorCode}</span>
                        </div>
                      )}
                      {transactionId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transaction ID</span>
                          <span className="font-mono text-muted-foreground">{transactionId}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Can Retry</span>
                        <span className={errorInfo.retryable ? "text-green-400" : "text-orange-400"}>
                          {errorInfo.retryable ? "Yes" : "Contact Support"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Troubleshooting Tips */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">What You Can Try:</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span className="text-sm text-muted-foreground">Try a different payment method or card</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <RefreshCw className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span className="text-sm text-muted-foreground">Check your card details and try again</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span className="text-sm text-muted-foreground">Ensure your card supports international payments</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span className="text-sm text-muted-foreground">Contact your bank if the issue persists</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="space-y-3">
              {errorInfo.retryable ? (
                <Link to={planCode ? `/pricing?plan=${planCode}` : "/pricing"} className="block">
                  <Button variant="invertPrimary" size="lg" className="h-12 rounded-xl">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </Link>
              ) : (
                <Link to="/support" className="block">
                  <Button variant="invertPrimary" size="lg" className="h-12 rounded-xl">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </Link>
              )}

              <div className="flex gap-3">
                <Link to="/dashboard">
                  <Button variant="invertOutline" size="lg" className="h-12 rounded-xl">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                {errorInfo.retryable ? (
                  <Link to="/support">
                    <Button variant="invertOutline" size="lg" className="h-12 rounded-xl">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Get Help
                    </Button>
                  </Link>
                ) : (
                  <Link to={planCode ? `/pricing?plan=${planCode}` : "/pricing"}>
                    <Button variant="invertOutline" size="lg" className="h-12 rounded-xl">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Support Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                If you continue to experience issues, please contact us at{" "}
                <a href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`} className="text-primary hover:underline">
                  {APP_CONFIG.SUPPORT_EMAIL}
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
