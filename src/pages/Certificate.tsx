import { useParams } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Download,
    Shield,
    CheckCircle,
    AlertTriangle,
    Award,
    Lock,
    Globe,
    Clock,
    Loader2,
    ShieldCheck,
    ExternalLink,
    Fingerprint,
    FileCheck,
    BadgeCheck,
    Verified,
    Star,
    TrendingUp,
    AlertCircle,
    Info,
    ChevronRight,
    Sparkles,
    Zap,
    Target,
    Eye,
    Server,
    Database,
    Network,
    ScanLine,
    Binary,
    KeyRound,
    LockKeyhole,
    CircleCheckBig,
    Printer,
} from "lucide-react";
import { toast } from "sonner";
import AivedhaAPI from "@/lib/api";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type LanguageCode = "en" | "es" | "fr" | "de" | "hi";

interface CertificateData {
    pdf_location?: string;
    report_id?: string;
    security_score?: number | string;
    grade?: string;
    organization_name?: string;
    customer_name?: string;
    url?: string;
    asset?: string;
    critical_issues?: number;
    high_issues?: number;
    medium_issues?: number;
    low_issues?: number;
    informational_issues?: number;
    ssl_status?: string;
    ssl_grade?: string;
    headers_score?: number;
    audit_type?: string;
    scan_date?: string;
    document_number?: string;
    user_name?: string;
    user_email?: string;
    auditor_name?: string;
    approver_name?: string;
    qr_url?: string;
    certificate_number?: string;
    valid_until?: string;
    // Region routing (v5.0.0)
    scan_region?: string;
    region_name?: string;
    static_ip?: string;
}

interface CertificateTranslations {
    certificateOfSecurityAudit: string;
    certificateSubtitle: string;
    certifiedEntityLabel: string;
    organisationOwnerLabel: string;
    assetDomainLabel: string;
    scoreLabel: string;
    scoreDescription: string;
    criticalLabel: string;
    criticalSubLabel: string;
    highLabel: string;
    highSubLabel: string;
    mediumLabel: string;
    mediumSubLabel: string;
    lowLabel: string;
    lowSubLabel: string;
    auditTypeLabel: string;
    sslGradeLabel: string;
    assessmentWindowLabel: string;
    assessmentScopeNote: string;
    methodologyNote: string;
    verificationScan: string;
    verificationOnline: string;
    disclaimer: string;
    issuerFooterLine1: string;
    issuerFooterLine2: string;
    certificateNotFoundTitle: string;
    certificateNotFoundBody: string;
    certificateNotFoundHelp: string;
    downloadButton: string;
    downloadingButton: string;
    printButton: string;
    validUntil: string;
    issuedOn: string;
    certificateId: string;
    securityPosture: string;
    auditSummary: string;
    findingsOverview: string;
    verifyAuthenticity: string;
}

// ============================================================================
// TRANSLATIONS
// ============================================================================

