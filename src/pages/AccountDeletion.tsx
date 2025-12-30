import { Layout } from "@/components/Layout";
import AccountDeletionDialog from "@/components/AccountDeletionDialog";
import { Button } from "@/components/ui/button";
import { Trash2, Shield, AlertTriangle } from "lucide-react";

export default function AccountDeletion() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Account Deletion</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Permanently delete your AiVedha Guard account and all associated data. 
              This action cannot be undone.
            </p>
          </div>

          {/* Information Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground">Data Protection</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Personal data retained for 90 days for legal compliance</p>
                <p>• Login credentials deleted immediately</p>
                <p>• Transaction history archived for records</p>
                <p>• All preferences and settings removed</p>
              </div>
            </div>

            <div className="border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Trash2 className="h-6 w-6 text-destructive" />
                <h3 className="font-semibold text-foreground">What Gets Deleted</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Account access revoked immediately</p>
                <p>• All unused credits written off permanently</p>
                <p>• No refunds provided under any circumstances</p>
                <p>• Account cannot be recovered or restored</p>
              </div>
            </div>
          </div>

          {/* Process Steps */}
          <div className="border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Deletion Process</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-sm font-semibold">
                  1
                </div>
                <h4 className="font-medium text-foreground">Submit Request</h4>
                <p className="text-xs text-muted-foreground">Complete the deletion form with required information</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-sm font-semibold">
                  2
                </div>
                <h4 className="font-medium text-foreground">Email Confirmation</h4>
                <p className="text-xs text-muted-foreground">Receive confirmation email within 24 hours</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-sm font-semibold">
                  3
                </div>
                <h4 className="font-medium text-foreground">Processing Complete</h4>
                <p className="text-xs text-muted-foreground">Account deleted within 7 business days</p>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="border border-destructive/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <h3 className="font-semibold text-destructive">Important Notice</h3>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Account deletion is <strong>permanent and irreversible</strong>. Once your deletion request is processed:
              </p>
              <ul className="ml-4 space-y-1">
                <li>• You will lose access to all services immediately</li>
                <li>• All unused credits will be forfeited without refund</li>
                <li>• Your account cannot be recovered or restored</li>
                <li>• You will need to create a new account to use our services again</li>
              </ul>
            </div>
          </div>

          {/* Action button */}
          <div className="text-center pt-6">
            <AccountDeletionDialog
              trigger={
                <Button variant="destructive" className="px-8 py-3">
                  <Trash2 className="h-5 w-5 mr-2" />
                  Request Account Deletion
                </Button>
              }
            />
            <p className="text-xs text-muted-foreground mt-4 max-w-md mx-auto">
              By proceeding, you acknowledge that you have read and understood our account deletion policy 
              and the consequences of permanent account removal.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}