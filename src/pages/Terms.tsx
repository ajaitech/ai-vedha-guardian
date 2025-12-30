import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config";
import {
    AlertTriangle,
    Shield,
    Clock,
    DollarSign,
    FileText,
    Users,
    Globe,
    Gavel,
    Scale,
    Trash2,
} from "lucide-react";
import AccountDeletionDialog from "@/components/AccountDeletionDialog";

export default function Terms() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <Layout>
            <div className="min-h-screen bg-background pt-8 pb-12">
                <div className="container mx-auto px-4 max-w-5xl">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="flex items-center justify-center mb-4">
                            <div className="relative">
                                <FileText className="h-16 w-16 text-primary animate-pulse-glow" />
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-md" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                            Terms &amp;{" "}
                            <span className="bg-gradient-primary bg-clip-text text-transparent">
                                Conditions
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            These terms govern your use of AiVedha Guard, operated by AiVibe
                            Software Services Pvt Ltd. Please read them carefully.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Last updated: December 2025
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            This document is informational and does not constitute legal advice.
                        </p>
                    </div>

                    {/* Terms Sections */}
                    <div className="space-y-8">
                        {/* 1. Introduction & Acceptance */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Shield className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        1. Introduction &amp; Acceptance of Terms
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    These Terms &amp; Conditions (&quot;Terms&quot;) govern your access
                                    to and use of the AiVedha Guard platform and related services
                                    (collectively, the &quot;Service&quot;), provided by{" "}
                                    <strong className="text-foreground">
                                        AiVibe Software Services Pvt Ltd
                                    </strong>
                                    , including its brand and product name &quot;AiVedha Guard&quot;
                                    (collectively, &quot;AiVibe&quot;, &quot;we&quot;, &quot;us&quot;,
                                    or &quot;our&quot;).
                                </p>
                                <p>
                                    By accessing or using the Service, creating an account, or submitting
                                    any URL or asset for analysis, you agree to be bound by these Terms.
                                    If you do not agree, you must not use the Service.
                                </p>
                                <p className="text-xs">
                                    If you are using the Service on behalf of an organization, you
                                    represent that you have the authority to bind that organization to
                                    these Terms. In that case, &quot;you&quot; and &quot;your&quot;
                                    refers to that organization.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 2. Service Description & Scope */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Globe className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        2. Service Description &amp; Scope of Use
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    AiVedha Guard is a cloud-based, AI-assisted security analysis
                                    platform designed to perform automated, non-intrusive security
                                    assessments on URLs and digital assets that you submit. The Service
                                    generates technical reports, risk indicators, and recommendations
                                    solely for informational and advisory purposes.
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        • The Service focuses on publicly accessible web resources (such as
                                        websites, APIs, and endpoints) that you choose to submit.
                                    </li>
                                    <li>
                                        • The Service does <strong>not</strong> guarantee comprehensive,
                                        exhaustive, or error-free identification of all security issues.
                                    </li>
                                    <li>
                                        • The Service does <strong>not</strong> replace professional
                                        penetration testing, code review, security architecture assessments,
                                        or legal/compliance audits.
                                    </li>
                                </ul>
                                <p className="text-xs">
                                    The outcomes, ratings, scores, and recommendations provided by the
                                    Service must be interpreted by qualified professionals in the context
                                    of your environment. You remain fully responsible for final decisions
                                    and actions taken based on the reports.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 3. Authorization, Public URLs & User Responsibility */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Users className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        3. Authorization, Public URLs &amp; User Responsibility
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    By submitting any URL, domain, IP address, application, or digital
                                    asset to AiVedha Guard, you confirm and warrant that:
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        • You own the asset or have clear written authorization from the
                                        lawful owner or controller to perform security assessments.
                                    </li>
                                    <li>
                                        • Your use of the Service does not violate any applicable law,
                                        regulation, contract, website terms of service, acceptable use
                                        policy, or sector-specific rule.
                                    </li>
                                    <li>
                                        • You understand that public accessibility of a URL does{" "}
                                        <strong className="text-foreground">not</strong> automatically grant
                                        a legal right to perform security testing or scanning on that
                                        system.
                                    </li>
                                    <li>
                                        • You will not use the Service to perform intrusive, destructive,
                                        or disruptive activities such as exploitation, denial of service,
                                        brute-force attempts, or intentional data extraction beyond the
                                        intended scope of analysis.
                                    </li>
                                </ul>
                                <p className="text-xs">
                                    You are solely responsible for ensuring that your use of AiVedha
                                    Guard is lawful and properly authorized. AiVibe does not verify your
                                    authorization and is not responsible for any disputes or consequences
                                    arising from unauthorized testing initiated by you.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 4. No Legal / Regulatory Advice & Global Use */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Scale className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        4. No Legal, Regulatory or Compliance Advice
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    AiVibe does not provide legal, regulatory, compliance, or sectoral
                                    advice (including banking, government, telecom, healthcare, financial
                                    services, or critical infrastructure).
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        • You must consult with your own legal and compliance advisers to
                                        understand your obligations under applicable laws, including but not
                                        limited to data protection, cyber security, financial regulations,
                                        government security policies, and industry standards.
                                    </li>
                                    <li>
                                        • Reports and scores produced by AiVedha Guard do not constitute
                                        certification, approval, or endorsement by any regulator or
                                        authority.
                                    </li>
                                    <li>
                                        • You are solely responsible for ensuring that the use of the
                                        Service is permitted under the laws of your jurisdiction and any
                                        jurisdiction in which the target systems are located.
                                    </li>
                                </ul>
                                <p className="text-xs">
                                    Global access to the Service does not mean the Service is appropriate
                                    or legal for use in every country. Where local law imposes additional
                                    requirements, those remain your responsibility to understand and
                                    comply with.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 5. Fees, Billing, No Refunds */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <DollarSign className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        5. Fees, Billing &amp; Strict No Refund Policy
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    Access to AiVedha Guard may be provided on a subscription, credit, or
                                    usage basis. Fees are displayed at the time of purchase or as agreed
                                    in a separate written agreement.
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        • All fees, charges, and payments are{" "}
                                        <strong className="text-foreground">non-refundable</strong> unless
                                        explicitly required by applicable law or expressly agreed in a
                                        signed contract.
                                    </li>
                                    <li>
                                        • No refunds are provided for unused credits, partial subscription
                                        periods, dissatisfaction with results, changes in business
                                        priorities, or any form of service unavailability or limitation.
                                    </li>
                                    <li>
                                        • Credits (if applicable) may have an expiry period communicated in
                                        the product or invoice; expired credits cannot be reinstated or
                                        refunded.
                                    </li>
                                    <li>
                                        • You are responsible for all taxes, duties, or regulatory levies
                                        related to your purchases, except for taxes on AiVibe&apos;s income.
                                    </li>
                                </ul>
                                <p className="text-xs">
                                    By proceeding with any payment, you acknowledge and agree that all
                                    amounts paid to AiVibe for AiVedha Guard are final and non-refundable,
                                    subject only to mandatory consumer rights that cannot legally be
                                    waived in your jurisdiction.
                                </p>

                                <h4 className="font-semibold text-foreground mt-4">PayPal Payment Processing:</h4>
                                <p className="text-sm">
                                    All payments are processed securely through PayPal. By making a purchase,
                                    you agree to be bound by{" "}
                                    <a href="https://www.paypal.com/webapps/mpp/ua/useragreement-full"
                                       target="_blank" rel="noopener noreferrer"
                                       className="text-primary hover:underline">PayPal&apos;s User Agreement</a>
                                    {" "}and{" "}
                                    <a href="https://www.paypal.com/webapps/mpp/ua/privacy-full"
                                       target="_blank" rel="noopener noreferrer"
                                       className="text-primary hover:underline">Privacy Policy</a>.
                                    Payment disputes must first be raised with our support team before
                                    initiating any chargeback or PayPal dispute. All pricing is in USD
                                    for global customers.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 6. No SLA, Support & Response Expectations */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Clock className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        6. Support, Availability &amp; No Service-Level Agreement (SLA)
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    AiVibe may provide technical or account support on a{" "}
                                    <strong className="text-foreground">
                                        commercially reasonable efforts
                                    </strong>{" "}
                                    basis only.{" "}
                                    <strong className="text-foreground">
                                        No service-level agreement (SLA) is defined or guaranteed
                                    </strong>{" "}
                                    for response or resolution times.
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        • We may, at our discretion, attempt to respond to support requests
                                        within a broad indicative window, generally ranging from{" "}
                                        <strong>7 (seven) to 30 (thirty) working days</strong> or longer,
                                        depending on complexity and internal workload.
                                    </li>
                                    <li>
                                        • These indicative timelines are not binding promises, and delays
                                        beyond these ranges do <strong>not</strong> create any right to
                                        compensation, credits, or refunds.
                                    </li>
                                    <li>
                                        • Support channels and availability may vary by region, language,
                                        time zone, and subscription type, and may be changed, reduced, or
                                        suspended at any time.
                                    </li>
                                </ul>
                                <p className="text-xs">
                                    No uptime commitment, response guarantee, or resolution guarantee is
                                    provided as part of these Terms. Any separate SLA must be in a
                                    dedicated, signed agreement to be valid.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 7. No Guarantee, Data Loss & Hacking Disclaimer */}
                        <Card className="rounded-3xl border-2 border-destructive/50 shadow-elegant bg-destructive/5">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    <span className="text-foreground">
                                        7. No Security Guarantee, No Data Protection Guarantee
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    AiVedha Guard is a diagnostic tool only. We do{" "}
                                    <strong className="text-foreground">not</strong> guarantee that:
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li>• Your systems, websites, or applications are secure;</li>
                                    <li>• All vulnerabilities or threats will be detected or reported;</li>
                                    <li>
                                        • Implementing our recommendations will prevent future attacks,
                                        breaches, or incidents;
                                    </li>
                                    <li>
                                        • Data will never be lost, altered, intercepted, or accessed by
                                        unauthorized parties.
                                    </li>
                                </ul>
                                <p>
                                    To the maximum extent permitted by law, AiVibe, AiVedha Guard, and
                                    their directors, officers, employees, and affiliates are{" "}
                                    <strong className="text-foreground">
                                        not responsible or liable
                                    </strong>{" "}
                                    for:
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li>• Any hacking attempt, security breach, or cyber attack;</li>
                                    <li>
                                        • Any data loss, data corruption, unauthorized access, or disclosure;
                                    </li>
                                    <li>
                                        • Any service disruption, downtime, or unavailability of your
                                        systems;
                                    </li>
                                    <li>
                                        • Any direct or indirect loss, including financial loss, arising
                                        from or related to security incidents, even if mentioned in or
                                        related to our reports.
                                    </li>
                                </ul>
                                <p className="text-xs">
                                    You acknowledge that security risk can never be fully eliminated and
                                    that AiVedha Guard is one tool among many in a broader security
                                    program for which you are solely responsible.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 8. Limitation of Liability & Indemnity */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <AlertTriangle className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        8. Limitation of Liability &amp; Indemnity
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <h4 className="font-semibold text-foreground">
                                    Limitation of Liability
                                </h4>
                                <p>
                                    To the fullest extent permitted by applicable law, AiVibe and its
                                    affiliates shall{" "}
                                    <strong className="text-foreground">not be liable</strong> for any:
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        • Indirect, incidental, consequential, special, exemplary, or
                                        punitive damages;
                                    </li>
                                    <li>
                                        • Loss of profits, revenue, business, goodwill, or data; or
                                    </li>
                                    <li>
                                        • Claims arising from third-party actions, regulatory sanctions, or
                                        contractual penalties imposed on you.
                                    </li>
                                </ul>
                                <p>
                                    Where liability cannot be fully excluded by law, our total aggregate
                                    liability for all claims arising out of or related to the Service
                                    shall be limited to the lesser of:
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li>• The total amount you paid for the Service in the 12 months</li>
                                    <li>• or USD 100 (one hundred US dollars), whichever is lower.</li>
                                </ul>

                                <h4 className="font-semibold text-foreground mt-4">Indemnity</h4>
                                <p>
                                    You agree to indemnify, defend, and hold harmless AiVibe, AiVedha
                                    Guard, and their directors, officers, employees, and agents from any
                                    claims, losses, liabilities, damages, costs, and expenses (including
                                    reasonable legal fees) arising out of or related to:
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li>• Your use or misuse of the Service;</li>
                                    <li>• Any scans, tests, or assessments initiated by you;</li>
                                    <li>• Your violation of these Terms or any applicable law;</li>
                                    <li>
                                        • Any claim brought by a third party regarding unauthorized or
                                        improper testing of their systems using AiVedha Guard.
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        {/* 9. Governing Law & Jurisdiction */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Gavel className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        9. Governing Law, Jurisdiction &amp; Disputes
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    Except where prohibited by mandatory local law, these Terms and any
                                    dispute arising out of or relating to the Service shall be governed by
                                    and construed in accordance with the laws of{" "}
                                    <strong className="text-foreground">India</strong>.
                                </p>
                                <p>
                                    You agree that the{" "}
                                    <strong className="text-foreground">
                                        courts located in Chennai, Tamil Nadu, India
                                    </strong>{" "}
                                    shall have exclusive jurisdiction over all disputes, claims, or legal
                                    proceedings arising out of or relating to AiVedha Guard or AiVibe,
                                    and you consent to personal jurisdiction and venue in those courts to
                                    the extent permitted by law.
                                </p>
                                <p className="text-xs">
                                    To the maximum extent allowed by applicable law, any legal expenses,
                                    costs, or fees that you incur in attempting to bring claims against
                                    AiVibe shall be borne solely by you, and AiVibe shall have no
                                    obligation to compensate or reimburse such costs unless specifically
                                    ordered by a court of competent jurisdiction.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 10. Modifications & Termination */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Globe className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        10. Modifications, Suspension &amp; Termination
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    AiVibe may modify the Service, update these Terms, or suspend/terminate
                                    your access at any time, for any reason, including but not limited to
                                    maintenance, security concerns, misuse, or legal/regulatory
                                    requirements.
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        • We will use reasonable efforts to provide notice of material
                                        changes to these Terms, but are not obligated to do so in all
                                        circumstances.
                                    </li>
                                    <li>
                                        • Continued use of the Service after changes take effect constitutes
                                        your acceptance of the updated Terms.
                                    </li>
                                    <li>
                                        • Termination of your account does not entitle you to any refund of
                                        previously paid fees or unused credits, except where required by
                                        law.
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        {/* 11. Contact & Support (with NO SLA reminder) */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Clock className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">11. Contact &amp; Support</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>For general queries or support, you can reach us at:</p>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        • Support:{" "}
                                        <span className="text-primary font-medium">
                                            {APP_CONFIG.SUPPORT_EMAIL}
                                        </span>
                                    </li>
                                    <li>
                                        • Security &amp; Abuse:{" "}
                                        <span className="text-primary font-medium">
                                            {APP_CONFIG.SECURITY_EMAIL}
                                        </span>
                                    </li>
                                    <li>
                                        • Legal &amp; Terms:{" "}
                                        <span className="text-primary font-medium">
                                            {APP_CONFIG.LEGAL_EMAIL}
                                        </span>
                                    </li>
                                </ul>
                                <p className="text-xs">
                                    As noted above, we do not provide any binding SLA. Response times can
                                    vary significantly and may range from approximately 7 to 30 working
                                    days or more depending on complexity, time zones, and workload, with
                                    no guarantee or obligation.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 12. Account Management & Deletion */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Trash2 className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        12. Account Management &amp; Deletion
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-2">
                                            Account Deletion
                                        </h4>
                                        <p className="text-sm mb-4">
                                            If you would like to permanently delete your account, you may
                                            submit a deletion request. Please note that deletion is{" "}
                                            <strong className="text-foreground">
                                                irreversible and may result in immediate loss of access
                                            </strong>{" "}
                                            to all reports, credits, and data associated with your account.
                                        </p>
                                        <AccountDeletionDialog
                                            trigger={
                                                <Button variant="destructive" size="sm" className="px-3 py-1.5">
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Request Account Deletion
                                                </Button>
                                            }
                                        />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-2">
                                            Data After Deletion
                                        </h4>
                                        <ul className="space-y-2 text-sm">
                                            <li>
                                                • Some data may be retained for a limited period for legal,
                                                regulatory, or security reasons.
                                            </li>
                                            <li>
                                                • Unused credits and subscriptions will be forfeited and are
                                                not refundable.
                                            </li>
                                            <li>
                                                • Access to the Service will be revoked as soon as deletion is
                                                processed.
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 13. Miscellaneous */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="text-foreground">
                                    13. Miscellaneous Provisions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        • If any provision of these Terms is found to be invalid or
                                        unenforceable, the remaining provisions will remain in full force
                                        and effect.
                                    </li>
                                    <li>
                                        • Our failure to enforce any right or provision does not constitute
                                        a waiver of that right or provision.
                                    </li>
                                    <li>
                                        • These Terms, together with any referenced policies (including the
                                        Privacy &amp; Legal Policy), constitute the entire agreement between
                                        you and AiVibe regarding the Service, unless superseded by a
                                        separate signed agreement.
                                    </li>
                                    <li>
                                        • In the event of any conflict between these online Terms and a
                                        signed written contract, the signed contract will prevail to the
                                        extent of the conflict.
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