const translations: Record<LanguageCode, CertificateTranslations> = {
    en: {
        certificateOfSecurityAudit: "Certificate of Security Audit",
        certificateSubtitle:
            "This certifies that the digital assets described herein have undergone an independent security assessment in accordance with internationally recognised application security practices and industry standards.",
        certifiedEntityLabel: "Certified Entity",
        organisationOwnerLabel: "Organisation / Owner",
        assetDomainLabel: "Primary Asset / Domain Audited",
        scoreLabel: "Security Score",
        scoreDescription:
            "This score reflects the effectiveness of implemented security controls, vulnerability exposure, and remediation posture for the assessed assets at the time of audit.",
        criticalLabel: "Critical",
        criticalSubLabel: "Immediate action required",
        highLabel: "High",
        highSubLabel: "High impact findings",
        mediumLabel: "Medium",
        mediumSubLabel: "Actionable risks",
        lowLabel: "Low / Info",
        lowSubLabel: "Best-practice gaps",
        auditTypeLabel: "Audit Type",
        sslGradeLabel: "SSL/TLS Grade",
        assessmentWindowLabel: "Assessment Date",
        assessmentScopeNote:
            "This assessment reflects the security posture observed for the public URLs in scope at the time of testing. Subsequent changes may alter these results.",
        methodologyNote:
            "Assessment methodology references: OWASP ASVS, OWASP Top 10, CWE/SANS Top 25, and relevant secure configuration benchmarks aligned with ISO/IEC 27001 principles.",
        verificationScan: "Scan to Verify",
        verificationOnline: "Verify this certificate online at",
        disclaimer:
            "This certificate represents a point-in-time assessment. It does not constitute a guarantee of continuous security and remains subject to ongoing maintenance by the certified entity.",
        issuerFooterLine1:
            "Aivibe Software Services Pvt Ltd — AiVedha Guard Security Audit Program",
        issuerFooterLine2:
            "Registered Assessment & Security Engineering Provider • All certificates are cryptographically logged",
        certificateNotFoundTitle: "Certificate Not Found",
        certificateNotFoundBody:
            "The certificate number you entered could not be located in our global registry.",
        certificateNotFoundHelp:
            "Please verify the certificate number and try again. Contact security@aivedha.ai for assistance.",
        downloadButton: "Download PDF",
        downloadingButton: "Downloading...",
        printButton: "Print Certificate",
        validUntil: "Valid Until",
        issuedOn: "Issued On",
        certificateId: "Certificate ID",
        securityPosture: "Security Posture",
        auditSummary: "Audit Summary",
        findingsOverview: "Findings Overview",
        verifyAuthenticity: "Verify Authenticity",
    },
    es: {
        certificateOfSecurityAudit: "Certificado de Auditoría de Seguridad",
        certificateSubtitle:
            "Este documento certifica que los activos digitales descritos han sido sometidos a una evaluación de seguridad independiente conforme a prácticas internacionales de seguridad.",
        certifiedEntityLabel: "Entidad Certificada",
        organisationOwnerLabel: "Organización / Titular",
        assetDomainLabel: "Activo Principal / Dominio Auditado",
        scoreLabel: "Puntuación de Seguridad",
        scoreDescription:
            "Esta puntuación refleja la eficacia de los controles de seguridad implementados y la postura de remediación en el momento de la auditoría.",
        criticalLabel: "Crítico",
        criticalSubLabel: "Acción inmediata requerida",
        highLabel: "Alto",
        highSubLabel: "Hallazgos de alto impacto",
        mediumLabel: "Medio",
        mediumSubLabel: "Riesgos accionables",
        lowLabel: "Bajo / Info",
        lowSubLabel: "Brechas de mejores prácticas",
        auditTypeLabel: "Tipo de Auditoría",
        sslGradeLabel: "Calificación SSL/TLS",
        assessmentWindowLabel: "Fecha de Evaluación",
        assessmentScopeNote:
            "Esta evaluación refleja la postura de seguridad observada en el momento de la prueba. Cambios posteriores pueden alterar estos resultados.",
        methodologyNote:
            "Metodología basada en: OWASP ASVS, OWASP Top 10, CWE/SANS Top 25 y estándares ISO/IEC 27001.",
        verificationScan: "Escanear para Verificar",
        verificationOnline: "Verifique este certificado en línea en",
        disclaimer:
            "Este certificado representa una evaluación puntual. No constituye garantía de seguridad continua.",
        issuerFooterLine1:
            "Aivibe Software Services Pvt Ltd — Programa AiVedha Guard",
        issuerFooterLine2:
            "Proveedor Registrado de Evaluación de Seguridad • Certificados registrados criptográficamente",
        certificateNotFoundTitle: "Certificado No Encontrado",
        certificateNotFoundBody:
            "El número de certificado no se encontró en nuestro registro.",
        certificateNotFoundHelp:
            "Verifique el número e intente nuevamente. Contacte security@aivedha.ai para asistencia.",
        downloadButton: "Descargar PDF",
        downloadingButton: "Descargando...",
        printButton: "Imprimir Certificado",
        validUntil: "Válido Hasta",
        issuedOn: "Emitido El",
        certificateId: "ID de Certificado",
        securityPosture: "Postura de Seguridad",
        auditSummary: "Resumen de Auditoría",
        findingsOverview: "Resumen de Hallazgos",
        verifyAuthenticity: "Verificar Autenticidad",
    },
    fr: {
        certificateOfSecurityAudit: "Certificat d'Audit de Sécurité",
        certificateSubtitle:
            "Ce document certifie que les actifs numériques décrits ont fait l'objet d'une évaluation de sécurité indépendante selon les pratiques internationales.",
        certifiedEntityLabel: "Entité Certifiée",
        organisationOwnerLabel: "Organisation / Propriétaire",
        assetDomainLabel: "Actif Principal / Domaine Audité",
        scoreLabel: "Score de Sécurité",
        scoreDescription:
            "Ce score reflète l'efficacité des contrôles de sécurité et la posture de remédiation au moment de l'audit.",
        criticalLabel: "Critique",
        criticalSubLabel: "Action immédiate requise",
        highLabel: "Élevé",
        highSubLabel: "Constats à fort impact",
        mediumLabel: "Moyen",
        mediumSubLabel: "Risques actionnables",
        lowLabel: "Faible / Info",
        lowSubLabel: "Écarts aux bonnes pratiques",
        auditTypeLabel: "Type d'Audit",
        sslGradeLabel: "Note SSL/TLS",
        assessmentWindowLabel: "Date d'Évaluation",
        assessmentScopeNote:
            "Cette évaluation reflète la posture de sécurité observée au moment des tests. Des modifications ultérieures peuvent altérer ces résultats.",
        methodologyNote:
            "Méthodologie basée sur: OWASP ASVS, OWASP Top 10, CWE/SANS Top 25 et normes ISO/IEC 27001.",
        verificationScan: "Scanner pour Vérifier",
        verificationOnline: "Vérifiez ce certificat en ligne sur",
        disclaimer:
            "Ce certificat représente une évaluation ponctuelle. Il ne constitue pas une garantie de sécurité continue.",
        issuerFooterLine1:
            "Aivibe Software Services Pvt Ltd — Programme AiVedha Guard",
        issuerFooterLine2:
            "Prestataire Enregistré d'Évaluation de Sécurité • Certificats enregistrés cryptographiquement",
        certificateNotFoundTitle: "Certificat Introuvable",
        certificateNotFoundBody:
            "Le numéro de certificat n'a pas été trouvé dans notre registre.",
        certificateNotFoundHelp:
            "Veuillez vérifier le numéro et réessayer. Contactez security@aivedha.ai pour assistance.",
        downloadButton: "Télécharger PDF",
        downloadingButton: "Téléchargement...",
        printButton: "Imprimer le Certificat",
        validUntil: "Valide Jusqu'au",
        issuedOn: "Émis Le",
        certificateId: "ID du Certificat",
        securityPosture: "Posture de Sécurité",
        auditSummary: "Résumé de l'Audit",
        findingsOverview: "Aperçu des Constats",
        verifyAuthenticity: "Vérifier l'Authenticité",
    },
    de: {
        certificateOfSecurityAudit: "Zertifikat der Sicherheitsprüfung",
        certificateSubtitle:
            "Hiermit wird bestätigt, dass die beschriebenen digitalen Assets einer unabhängigen Sicherheitsbewertung gemäß internationaler Standards unterzogen wurden.",
        certifiedEntityLabel: "Zertifizierte Einheit",
        organisationOwnerLabel: "Organisation / Eigentümer",
        assetDomainLabel: "Primäres Asset / Geprüfte Domain",
        scoreLabel: "Sicherheitsbewertung",
        scoreDescription:
            "Diese Bewertung spiegelt die Wirksamkeit der implementierten Sicherheitskontrollen zum Zeitpunkt der Prüfung wider.",
        criticalLabel: "Kritisch",
        criticalSubLabel: "Sofortige Maßnahmen erforderlich",
        highLabel: "Hoch",
        highSubLabel: "Hochgradig wirkende Befunde",
        mediumLabel: "Mittel",
        mediumSubLabel: "Handlungsrelevante Risiken",
        lowLabel: "Niedrig / Info",
        lowSubLabel: "Best-Practice-Lücken",
        auditTypeLabel: "Prüfungsart",
        sslGradeLabel: "SSL/TLS-Bewertung",
        assessmentWindowLabel: "Bewertungsdatum",
        assessmentScopeNote:
            "Diese Bewertung spiegelt die Sicherheitslage zum Zeitpunkt der Prüfung wider. Nachträgliche Änderungen können die Ergebnisse beeinflussen.",
        methodologyNote:
            "Bewertungsmethodik: OWASP ASVS, OWASP Top 10, CWE/SANS Top 25 und ISO/IEC 27001 Standards.",
        verificationScan: "Zum Verifizieren Scannen",
        verificationOnline: "Verifizieren Sie dieses Zertifikat online unter",
        disclaimer:
            "Dieses Zertifikat stellt eine Momentaufnahme dar. Es stellt keine Garantie für kontinuierliche Sicherheit dar.",
        issuerFooterLine1:
            "Aivibe Software Services Pvt Ltd — AiVedha Guard Programm",
        issuerFooterLine2:
            "Registrierter Sicherheitsbewertungsanbieter • Kryptographisch protokollierte Zertifikate",
        certificateNotFoundTitle: "Zertifikat Nicht Gefunden",
        certificateNotFoundBody:
            "Die Zertifikatsnummer wurde in unserem Register nicht gefunden.",
        certificateNotFoundHelp:
            "Bitte überprüfen Sie die Nummer und versuchen Sie es erneut. Kontakt: security@aivedha.ai",
        downloadButton: "PDF Herunterladen",
        downloadingButton: "Wird heruntergeladen...",
        printButton: "Zertifikat Drucken",
        validUntil: "Gültig Bis",
        issuedOn: "Ausgestellt Am",
        certificateId: "Zertifikats-ID",
        securityPosture: "Sicherheitslage",
        auditSummary: "Prüfungszusammenfassung",
        findingsOverview: "Befundübersicht",
        verifyAuthenticity: "Echtheit Überprüfen",
    },
    hi: {
        certificateOfSecurityAudit: "सुरक्षा ऑडिट प्रमाणपत्र",
        certificateSubtitle:
            "यह प्रमाणित करता है कि वर्णित डिजिटल संपत्तियों का अंतरराष्ट्रीय सुरक्षा मानकों के अनुसार स्वतंत्र सुरक्षा मूल्यांकन किया गया है।",
        certifiedEntityLabel: "प्रमाणित इकाई",
        organisationOwnerLabel: "संगठन / स्वामी",
        assetDomainLabel: "प्राथमिक संपत्ति / ऑडिट किया गया डोमेन",
        scoreLabel: "सुरक्षा स्कोर",
        scoreDescription:
            "यह स्कोर ऑडिट के समय लागू सुरक्षा नियंत्रणों की प्रभावशीलता को दर्शाता है।",
        criticalLabel: "गंभीर",
        criticalSubLabel: "तत्काल कार्रवाई आवश्यक",
        highLabel: "उच्च",
        highSubLabel: "उच्च प्रभाव निष्कर्ष",
        mediumLabel: "मध्यम",
        mediumSubLabel: "कार्रवाई योग्य जोखिम",
        lowLabel: "निम्न / जानकारी",
        lowSubLabel: "सर्वोत्तम अभ्यास अंतराल",
        auditTypeLabel: "ऑडिट प्रकार",
        sslGradeLabel: "SSL/TLS ग्रेड",
        assessmentWindowLabel: "मूल्यांकन तिथि",
        assessmentScopeNote:
            "यह मूल्यांकन परीक्षण के समय देखी गई सुरक्षा स्थिति को दर्शाता है। बाद में परिवर्तन परिणामों को बदल सकते हैं।",
        methodologyNote:
            "मूल्यांकन पद्धति: OWASP ASVS, OWASP Top 10, CWE/SANS Top 25 और ISO/IEC 27001 मानक।",
        verificationScan: "सत्यापित करने के लिए स्कैन करें",
        verificationOnline: "इस प्रमाणपत्र को ऑनलाइन सत्यापित करें",
        disclaimer:
            "यह प्रमाणपत्र एक समय-बिंदु मूल्यांकन का प्रतिनिधित्व करता है। यह निरंतर सुरक्षा की गारंटी नहीं है।",
        issuerFooterLine1:
            "Aivibe Software Services Pvt Ltd — AiVedha Guard कार्यक्रम",
        issuerFooterLine2:
            "पंजीकृत सुरक्षा मूल्यांकन प्रदाता • क्रिप्टोग्राफिक रूप से लॉग किए गए प्रमाणपत्र",
        certificateNotFoundTitle: "प्रमाणपत्र नहीं मिला",
        certificateNotFoundBody:
            "प्रमाणपत्र संख्या हमारी रजिस्ट्री में नहीं मिली।",
        certificateNotFoundHelp:
            "कृपया संख्या सत्यापित करें और पुनः प्रयास करें। सहायता के लिए security@aivedha.ai से संपर्क करें।",
        downloadButton: "PDF डाउनलोड करें",
        downloadingButton: "डाउनलोड हो रहा है...",
        printButton: "प्रमाणपत्र प्रिंट करें",
        validUntil: "तक वैध",
        issuedOn: "जारी किया गया",
        certificateId: "प्रमाणपत्र आईडी",
        securityPosture: "सुरक्षा स्थिति",
        auditSummary: "ऑडिट सारांश",
        findingsOverview: "निष्कर्ष अवलोकन",
        verifyAuthenticity: "प्रामाणिकता सत्यापित करें",
    },
};

