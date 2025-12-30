import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Trash2, Loader2, Crown, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AivedhaAPI from "@/lib/api";
import { logger } from "@/lib/logger";
import { isValidEmail } from "@/utils/validation";
import { getErrorMessage } from "@/utils/type-guards";

interface AccountDeletionDialogProps {
  trigger?: React.ReactNode;
  className?: string;
}

interface DeletionEligibility {
  canDelete: boolean;
  hasActivePaidPlan: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  planEndDate: string | null;
  credits: number;
  requiresConfirmation: boolean;
  warningMessage: string | null;
}

const DELETION_REASONS = [
  { value: "not_using", label: "I'm not using the service anymore" },
  { value: "too_expensive", label: "The service is too expensive" },
  { value: "found_alternative", label: "I found a better alternative" },
  { value: "privacy_concerns", label: "Privacy concerns" },
  { value: "technical_issues", label: "Technical issues or bugs" },
  { value: "missing_features", label: "Missing features I need" },
  { value: "temporary_project", label: "Project completed / temporary use" },
  { value: "other", label: "Other reason" }
];

export default function AccountDeletionDialog({ trigger, className }: AccountDeletionDialogProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [additionalReason, setAdditionalReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [step, setStep] = useState<'check' | 'confirm' | 'paid-warning' | 'deleted'>('check');
  const [eligibility, setEligibility] = useState<DeletionEligibility | null>(null);
  const [confirmedPaidDeletion, setConfirmedPaidDeletion] = useState(false);
  const [confirmations, setConfirmations] = useState({
    dataRetention: false,
    creditWriteOff: false,
    immediateRevocation: false,
    irreversible: false
  });
  const { toast } = useToast();

  // Load user email and check eligibility when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('check');
      setIsLoading(true);
      loadUserAndCheckEligibility();
    } else {
      // Reset state when dialog closes
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setSelectedReason("");
    setAdditionalReason("");
    setConfirmText("");
    setConfirmedPaidDeletion(false);
    setConfirmations({
      dataRetention: false,
      creditWriteOff: false,
      immediateRevocation: false,
      irreversible: false
    });
    setStep('check');
    setEligibility(null);
  };

  const loadUserAndCheckEligibility = async () => {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.email) {
          setEmail(user.email);

          // Check deletion eligibility from backend
          const response = await AivedhaAPI.checkDeletionEligibility(user.email);
          setEligibility(response);

          if (response.hasActivePaidPlan) {
            setStep('paid-warning');
          } else {
            setStep('confirm');
          }
        }
      }
    } catch (err) {
      logger.error('Error checking deletion eligibility:', err);
      setStep('confirm'); // Proceed to confirm even if check fails
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmationChange = (key: keyof typeof confirmations, checked: boolean) => {
    setConfirmations(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  const getDeletionReason = () => {
    const reasonLabel = DELETION_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
    if (selectedReason === 'other' && additionalReason.trim()) {
      return `${reasonLabel}: ${additionalReason.trim()}`;
    }
    return additionalReason.trim() ? `${reasonLabel}. Additional: ${additionalReason.trim()}` : reasonLabel;
  };

  const isFormValid = () => {
    return (
      isValidEmail(email) &&
      selectedReason.length > 0 &&
      (selectedReason !== 'other' || additionalReason.trim().length >= 10) &&
      confirmText.toLowerCase() === "delete my account" &&
      Object.values(confirmations).every(Boolean) &&
      (!eligibility?.hasActivePaidPlan || confirmedPaidDeletion)
    );
  };

  const handleProceedFromWarning = () => {
    setConfirmedPaidDeletion(true);
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast({
        title: "Form Incomplete",
        description: "Please complete all required fields and confirmations.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await AivedhaAPI.deleteAccount(email, email, {
        reason: getDeletionReason(),
        confirmedPaidDeletion: confirmedPaidDeletion
      });

      if (response.success) {
        setStep('deleted');

        // Clear all local storage data after short delay to show success
        setTimeout(() => {
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.clear();

          // Close dialog and redirect to home
          setIsOpen(false);
          navigate('/', { replace: true });
        }, 3000);
      } else if (response.requiresConfirmation && response.hasActivePaidPlan) {
        // Backend requires paid plan confirmation
        setEligibility({
          canDelete: true,
          hasActivePaidPlan: true,
          subscriptionPlan: response.subscriptionPlan ?? '',
          subscriptionStatus: 'active',
          planEndDate: response.planEndDate ?? null,
          credits: 0,
          requiresConfirmation: true,
          warningMessage: response.warningMessage ?? null
        });
        setStep('paid-warning');
      } else {
        throw new Error(response.error || 'Account deletion failed');
      }
    } catch (error: unknown) {
      logger.error('Account deletion error:', error);
      toast({
        title: "Deletion Failed",
        description: getErrorMessage(error) || "Failed to process account deletion. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    // Loading state
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Checking account status...</p>
        </div>
      );
    }

    // Deleted state - show success message
    if (step === 'deleted') {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Account Permanently Deleted</h3>
          <p className="text-muted-foreground mb-4">Your account and all associated data have been deleted.</p>
          <p className="text-xs text-muted-foreground">
            * Records will be retained for 90 days for legal compliance and may be provided to legal bodies if required.
          </p>
          <p className="text-sm text-muted-foreground mt-4">Redirecting to home page...</p>
        </div>
      );
    }

    // Paid plan warning step
    if (step === 'paid-warning' && eligibility?.hasActivePaidPlan) {
      return (
        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="border-2 border-yellow-500/50 bg-yellow-500/10 rounded-2xl p-6 text-center">
            <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-yellow-700 mb-2">Active Paid Plan Detected</h3>
            <p className="text-yellow-600 mb-4">
              You have an active <strong>{eligibility.subscriptionPlan}</strong> subscription
              {eligibility.planEndDate && (
                <> until <strong>{new Date(eligibility.planEndDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</strong></>
              )}.
            </p>
            {eligibility.credits > 0 && (
              <p className="text-yellow-600">
                You will also forfeit <strong>{eligibility.credits} credits</strong>.
              </p>
            )}
          </div>

          {/* Warning Details */}
          <div className="border border-destructive/30 rounded-2xl p-4 bg-destructive/5">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive">Important Warning</h4>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Your remaining subscription time will be forfeited immediately</li>
                  <li>• No refunds will be provided for unused subscription time</li>
                  <li>• All credits will be written off without compensation</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1 border-2"
            >
              Keep My Account
            </Button>
            <Button
              variant="destructive"
              onClick={handleProceedFromWarning}
              className="flex-1"
            >
              I Understand, Continue
            </Button>
          </div>
        </div>
      );
    }

    // Main confirmation form
    return (
      <div className="space-y-6 mt-6">
        {/* Warning Notice */}
        <div className="border border-destructive/20 rounded-2xl p-4 space-y-3">
          <h4 className="font-semibold text-destructive">Important Notice:</h4>
          <ul className="space-y-1 text-muted-foreground text-sm">
            <li>• Account access will be revoked immediately upon confirmation</li>
            <li>• All unused credits will be permanently written off without refund</li>
            <li>• Personal data will be retained for 90 days for legal compliance*</li>
            <li>• Audit reports and transaction history will be archived</li>
            <li>• This action is irreversible and cannot be undone</li>
          </ul>
        </div>

        {/* Required Information */}
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Required Information:</h4>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Deletion *</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {DELETION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReason && (
            <div className="space-y-2">
              <Label htmlFor="additionalReason">
                {selectedReason === 'other' ? 'Please specify *' : 'Additional comments (optional)'}
              </Label>
              <Textarea
                id="additionalReason"
                value={additionalReason}
                onChange={(e) => setAdditionalReason(e.target.value)}
                placeholder={selectedReason === 'other' ? 'Please provide more details (minimum 10 characters)' : 'Any additional feedback...'}
                className="min-h-[80px]"
              />
              {selectedReason === 'other' && (
                <p className="text-xs text-muted-foreground">
                  Characters: {additionalReason.length}/10 minimum
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm">Type "DELETE MY ACCOUNT" to confirm *</Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
            />
          </div>
        </div>

        {/* Mandatory Confirmations */}
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Mandatory Confirmations:</h4>

          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="dataRetention"
                checked={confirmations.dataRetention}
                onCheckedChange={(checked) => handleConfirmationChange('dataRetention', !!checked)}
              />
              <Label htmlFor="dataRetention" className="text-sm">
                I understand that my personal data will be retained for 90 days for legal and compliance purposes,
                after which it will be permanently deleted from all systems.
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="creditWriteOff"
                checked={confirmations.creditWriteOff}
                onCheckedChange={(checked) => handleConfirmationChange('creditWriteOff', !!checked)}
              />
              <Label htmlFor="creditWriteOff" className="text-sm">
                I acknowledge that all unused credits will be immediately written off and no refunds
                will be provided under any circumstances.
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="immediateRevocation"
                checked={confirmations.immediateRevocation}
                onCheckedChange={(checked) => handleConfirmationChange('immediateRevocation', !!checked)}
              />
              <Label htmlFor="immediateRevocation" className="text-sm">
                I understand that my account access will be revoked immediately upon confirmation,
                and I will no longer be able to access any services or data.
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="irreversible"
                checked={confirmations.irreversible}
                onCheckedChange={(checked) => handleConfirmationChange('irreversible', !!checked)}
              />
              <Label htmlFor="irreversible" className="text-sm">
                I confirm that this action is irreversible and permanent. Once deleted,
                my account cannot be recovered or restored.
              </Label>
            </div>

            {eligibility?.hasActivePaidPlan && (
              <div className="flex items-start space-x-2 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                <Checkbox
                  id="paidPlanConfirm"
                  checked={confirmedPaidDeletion}
                  onCheckedChange={(checked) => setConfirmedPaidDeletion(!!checked)}
                />
                <Label htmlFor="paidPlanConfirm" className="text-sm text-yellow-700">
                  I confirm I want to delete my account even though I have an active <strong>{eligibility.subscriptionPlan}</strong> plan.
                  I understand I will forfeit all remaining subscription time and credits.
                </Label>
              </div>
            )}
          </div>
        </div>

        {/* Data Retention Details */}
        <div className="border border-border/50 rounded-2xl p-4 space-y-3">
          <h4 className="font-semibold text-foreground">90-Day Data Retention Policy:</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <strong>Retained for 90 days:</strong>
              <ul className="mt-1 ml-4 space-y-1">
                <li>• Email address and contact information</li>
                <li>• Transaction history and payment records</li>
                <li>• Account activity logs</li>
                <li>• Legal compliance documentation</li>
              </ul>
            </div>
            <div>
              <strong>Immediately deleted:</strong>
              <ul className="mt-1 ml-4 space-y-1">
                <li>• Login credentials and session data</li>
                <li>• Unused credits and account balance</li>
                <li>• Personalized preferences and settings</li>
                <li>• Active service access and permissions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-4 pt-4">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="flex-1 border-2 border-muted-foreground/30 hover:bg-muted-foreground hover:text-background hover:border-muted-foreground transition-all duration-300 hover:-translate-y-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="flex-1 border-2 border-transparent hover:bg-transparent hover:text-destructive hover:border-destructive transition-all duration-300 hover:-translate-y-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete My Account
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          * Records will not be recoverable to the user, but will be retained for 90 days and may be provided to legal bodies if required by law.
        </p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className={`btn-danger px-4 py-2 ${className || ''}`}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border/30 rounded-b-xl">
          <DialogTitle className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Permanent Account Deletion</span>
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please read carefully and provide the required information.
          </DialogDescription>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
