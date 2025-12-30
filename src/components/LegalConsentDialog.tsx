import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Shield, Scale, FileText, ExternalLink } from "lucide-react";

interface LegalConsentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
    url: string;
}

export default function LegalConsentDialog({
    isOpen,
    onClose,
    onAccept,
    url,
}: LegalConsentDialogProps) {
    const [acceptedTerms, setAcceptedTerms] = useState(true);
    const [acceptedOwnership, setAcceptedOwnership] = useState(true);
    const [acceptedRisk, setAcceptedRisk] = useState(true);

    const isFormValid = acceptedTerms && acceptedOwnership && acceptedRisk;

    const handleAccept = () => {
        if (isFormValid) {
            // Keep checkboxes checked for better UX on repeat audits
            onAccept();
        }
    };

    const handleClose = () => {
        // Keep checkboxes checked for quick re-access
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader className="pb-3 border-b border-border/30 rounded-b-xl">
                    <DialogTitle className="flex items-center space-x-2 text-foreground">
                        <Scale className="h-6 w-6 text-primary" />
                        <span>Legal Consent Required</span>
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Please read and accept the following terms before proceeding with the security audit.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 mt-4">
                    {/* URL Display */}
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                        <p className="text-sm text-muted-foreground mb-1">Target URL:</p>
                        <p className="font-mono text-sm text-primary break-all">{url}</p>
                    </div>

                    {/* Warning Notice */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <h4 className="font-semibold text-amber-600 dark:text-amber-400">Important Legal Notice</h4>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>Security audits scan websites for vulnerabilities and may trigger security alerts on the target system.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>You must have legal authorization to scan the target URL. Unauthorized scanning may violate computer security laws.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>AiVedha Guard performs non-intrusive assessments only, but some security systems may detect and log the activity.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Consent Checkboxes */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-foreground flex items-center space-x-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span>Required Acknowledgements</span>
                        </h4>

                        <div className="space-y-3">
                            <div className="flex items-start space-x-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                <Checkbox
                                    id="ownership"
                                    checked={acceptedOwnership}
                                    onCheckedChange={(checked) => setAcceptedOwnership(!!checked)}
                                    className="mt-0.5"
                                />
                                <Label htmlFor="ownership" className="text-sm cursor-pointer leading-relaxed">
                                    I confirm that I <strong>own this website/URL</strong> or have explicit written authorization from the owner to perform security assessments on it.
                                </Label>
                            </div>

                            <div className="flex items-start space-x-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                <Checkbox
                                    id="risk"
                                    checked={acceptedRisk}
                                    onCheckedChange={(checked) => setAcceptedRisk(!!checked)}
                                    className="mt-0.5"
                                />
                                <Label htmlFor="risk" className="text-sm cursor-pointer leading-relaxed">
                                    I understand and accept <strong>full legal responsibility</strong> for any consequences arising from this security audit, including any claims from third parties.
                                </Label>
                            </div>

                            <div className="flex items-start space-x-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                <Checkbox
                                    id="terms"
                                    checked={acceptedTerms}
                                    onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
                                    className="mt-0.5"
                                />
                                <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
                                    I have read and agree to the{" "}
                                    <Link to="/terms" target="_blank" className="text-primary hover:underline inline-flex items-center">
                                        Terms of Service <ExternalLink className="h-3 w-3 ml-0.5" />
                                    </Link>{" "}
                                    and{" "}
                                    <Link to="/privacy" target="_blank" className="text-primary hover:underline inline-flex items-center">
                                        Privacy Policy <ExternalLink className="h-3 w-3 ml-0.5" />
                                    </Link>
                                    .
                                </Label>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="flex-1 rounded-xl border-2 border-muted-foreground/30 hover:bg-muted-foreground hover:text-background hover:border-muted-foreground transition-all duration-300 hover:-translate-y-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAccept}
                            disabled={!isFormValid}
                            autoFocus
                            className="flex-1 bg-gradient-to-r from-primary to-accent text-white rounded-xl disabled:opacity-50 transition-all duration-300 shadow-lg border-2 border-transparent hover:bg-transparent hover:bg-none hover:text-primary hover:border-primary hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                            <Shield className="h-4 w-4 mr-2" />
                            I Agree - Start Audit
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        By clicking "I Agree", you acknowledge that you have read, understood, and accept the terms above.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