// ============================================================================
// LANGUAGE OPTIONS
// ============================================================================

const languageOptions = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "es", label: "Español", flag: "🇪🇸" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "de", label: "Deutsch", flag: "🇩🇪" },
    { code: "hi", label: "हिंदी", flag: "🇮🇳" },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getNumericScore = (value: number | string | undefined): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return 0;
};

const getScoreGrade = (score: number): string => {
    if (score >= 9) return "A+";
    if (score >= 8) return "A";
    if (score >= 7) return "B+";
    if (score >= 6) return "B";
    if (score >= 5) return "C";
    if (score >= 4) return "D";
    return "F";
};

const getScoreColorClass = (score: number): string => {
    if (score >= 8) return "text-emerald-400";
    if (score >= 6) return "text-amber-400";
    if (score >= 4) return "text-orange-400";
    return "text-red-400";
};

const getScoreGradient = (score: number): string => {
    if (score >= 8) return "from-emerald-500 to-teal-400";
    if (score >= 6) return "from-amber-500 to-yellow-400";
    if (score >= 4) return "from-orange-500 to-amber-400";
    return "from-red-500 to-rose-400";
};

const getScoreRingColor = (score: number): string => {
    if (score >= 8) return "stroke-emerald-400";
    if (score >= 6) return "stroke-amber-400";
    if (score >= 4) return "stroke-orange-400";
    return "stroke-red-400";
};

