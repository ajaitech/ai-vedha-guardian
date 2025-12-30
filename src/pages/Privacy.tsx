import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_CONFIG } from "@/config";
import {
    Shield,
    Eye,
    Database,
    Cookie,
    Mail,
    Users,
    Lock,
    AlertTriangle,
    Globe2,
    Scale,
    Gavel,
} from "lucide-react";

export default function Privacy() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <Layout>
            <div className="min-h-screen bg-background pt-8 pb-12">
                <div className="container mx-auto px-4 max-w-4xl">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="flex items-center justify-center mb-4">
                            <div className="relative">
                                <Shield className="h-16 w-16 text-primary animate-pulse-glow" />
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-md" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                            Privacy &amp;{" "}
                            <span className="bg-gradient-primary bg-clip-text text-transparent">
                                Legal Policy
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            How AiVibe Software Services Pvt Ltd (&quot;AiVibe&quot;), operating the
                            AiVedha Guard security audit platform, handles data, security, and
                            responsibilities.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Last updated: December 2025 (subject to further revisions)
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            This document is provided for transparency and information only and does
                            not constitute legal advice.
                        </p>
                    </div>

                    {/* Sections */}
                    <div className="space-y-8">
                        {/* Scope of Service & User Responsibility */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Globe2 className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        Scope of Service &amp; User Responsibility
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    AiVedha Guard is a security analysis and reporting tool provided by{" "}
                                    <strong className="text-foreground">
                                        AiVibe Software Services Pvt Ltd
                                    </strong>{" "}
                                    (&quot;AiVibe&quot;), designed to perform non-intrusive security
                                    assessments on URLs and assets that <strong>you</strong> submit.
                                </p>
                                <ul className="space-y-2">
                                    <li>
                                        • You confirm that you have the full legal right, authorization, or
                                        ownership to submit any URL, domain, IP address, API endpoint, or
                                        digital asset for security analysis.
                                    </li>
                                    <li>
                                        • You acknowledge that{" "}
                                        <strong className="text-foreground">you are solely responsible</strong>{" "}
                                        for ensuring that any scan you initiate complies with all applicable
                                        laws, regulations, contracts, website terms of use, acceptable use
                                        policies, and sector-specific rules (including but not limited to
                                        banking, financial services, healthcare, telecom, and government
                                        portals).
                                    </li>
                                    <li>
                                        • Public accessibility of a website or URL on the internet{" "}
                                        <strong className="text-foreground">
                                            does not override or cancel
                                        </strong>{" "}
                                        any legal, regulatory, contractual, or technical restrictions that may
                                        apply to testing, crawling, or automated analysis of that website.
                                    </li>
                                    <li>
                                        • Submission of a URL to AiVedha Guard is treated as{" "}
                                        <strong className="text-foreground">your instruction</strong> to
                                        perform automated analysis on that publicly accessible resource. All
                                        risk arising from such instruction rests with you.
                                    </li>
                                    <li>
                                        • You must not use AiVedha Guard to perform{" "}
                                        <strong className="text-foreground">
                                            unauthorized, intrusive, destructive, or disruptive
                                        </strong>{" "}
                                        activities, including but not limited to exploitation, denial of
                                        service, or intentional data exfiltration.
                                    </li>
                                </ul>
                                <p className="text-xs text-muted-foreground">
                                    Nothing in this policy authorizes you to ignore or violate any law,
                                    regulation, or contract. It is your responsibility to obtain any
                                    required approvals (including written permissions, letters of
                                    engagement, or contracts) before initiating security assessments on
                                    third-party systems.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Information We Collect */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Database className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">Information We Collect</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <h4 className="font-semibold text-foreground">Personal Information</h4>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li>• Name, email address, and account credentials</li>
                                    <li>
                                        • Payment information (processed securely through integrated payment
                                        gateways; AiVibe does not store raw card details)
                                    </li>
                                    <li>• IP address and approximate geolocation</li>
                                    <li>• Device identifiers, operating system, and browser type</li>
                                </ul>

                                <h4 className="font-semibold text-foreground mt-4">
                                    Usage &amp; Audit Information
                                </h4>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li>• URLs and assets you submit for security audits</li>
                                    <li>• Audit configuration, history, and results</li>
                                    <li>• Event logs and diagnostic data related to the scans</li>
                                    <li>• Website usage patterns and analytics</li>
                                    <li>• Support tickets, communications, and feedback</li>
                                </ul>
                            </CardContent>
                        </Card>

                        {/* How We Use Your Information */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Eye className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">How We Use Your Information</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>We use your information to:</p>
                                <ul className="space-y-2">
                                    <li>• Provide and operate the AiVedha Guard security audit services</li>
                                    <li>• Generate security reports, certificates, dashboards, and logs</li>
                                    <li>• Process subscriptions and payments and manage your account</li>
                                    <li>• Communicate with you about services, alerts, and updates</li>
                                    <li>• Improve service reliability, accuracy, and user experience</li>
                                    <li>• Detect abuse, fraud, or security misuse of our platform</li>
                                    <li>• Comply with legal, regulatory, and tax obligations</li>
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Data Storage & Security */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Lock className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">Data Storage &amp; Security</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
                                    <h4 className="font-semibold text-foreground mb-2">
                                        Cloud Infrastructure
                                    </h4>
                                    <ul className="space-y-2">
                                        <li>• Data is stored on reputable cloud infrastructure (e.g. AWS)</li>
                                        <li>• Encryption in transit (TLS) and at rest where applicable</li>
                                        <li>• Role-based access controls and audit logging</li>
                                        <li>• Backups and disaster-recovery mechanisms</li>
                                    </ul>
                                </div>
                                <p>
                                    We implement technical and organizational measures to protect your
                                    information against unauthorized access, alteration, disclosure, or
                                    destruction. However,{" "}
                                    <strong className="text-foreground">
                                        no system or service can guarantee absolute security
                                    </strong>{" "}
                                    on the internet.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Data Sharing & Third Parties */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Users className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">Data Sharing &amp; Third Parties</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    We do not sell or rent your personal information. We may share limited
                                    data with:
                                </p>
                                <ul className="space-y-2">
                                    <li>
                                        • Payment processors (e.g. PayPal or other PCI-compliant
                                        gateways) for secure billing and subscription management
                                    </li>
                                    <li>• Cloud and infrastructure providers (e.g. AWS) for hosting</li>
                                    <li>
                                        • Professional advisers (legal, accounting, security) under
                                        confidentiality
                                    </li>
                                    <li>
                                        • Regulatory, law enforcement, or government authorities where
                                        required by applicable law or valid legal process
                                    </li>
                                </ul>
                                <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 mt-4">
                                    <p>
                                        <strong className="text-foreground">Note:</strong> All third-party
                                        service providers we use are expected to follow appropriate data
                                        protection and security standards; however, AiVibe is not responsible
                                        for obligations or breaches that arise solely from such third-party
                                        services beyond our reasonable control.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cookies & Tracking */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Cookie className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">Cookies &amp; Tracking</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <h4 className="font-semibold text-foreground">
                                    We use cookies and similar technologies for:
                                </h4>
                                <ul className="space-y-2">
                                    <li>• Essential authentication and session management</li>
                                    <li>• Analytics (e.g. page performance, usage patterns)</li>
                                    <li>• Remembering your preferences and settings</li>
                                    <li>• Security monitoring and abuse detection</li>
                                </ul>
                                <p>
                                    You can manage cookies via your browser settings. Disabling certain
                                    cookies may impact core functionality (login, dashboards, etc.).
                                </p>
                            </CardContent>
                        </Card>

                        {/* Advertising & Third-Party Services */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Globe2 className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">Advertising &amp; Third-Party Services</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <h4 className="font-semibold text-foreground">
                                    Google Ads &amp; Analytics:
                                </h4>
                                <p>
                                    We use Google services including Google Ads, Google Analytics, and Google Tag Manager
                                    to understand how users interact with our platform and to display relevant advertisements.
                                    By using AiVedha Guard, you consent to:
                                </p>
                                <ul className="space-y-2">
                                    <li>• Collection of anonymized usage data for analytics purposes</li>
                                    <li>• Display of personalized advertisements based on your interests</li>
                                    <li>• Use of cookies and tracking technologies by Google services</li>
                                    <li>• Remarketing and audience targeting for advertising campaigns</li>
                                </ul>
                                <p className="text-sm">
                                    You can opt-out of personalized ads via{" "}
                                    <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer"
                                       className="text-primary hover:underline">Google Ads Settings</a>{" "}
                                    or by visiting{" "}
                                    <a href="https://www.youronlinechoices.com" target="_blank" rel="noopener noreferrer"
                                       className="text-primary hover:underline">Your Online Choices</a>.
                                </p>

                                <h4 className="font-semibold text-foreground mt-6">
                                    Payment Processing (PayPal):
                                </h4>
                                <p>
                                    We use PayPal for secure payment processing. When you make a purchase, your payment
                                    information is processed directly by PayPal under their privacy policy. We do not
                                    store your complete credit card details. By making a payment, you agree to{" "}
                                    <a href="https://www.paypal.com/webapps/mpp/ua/privacy-full" target="_blank" rel="noopener noreferrer"
                                       className="text-primary hover:underline">PayPal&apos;s Privacy Policy</a>{" "}
                                    and{" "}
                                    <a href="https://www.paypal.com/webapps/mpp/ua/useragreement-full" target="_blank" rel="noopener noreferrer"
                                       className="text-primary hover:underline">User Agreement</a>.
                                </p>

                                <h4 className="font-semibold text-foreground mt-6">
                                    Data Sharing with Partners:
                                </h4>
                                <p>
                                    We may share anonymized, aggregated data with trusted partners for:
                                </p>
                                <ul className="space-y-2">
                                    <li>• Improving service quality and security features</li>
                                    <li>• Market research and industry benchmarking</li>
                                    <li>• Academic research on cybersecurity trends</li>
                                </ul>
                                <p className="text-sm text-muted-foreground">
                                    We never sell your personal data to third parties for their marketing purposes.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Legal & Compliance Disclaimer (BIG ONE) */}
                        <Card className="rounded-3xl border border-destructive/40 shadow-elegant bg-destructive/5">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Scale className="h-5 w-5 text-destructive" />
                                    <span className="text-foreground">
                                        Legal &amp; Compliance Disclaimer
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    AiVibe and AiVedha Guard provide{" "}
                                    <strong className="text-foreground">technical tooling</strong> to help
                                    you identify potential security weaknesses in assets you choose to
                                    assess. We do <strong className="text-foreground">not</strong>:
                                </p>
                                <ul className="space-y-2">
                                    <li>
                                        • Provide legal, regulatory, or compliance advice (including but not
                                        limited to banking, government, telecom, healthcare, or data
                                        protection sectors).
                                    </li>
                                    <li>
                                        • Confirm that your use of the platform is lawful or permitted under
                                        any particular country&apos;s laws, regulations, or contracts.
                                    </li>
                                    <li>
                                        • Assume responsibility for how you interpret or act upon any
                                        vulnerabilities, findings, or recommendations.
                                    </li>
                                </ul>
                                <p>
                                    You are solely responsible for:
                                </p>
                                <ul className="space-y-2">
                                    <li>
                                        • Ensuring your use of AiVedha Guard complies with{" "}
                                        <strong className="text-foreground">
                                            all applicable local, national, and international laws
                                        </strong>
                                        , including any data protection, cyber security, information security,
                                        and computer misuse laws.
                                    </li>
                                    <li>
                                        • Respecting applicable terms of service, robots.txt rules, access
                                        control policies, and any explicit restrictions of the target system.
                                    </li>
                                    <li>
                                        • Obtaining written authorizations, approvals, or engagement letters
                                        where required for testing regulated systems (e.g. banking, payment
                                        systems, government portals, critical infrastructure).
                                    </li>
                                </ul>
                                <p className="text-xs">
                                    <strong className="text-foreground">
                                        Important clarification:
                                    </strong>{" "}
                                    The fact that a website is publicly reachable over the internet does
                                    not, by itself, grant permission to perform security testing,
                                    vulnerability scanning, or automated crawling. AiVibe does not assert or
                                    endorse any legal theory that public accessibility overrides consent or
                                    authorization requirements.
                                </p>
                            </CardContent>
                        </Card>

                        {/* No Warranty, Limitation of Liability & Indemnity */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <AlertTriangle className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        No Warranty, Limitation of Liability &amp; Indemnity
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <h4 className="font-semibold text-foreground">No Warranty</h4>
                                <p>
                                    AiVedha Guard and all related services are provided on an{" "}
                                    <strong className="text-foreground">“as is” and “as available”</strong>{" "}
                                    basis, without any express or implied warranties, including but not
                                    limited to warranties of merchantability, fitness for a particular
                                    purpose, non-infringement, or accuracy of results.
                                </p>

                                <h4 className="font-semibold text-foreground">
                                    Limitation of Liability
                                </h4>
                                <p>
                                    To the maximum extent permitted by applicable law,{" "}
                                    <strong className="text-foreground">
                                        AiVibe Software Services Pvt Ltd, AiVedha Guard, its directors,
                                        employees, contractors, and affiliates
                                    </strong>{" "}
                                    shall not be liable for:
                                </p>
                                <ul className="space-y-2">
                                    <li>
                                        • Any direct, indirect, incidental, special, consequential, punitive,
                                        or exemplary damages arising from or related to your use of the
                                        platform, audit results, or decisions you make based on those
                                        results.
                                    </li>
                                    <li>
                                        • Any alleged hacking, data loss, service disruption, or regulatory
                                        action that occurs on the target systems or third-party infrastructure
                                        in connection with audits initiated by you.
                                    </li>
                                    <li>
                                        • Any loss of profit, revenue, business opportunity, reputation, or
                                        data, even if advised of the possibility of such damages.
                                    </li>
                                </ul>
                                <p>
                                    Unless prohibited by applicable law,{" "}
                                    <strong className="text-foreground">
                                        no compensation, no refunds, and no guarantees
                                    </strong>{" "}
                                    are provided in relation to the performance, availability, or outcomes
                                    of the AiVedha Guard service, except where explicitly stated in a
                                    separately signed written contract.
                                </p>

                                <h4 className="font-semibold text-foreground">Indemnity</h4>
                                <p>
                                    You agree to indemnify, defend, and hold harmless AiVibe Software
                                    Services Pvt Ltd, AiVedha Guard, and their respective directors,
                                    officers, employees, and agents from and against any claims, demands,
                                    losses, damages, liabilities, costs, and expenses (including reasonable
                                    legal fees) arising out of or related to:
                                </p>
                                <ul className="space-y-2">
                                    <li>
                                        • Your use or misuse of the platform, including any scans initiated by
                                        you or on your behalf;
                                    </li>
                                    <li>
                                        • Your violation of this policy, terms of use, or any applicable law;
                                    </li>
                                    <li>
                                        • Any claim brought by a third party (including customers, regulators,
                                        or system owners) relating to your use of the service.
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Jurisdiction & Governing Law */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Gavel className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">
                                        Governing Law, Jurisdiction &amp; Dispute Resolution
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    Except where a different mandatory law or jurisdiction is required by
                                    applicable local legislation that cannot be waived, this policy, your
                                    use of AiVedha Guard, and any disputes arising from it shall be governed
                                    by and construed in accordance with the laws of{" "}
                                    <strong className="text-foreground">India</strong>.
                                </p>
                                <p>
                                    You agree that the{" "}
                                    <strong className="text-foreground">
                                        courts located in Chennai, Tamil Nadu, India
                                    </strong>{" "}
                                    shall have exclusive jurisdiction over any dispute, claim, or legal
                                    proceeding relating to AiVedha Guard or AiVibe, and you consent to
                                    personal jurisdiction and venue in those courts, to the extent
                                    permitted by applicable law.
                                </p>
                                <p className="text-xs">
                                    Any costs, legal fees, or expenses incurred in connection with
                                    proceedings that you initiate against AiVibe or AiVedha Guard shall, to
                                    the maximum extent allowed by law, be your responsibility, and no
                                    obligation shall arise for AiVibe to reimburse or compensate such
                                    expenses.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Your Rights (GDPR/CCPA style) */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <AlertTriangle className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">Your Privacy Rights</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    Depending on your location and applicable law (for example, GDPR in the
                                    EU/EEA, UK data protection law, or CCPA/CPRA in California), you may
                                    have some or all of the following rights:
                                </p>
                                <ul className="space-y-2">
                                    <li>• Access to your personal information</li>
                                    <li>• Rectification of inaccurate or incomplete data</li>
                                    <li>• Erasure of certain data (&quot;right to be forgotten&quot;)</li>
                                    <li>• Restriction of processing under specific conditions</li>
                                    <li>• Data portability in a structured, commonly used format</li>
                                    <li>• Objection to certain types of processing</li>
                                    <li>• Withdrawal of consent where processing is based on consent</li>
                                </ul>
                                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mt-4">
                                    <p>
                                        To exercise your rights, contact{" "}
                                        <strong className="text-foreground">{APP_CONFIG.PRIVACY_EMAIL}</strong>. We
                                        will review and respond in line with applicable legal requirements.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* International Transfers & Country-Specific Notices */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="text-foreground flex items-center space-x-2">
                                    <Globe2 className="h-5 w-5 text-primary" />
                                    <span>International Transfers &amp; Country-Specific Notices</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    AiVedha Guard may be accessed globally, and your data may be processed
                                    in countries other than your own. Where required, we aim to implement
                                    safeguards such as:
                                </p>
                                <ul className="space-y-2">
                                    <li>• Standard contractual clauses (where applicable)</li>
                                    <li>• Data processing agreements with our subprocessors</li>
                                    <li>• Technical and organizational security measures</li>
                                </ul>
                                <p className="text-sm">
                                    If mandatory country-specific language is required by your local law
                                    (for example, certain disclosures for EU/EEA, UK, California, Brazil,
                                    or other jurisdictions), such provisions may be supplemented in a
                                    separate jurisdiction-specific addendum or product-specific terms.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Data Retention */}
                        <Card className="rounded-3xl border border-border/50 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="text-foreground">Data Retention</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>We retain information for as long as necessary to:</p>
                                <ul className="space-y-2">
                                    <li>• Provide and improve the AiVedha Guard service</li>
                                    <li>• Maintain security, logs, and auditability</li>
                                    <li>• Satisfy legal, accounting, or reporting obligations</li>
                                </ul>
                                <p className="text-sm">
                                    Where legally possible, you may request deletion of certain data. Some
                                    records (for example, billing or compliance logs) may need to be
                                    retained for a longer period as required by law.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Contact Information */}
                        <Card className="rounded-3xl border border-primary/20 bg-primary/5 shadow-elegant">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Mail className="h-5 w-5 text-primary" />
                                    <span className="text-foreground">Contact &amp; Policy Changes</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    For privacy, security, or legal questions related to AiVedha Guard,
                                    you can contact us at:
                                </p>
                                <div className="mt-2 space-y-2">
                                    <p className="text-foreground font-medium">
                                        Privacy:{" "}
                                        <span className="text-primary">{APP_CONFIG.PRIVACY_EMAIL}</span>
                                    </p>
                                    <p className="text-foreground font-medium">
                                        Security &amp; Abuse:{" "}
                                        <span className="text-primary">{APP_CONFIG.SECURITY_EMAIL}</span>
                                    </p>
                                    <p className="text-foreground font-medium">
                                        General Support:{" "}
                                        <span className="text-primary">{APP_CONFIG.SUPPORT_EMAIL}</span>
                                    </p>
                                </div>
                                <p className="text-sm">
                                    We may update this Privacy &amp; Legal Policy from time to time. The
                                    &quot;Last updated&quot; date at the top of this page reflects the
                                    latest version. Continued use of AiVedha Guard after changes are posted
                                    constitutes your acceptance of the updated policy.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