const getStatusInfo = (score: number) => {
    if (score >= 9)
        return {
            status: "EXCELLENT",
            description: "Outstanding Security Posture",
            icon: ShieldCheck,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/30",
            gradient: "from-emerald-500/20 to-teal-500/20",
        };
    if (score >= 7)
        return {
            status: "STRONG",
            description: "Robust Security Controls",
            icon: Shield,
            color: "text-sky-400",
            bg: "bg-sky-500/10",
            border: "border-sky-500/30",
            gradient: "from-sky-500/20 to-blue-500/20",
        };
    if (score >= 5)
        return {
            status: "MODERATE",
            description: "Acceptable Risk Level",
            icon: AlertCircle,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/30",
            gradient: "from-amber-500/20 to-yellow-500/20",
        };
    return {
        status: "AT RISK",
        description: "Immediate Remediation Required",
        icon: AlertTriangle,
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        gradient: "from-red-500/20 to-rose-500/20",
    };
};

const parseDate = (dateStr?: string): string => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

const getValidUntilDate = (scanDate?: string): string => {
    if (!scanDate) {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        return futureDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }
    const d = new Date(scanDate);
    if (Number.isNaN(d.getTime())) return "—";
    d.setFullYear(d.getFullYear() + 1);
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

// Animated Score Ring Component
const ScoreRing = ({ score, size = 180 }: { score: number; size?: number }) => {
    const percentage = (score / 10) * 100;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            {/* Background glow */}
            <div
                className={`absolute inset-0 rounded-full bg-gradient-to-r ${getScoreGradient(
                    score
                )} opacity-20 blur-xl`}
            />

            {/* SVG Ring */}
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-slate-800/50"
                />
                {/* Animated progress circle */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className={getScoreRingColor(score)}
                    initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    className={`text-5xl font-bold ${getScoreColorClass(score)} print:text-emerald-700`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                >
                    {score.toFixed(1)}
                </motion.span>
                <span className="text-xs text-slate-400 uppercase tracking-widest mt-1 print:text-slate-600">
                    out of 10
                </span>
                <motion.div
                    className={`mt-2 px-3 py-1 rounded-full bg-gradient-to-r ${getScoreGradient(
                        score
                    )} text-white text-xs font-bold`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                >
                    Grade: {getScoreGrade(score)}
                </motion.div>
            </div>
        </div>
    );
};

// Floating Particle Component
const FloatingParticle = ({
    delay,
    duration,
    x,
    y,
    size,
}: {
    delay: number;
    duration: number;
    x: string;
    y: string;
    size: number;
}) => (
    <motion.div
        className="absolute rounded-full bg-gradient-to-r from-cyan-500/30 to-violet-500/30"
        style={{ left: x, top: y, width: size, height: size }}
        animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
        }}
        transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
);

// Decorative Seal Component
const CertificateSeal = ({ className = "" }: { className?: string }) => (
    <div className={`relative ${className}`}>
        <motion.div
            className="w-24 h-24 md:w-28 md:h-28"
            initial={{ rotate: 0, scale: 0.8, opacity: 0 }}
            animate={{ rotate: 360, scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
        >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/40 print:border-amber-600" />
            <div className="absolute inset-1 rounded-full border-2 border-amber-400/30 print:border-amber-500" />
            <div className="absolute inset-2 rounded-full border border-amber-300/20 print:border-amber-400" />

            {/* Inner circle with gradient */}
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-600/20 flex items-center justify-center print:from-amber-100 print:to-amber-200">
                <div className="text-center">
                    <Award className="w-8 h-8 text-amber-400 mx-auto print:text-amber-600" />
                    <span className="text-[8px] font-bold text-amber-300 uppercase tracking-wider print:text-amber-700">
                        Verified
                    </span>
                </div>
            </div>

            {/* Decorative rays */}
            {[...Array(12)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-0.5 h-3 bg-amber-400/30 print:bg-amber-500"
                    style={{
                        left: "50%",
                        top: "-4px",
                        transform: `translateX(-50%) rotate(${i * 30}deg)`,
                        transformOrigin: "center 58px",
                    }}
                />
            ))}
        </motion.div>
    </div>
);

// Issue Card Component
const IssueCard = ({
    label,
    subLabel,
    count,
    color,
    icon: Icon,
    delay = 0,
}: {
    label: string;
    subLabel: string;
    count: number;
    color: string;
    icon: LucideIcon;
    delay?: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className="relative group"
    >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 blur-sm" />
        <Card className="relative border-slate-700/50 bg-slate-900/60 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden hover:border-slate-600/70 transition-all print:bg-white print:border-slate-300">
            <CardContent className="p-4 text-center">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${color} mb-2`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 mb-1 print:text-slate-600">
                    {label}
                </p>
                <p className={`text-3xl font-bold ${color.replace("bg-", "text-").replace("/20", "")} print:text-slate-900`}>
                    {count}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 print:text-slate-600">{subLabel}</p>
            </CardContent>
        </Card>
    </motion.div>
);

// Metadata Row Component
const MetadataRow = ({
    icon: Icon,
    label,
    value,
    subtext,
    iconBg = "bg-slate-800/80",
    delay = 0,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    subtext?: string;
    iconBg?: string;
    delay?: number;
}) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay, duration: 0.4 }}
        className="flex gap-4 items-start"
    >
        <div className={`mt-0.5 rounded-xl ${iconBg} p-2.5 print:bg-slate-100`}>
            <Icon className="h-4 w-4 text-slate-300 print:text-slate-700" />
        </div>
        <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-0.5 print:text-slate-600">
                {label}
            </p>
            <p className="text-slate-100 font-semibold text-sm print:text-slate-900">{value}</p>
            {subtext && (
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed print:text-slate-600">
                    {subtext}
                </p>
            )}
        </div>
    </motion.div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Certificate = () => {
    const { certificateNumber } = useParams();
    const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [language, setLanguage] = useState<LanguageCode>("en");

    const t = translations[language];

    // Fetch certificate data
    const fetchCertificateData = useCallback(async (certNumber: string) => {
        try {
            const data = await AivedhaAPI.getCertificate(certNumber);
            setCertificateData(data as CertificateData);
        } catch (error) {
            toast.error("Certificate not found or invalid");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (certificateNumber) {
            void fetchCertificateData(certificateNumber);
        }
    }, [certificateNumber, fetchCertificateData]);

    // Download handler
    const downloadCertificate = async () => {
        if (!certificateData?.pdf_location || !certificateData.report_id) {
            toast.error("Certificate PDF not available");
            return;
        }

        setDownloading(true);
        try {
            await AivedhaAPI.downloadReport(certificateData.report_id);
            toast.success("Certificate download initiated");
        } catch (error) {
            toast.error("Download failed");
        } finally {
            setDownloading(false);
        }
    };

    // Print handler
    const handlePrint = () => {
        window.print();
    };

    // Computed values
    const score = useMemo(
        () => getNumericScore(certificateData?.security_score),
        [certificateData?.security_score]
    );

    const organizationName = useMemo(
        () => certificateData?.organization_name || certificateData?.customer_name || "—",
        [certificateData]
    );

    const assetUrl = useMemo(
        () => certificateData?.url || certificateData?.asset || "—",
        [certificateData]
    );

    const statusInfo = useMemo(() => getStatusInfo(score), [score]);
    const StatusIcon = statusInfo.icon;

    // Loading State
    if (loading) {
        return (
            <Layout>
                <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                    <div className="text-center">
                        <motion.div
                            className="relative w-20 h-20 mx-auto mb-6"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500" />
                            <Shield className="absolute inset-0 m-auto h-8 w-8 text-cyan-400" />
                        </motion.div>
                        <p className="text-slate-400 text-sm">Verifying certificate...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    // Not Found State
    if (!certificateData) {
        return (
            <Layout>
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-lg w-full"
                    >
                        <Card className="border-red-500/30 bg-slate-900/80 backdrop-blur-xl rounded-3xl overflow-hidden">
                            <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-500" />
                            <CardContent className="p-10 text-center space-y-6">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", delay: 0.2 }}
                                    className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto"
                                >
                                    <AlertTriangle className="h-10 w-10 text-red-400" />
                                </motion.div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        {t.certificateNotFoundTitle}
                                    </h2>
                                    <p className="text-slate-400">{t.certificateNotFoundBody}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                                    <p className="text-xs text-slate-500">{t.certificateNotFoundHelp}</p>
                                </div>
                                <Button
                                    onClick={() => window.history.back()}
                                    className="bg-slate-800 hover:bg-slate-700 text-white rounded-full px-6"
                                >
                                    Go Back
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </Layout>
        );
    }

    // Main Certificate View
    return (
        <Layout>
            <div className="min-h-screen bg-slate-950 relative overflow-hidden print:bg-white print:overflow-visible">
                {/* ================================================================ */}
                {/* ANIMATED BACKGROUND (Screen Only) */}
                {/* ================================================================ */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none print:hidden">
                    {/* Base gradients */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
                    <div
                        className="absolute inset-0 opacity-40"
                        style={{
                            backgroundImage: `
                radial-gradient(at 20% 20%, rgba(6, 182, 212, 0.15) 0px, transparent 50%),
                radial-gradient(at 80% 30%, rgba(139, 92, 246, 0.15) 0px, transparent 50%),
                radial-gradient(at 40% 80%, rgba(16, 185, 129, 0.1) 0px, transparent 50%)
              `,
                        }}
                    />

                    {/* Floating particles */}
                    {[...Array(10)].map((_, i) => (
                        <FloatingParticle
                            key={i}
                            delay={i * 0.3}
                            duration={6 + (i % 3) * 2}
                            x={`${10 + i * 8}%`}
                            y={`${15 + (i % 4) * 20}%`}
                            size={4 + (i % 3) * 2}
                        />
                    ))}

                    {/* Grid overlay */}
                    <div
                        className="absolute inset-0 opacity-[0.02]"
                        style={{
                            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                            backgroundSize: "50px 50px",
                        }}
                    />
                </div>

                {/* ================================================================ */}
                {/* MAIN CONTENT */}
                {/* ================================================================ */}
                <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 print:px-0 print:py-0">
                    <div className="max-w-5xl mx-auto">
                        {/* ============================================================ */}
                        {/* CERTIFICATE FRAME */}
                        {/* ============================================================ */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="relative"
                        >
                            {/* Outer glow (screen only) */}
                            <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-emerald-500/20 blur-2xl print:hidden" />

                            {/* Certificate container */}
                            <div className="relative rounded-[32px] bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-[2px] shadow-2xl print:shadow-none print:rounded-none print:bg-white print:p-0">
                                <div className="relative rounded-[30px] bg-slate-950/95 backdrop-blur-xl border border-slate-700/50 overflow-hidden print:rounded-none print:bg-white print:border-slate-300">
                                    {/* Decorative top border */}
                                    <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-500 print:from-cyan-600 print:via-violet-600 print:to-emerald-600" />

                                    {/* Certificate content */}
                                    <div className="p-6 md:p-10 print:p-8">
                                        {/* ================================================== */}
                                        {/* HEADER SECTION */}
                                        {/* ================================================== */}
                                        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
                                            {/* Left: Logo and issuer */}
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 }}
                                                className="flex items-center gap-4"
                                            >
                                                <div className="relative">
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 p-0.5 shadow-lg shadow-cyan-500/30">
                                                        <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center print:bg-white">
                                                            <Shield className="w-7 h-7 text-cyan-400 print:text-cyan-600" />
                                                        </div>
                                                    </div>
                                                    <motion.div
                                                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ delay: 0.5, type: "spring" }}
                                                    >
                                                        <Verified className="w-3 h-3 text-white" />
                                                    </motion.div>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-400/80 font-semibold print:text-cyan-700">
                                                        AiVedha Guard
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5 print:text-slate-600">
                                                        Global Security Assurance Program
                                                    </p>
                                                </div>
                                            </motion.div>

                                            {/* Right: Certificate meta & language */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.3 }}
                                                className="flex flex-col items-end gap-3"
                                            >
                                                <div className="text-right space-y-1">
                                                    <p className="text-[10px] text-slate-500 print:text-slate-600">
                                                        <span className="uppercase tracking-[0.15em]">{t.certificateId}:</span>{" "}
                                                        <span className="font-mono text-slate-300 print:text-slate-800">
                                                            {certificateNumber}
                                                        </span>
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 print:text-slate-600">
                                                        <span className="uppercase tracking-[0.15em]">Report:</span>{" "}
                                                        <span className="font-mono text-slate-300 print:text-slate-800">
                                                            {certificateData.document_number ||
                                                                `AiVibe-G-${String(certificateNumber).slice(0, 8)}`}
                                                        </span>
                                                    </p>
                                                </div>

                                                {/* Language selector */}
                                                <div className="flex items-center gap-2 print:hidden">
                                                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                                                    <select
                                                        value={language}
                                                        onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                                                        className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                                                    >
                                                        {languageOptions.map((lang) => (
                                                            <option key={lang.code} value={lang.code}>
                                                                {lang.flag} {lang.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* ================================================== */}
                                        {/* TITLE SECTION */}
                                        {/* ================================================== */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 }}
                                            className="text-center mb-10 relative"
                                        >
                                            {/* Decorative background */}
                                            <div className="absolute inset-x-0 -top-4 -bottom-4 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent rounded-3xl print:hidden" />

                                            <div className="relative">
                                                {/* Award icons */}
                                                <div className="flex items-center justify-center gap-4 mb-4">
                                                    <Award className="w-6 h-6 text-amber-400 print:text-amber-600" />
                                                    <div className="h-px w-16 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
                                                    <Star className="w-5 h-5 text-amber-300 print:text-amber-500" />
                                                    <div className="h-px w-16 bg-gradient-to-l from-transparent via-amber-400/50 to-transparent" />
                                                    <Award className="w-6 h-6 text-amber-400 print:text-amber-600" />
                                                </div>

                                                {/* Title */}
                                                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-wide mb-3 print:text-slate-900">
                                                    {t.certificateOfSecurityAudit.toUpperCase()}
                                                </h1>

                                                {/* Subtitle */}
                                                <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed print:text-slate-700">
                                                    {t.certificateSubtitle}
                                                </p>

                                                {/* Decorative line */}
                                                <div className="flex items-center justify-center gap-2 mt-6">
                                                    <div className="h-px w-24 bg-gradient-to-r from-transparent to-slate-600" />
                                                    <Sparkles className="w-4 h-4 text-slate-600" />
                                                    <div className="h-px w-24 bg-gradient-to-l from-transparent to-slate-600" />
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* ================================================== */}
                                        {/* CERTIFIED ENTITY SECTION */}
                                        {/* ================================================== */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 }}
                                            className="relative mb-10"
                                        >
                                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-slate-800/30 via-slate-800/50 to-slate-800/30 print:from-slate-100 print:via-slate-50 print:to-slate-100" />
                                            <div className="relative rounded-3xl border border-slate-700/50 p-6 md:p-8 print:border-slate-300">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <BadgeCheck className="w-5 h-5 text-emerald-400 print:text-emerald-600" />
                                                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold print:text-slate-600">
                                                        {t.certifiedEntityLabel}
                                                    </p>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-6">
                                                    {/* Organization */}
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 mb-1 print:text-slate-600">
                                                            {t.organisationOwnerLabel}
                                                        </p>
                                                        <p className="text-xl md:text-2xl font-bold text-white print:text-slate-900">
                                                            {organizationName}
                                                        </p>
                                                    </div>

                                                    {/* Asset URL */}
                                                    <div className="md:text-right">
                                                        <p className="text-[10px] text-slate-500 mb-1 print:text-slate-600">
                                                            {t.assetDomainLabel}
                                                        </p>
                                                        <p className="font-mono text-base text-cyan-400 break-all print:text-cyan-700">
                                                            {assetUrl}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Seal - positioned absolutely */}
                                                <div className="hidden md:block absolute -top-8 -right-4 print:right-0 print:top-0">
                                                    <CertificateSeal />
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* ================================================== */}
                                        {/* SCORE & FINDINGS SECTION */}
                                        {/* ================================================== */}
                                        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 mb-10">
                                            {/* Left: Score */}
                                            <motion.div
                                                initial={{ opacity: 0, x: -30 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.6 }}
                                                className="flex flex-col items-center"
                                            >
                                                {/* Score Ring */}
                                                <ScoreRing score={score} />

                                                {/* Status Badge */}
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 1.2 }}
                                                    className={`mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full ${statusInfo.bg} border ${statusInfo.border}`}
                                                >
                                                    <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                                                    <div className="text-left">
                                                        <p className={`text-sm font-bold ${statusInfo.color} uppercase tracking-wider`}>
                                                            {statusInfo.status}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">{statusInfo.description}</p>
                                                    </div>
                                                </motion.div>

                                                {/* Score description */}
                                                <p className="mt-4 text-xs text-slate-500 text-center max-w-xs leading-relaxed print:text-slate-600">
                                                    {t.scoreDescription}
                                                </p>
                                            </motion.div>

                                            {/* Right: Findings */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 30 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.7 }}
                                            >
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Target className="w-4 h-4 text-slate-400" />
                                                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">
                                                        {t.findingsOverview}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    <IssueCard
                                                        label={t.criticalLabel}
                                                        subLabel={t.criticalSubLabel}
                                                        count={certificateData.critical_issues ?? 0}
                                                        color="bg-red-500/20"
                                                        icon={AlertTriangle}
                                                        delay={0.8}
                                                    />
                                                    <IssueCard
                                                        label={t.highLabel}
                                                        subLabel={t.highSubLabel}
                                                        count={certificateData.high_issues ?? 0}
                                                        color="bg-orange-500/20"
                                                        icon={AlertCircle}
                                                        delay={0.9}
                                                    />
                                                    <IssueCard
                                                        label={t.mediumLabel}
                                                        subLabel={t.mediumSubLabel}
                                                        count={certificateData.medium_issues ?? 0}
                                                        color="bg-amber-500/20"
                                                        icon={Info}
                                                        delay={1.0}
                                                    />
                                                    <IssueCard
                                                        label={t.lowLabel}
                                                        subLabel={t.lowSubLabel}
                                                        count={
                                                            (certificateData.low_issues ?? 0) +
                                                            (certificateData.informational_issues ?? 0)
                                                        }
                                                        color="bg-sky-500/20"
                                                        icon={Eye}
                                                        delay={1.1}
                                                    />
                                                </div>

                                                {/* Audit Metadata */}
                                                <div className="mt-6 p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-4 print:bg-slate-50 print:border-slate-300">
                                                    <MetadataRow
                                                        icon={Globe}
                                                        label={t.auditTypeLabel}
                                                        value={certificateData.audit_type || "Online Security Assessment"}
                                                        delay={1.2}
                                                    />
                                                    <MetadataRow
                                                        icon={LockKeyhole}
                                                        label={t.sslGradeLabel}
                                                        value={certificateData.ssl_grade || "A+"}
                                                        subtext="Based on endpoint TLS configuration"
                                                        iconBg="bg-emerald-900/40"
                                                        delay={1.3}
                                                    />
                                                    <MetadataRow
                                                        icon={Clock}
                                                        label={t.assessmentWindowLabel}
                                                        value={parseDate(certificateData.scan_date)}
                                                        subtext={t.assessmentScopeNote}
                                                        delay={1.4}
                                                    />
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* ================================================== */}
                                        {/* VERIFICATION SECTION */}
                                        {/* ================================================== */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 1.5 }}
                                            className="flex flex-col md:flex-row items-center justify-between gap-8 py-8 border-t border-b border-slate-800/50 print:border-slate-300"
                                        >
                                            {/* QR Code */}
                                            <div className="flex flex-col items-center">
                                                <a
                                                    href={`https://aivedha.ai/certificate/${certificateNumber}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group"
                                                >
                                                    <div className="relative w-32 h-32 rounded-2xl border-2 border-slate-700 bg-slate-900 p-2 group-hover:border-cyan-500/50 transition-all print:bg-white print:border-slate-400">
                                                        {certificateData.qr_url ? (
                                                            <img
                                                                src={certificateData.qr_url}
                                                                alt="Verification QR Code"
                                                                className="w-full h-full object-contain rounded-xl"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <div className="grid grid-cols-5 gap-1">
                                                                    {[...Array(25)].map((_, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className={`w-4 h-4 rounded-sm ${Math.random() > 0.5 ? "bg-slate-600" : "bg-slate-800"
                                                                                }`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Hover overlay */}
                                                        <div className="absolute inset-0 rounded-2xl bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-colors flex items-center justify-center print:hidden">
                                                            <ExternalLink className="w-6 h-6 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    </div>
                                                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500 text-center print:text-slate-600">
                                                        {t.verificationScan}
                                                    </p>
                                                </a>
                                            </div>

                                            {/* Verification info */}
                                            <div className="flex-1 text-center md:text-left">
                                                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                                    <Fingerprint className="w-5 h-5 text-cyan-400 print:text-cyan-600" />
                                                    <p className="text-sm font-semibold text-white print:text-slate-900">
                                                        {t.verifyAuthenticity}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-slate-400 mb-2 print:text-slate-600">
                                                    {t.verificationOnline}
                                                </p>
                                                <a
                                                    href={`https://aivedha.ai/certificate/${certificateNumber}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 font-mono text-sm text-cyan-400 hover:text-cyan-300 transition-colors print:text-cyan-700"
                                                >
                                                    aivedha.ai/certificate/{certificateNumber}
                                                    <ExternalLink className="w-3.5 h-3.5 print:hidden" />
                                                </a>
                                            </div>

                                            {/* Validity dates */}
                                            <div className="text-center md:text-right space-y-2">
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider print:text-slate-600">
                                                        {t.issuedOn}
                                                    </p>
                                                    <p className="text-sm font-semibold text-white print:text-slate-900">
                                                        {parseDate(certificateData.scan_date)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider print:text-slate-600">
                                                        {t.validUntil}
                                                    </p>
                                                    <p className="text-sm font-semibold text-emerald-400 print:text-emerald-700">
                                                        {getValidUntilDate(certificateData.scan_date)}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* ================================================== */}
                                        {/* METHODOLOGY NOTE */}
                                        {/* ================================================== */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 1.6 }}
                                            className="mt-8 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 print:bg-slate-50 print:border-slate-300"
                                        >
                                            <div className="flex items-start gap-3">
                                                <FileCheck className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0 print:text-slate-600" />
                                                <p className="text-[11px] text-slate-500 leading-relaxed print:text-slate-600">
                                                    {t.methodologyNote}
                                                </p>
                                            </div>
                                        </motion.div>

                                        {/* ================================================== */}
                                        {/* DISCLAIMER & ACTIONS */}
                                        {/* ================================================== */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 1.7 }}
                                            className="mt-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6"
                                        >
                                            {/* Disclaimer */}
                                            <div className="flex-1">
                                                <p className="text-[10px] text-slate-500 leading-relaxed max-w-xl print:text-slate-600">
                                                    <span className="font-semibold text-slate-400 print:text-slate-700">
                                                        Disclaimer:
                                                    </span>{" "}
                                                    {t.disclaimer}
                                                </p>
                                            </div>

                                            {/* Action buttons (screen only) */}
                                            <div className="flex flex-wrap gap-3 justify-end print:hidden">
                                                <Button
                                                    onClick={handlePrint}
                                                    variant="outline"
                                                    className="rounded-full border-slate-700 hover:bg-slate-800 text-slate-300 px-6 py-5"
                                                >
                                                    <Printer className="w-4 h-4 mr-2" />
                                                    {t.printButton}
                                                </Button>
                                                <Button
                                                    onClick={downloadCertificate}
                                                    disabled={downloading}
                                                    className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white px-6 py-5 shadow-lg shadow-cyan-500/30 disabled:opacity-50"
                                                >
                                                    {downloading ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            {t.downloadingButton}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download className="w-4 h-4 mr-2" />
                                                            {t.downloadButton}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* ================================================== */}
                                    {/* FOOTER */}
                                    {/* ================================================== */}
                                    <div className="px-6 md:px-10 py-6 bg-slate-900/50 border-t border-slate-800/50 print:bg-slate-50 print:border-slate-300">
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-300 print:text-slate-800">
                                                    {t.issuerFooterLine1}
                                                </p>
                                                <p className="text-[10px] text-slate-500 mt-1 print:text-slate-600">
                                                    {t.issuerFooterLine2}
                                                </p>
                                            </div>

                                            {/* Trust badges */}
                                            <div className="flex items-center gap-4 opacity-60">
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                    <Lock className="w-3.5 h-3.5" />
                                                    <span>ISO 27001</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                    <Shield className="w-3.5 h-3.5" />
                                                    <span>OWASP</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                    <Verified className="w-3.5 h-3.5" />
                                                    <span>SOC 2</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* ============================================================ */}
                        {/* WATERMARK (Screen Only) */}
                        {/* ============================================================ */}
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.015] print:opacity-5 overflow-hidden">
                            <span className="text-6xl md:text-8xl font-black tracking-[0.4em] text-white whitespace-nowrap transform -rotate-12">
                                AIVEDHA GUARD
                            </span>
                        </div>
                    </div>
                </div>

                {/* ================================================================ */}
                {/* PRINT STYLES */}
                {/* ================================================================ */}
                <style>{`
          @media print {
            @page {
              size: A4;
              margin: 0.5in;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `}</style>
            </div>
        </Layout>
    );
};

export default Certificate;