/**
 * Public Certificate Verification Page
 *
 * This page is displayed when visitors click on an AiVedha Guard security badge.
 * It shows verification details similar to trust-guard.com/security/{id}
 *
 * URL: /verify/:certificateNumber
 *
 * Features:
 * - Certificate verification status
 * - Security scan details
 * - SSL/TLS information
 * - Domain verification
 * - QR code for mobile verification
 * - Disclaimer about security assessment
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  CheckCircle,
  XCircle,
  Lock,
  Globe,
  Calendar,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Info,
  Award,
  Server,
} from 'lucide-react';
import AivedhaAPI from '@/lib/api';

interface VerificationData {
  valid: boolean;
  certificate_number: string;
  domain: string;
  organization_name?: string;
  security_score: number;
  grade: string;
  ssl_status: string;
  ssl_grade?: string;
  ssl_issuer?: string;
  ssl_expiry?: string;
  scan_date: string;
  vulnerabilities_found: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  status: 'active' | 'expired' | 'revoked';
  report_id?: string;
}

const getGrade = (score: number): string => {
  if (score >= 9) return 'A+';
  if (score >= 8) return 'A';
  if (score >= 7) return 'B';
  if (score >= 6) return 'C';
  if (score >= 5) return 'D';
  return 'F';
};

const getScoreColor = (score: number): string => {
  if (score >= 8) return 'text-emerald-500';
  if (score >= 6) return 'text-amber-500';
  return 'text-red-500';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 8) return 'bg-emerald-500/10 border-emerald-500/30';
  if (score >= 6) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-red-500/10 border-red-500/30';
};

const Verify = () => {
  const { certificateNumber } = useParams();
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerification = useCallback(async (certNumber: string) => {
    try {
      setLoading(true);
      setError(null);

      // Try the new verification API first
      try {
        const response = await AivedhaAPI.verifyCertificate(certNumber);

        if (response && response.valid) {
          setVerificationData({
            valid: response.valid,
            certificate_number: response.certificate_number || certNumber,
            domain: response.domain || 'Unknown',
            organization_name: response.organization_name,
            security_score: response.security_score ?? 0,
            grade: response.grade || getGrade(response.security_score ?? 0),
            ssl_status: response.ssl_status || 'Unknown',
            ssl_grade: response.ssl_grade,
            ssl_issuer: response.ssl_issuer,
            ssl_expiry: response.ssl_expiry,
            scan_date: response.scan_date || new Date().toISOString(),
            vulnerabilities_found: response.vulnerabilities_found ?? 0,
            critical_issues: response.critical_issues ?? 0,
            high_issues: response.high_issues ?? 0,
            medium_issues: response.medium_issues ?? 0,
            low_issues: response.low_issues ?? 0,
            status: response.status || 'active',
            report_id: response.report_id,
          });
          return;
        }
      } catch {
        // New API not available, fall back to getCertificate
      }

      // Fallback to existing getCertificate API
      const response = await AivedhaAPI.getCertificate(certNumber);

      if (response) {
        const score = typeof response.security_score === 'number'
          ? response.security_score
          : parseFloat(response.security_score as string) || 0;

        setVerificationData({
          valid: true,
          certificate_number: certNumber,
          domain: response.url || response.asset || 'Unknown',
          organization_name: response.organization_name || response.customer_name,
          security_score: score,
          grade: getGrade(score),
          ssl_status: response.ssl_grade ? 'Valid' : 'Unknown',
          ssl_grade: response.ssl_grade,
          ssl_issuer: response.ssl_issuer,
          ssl_expiry: response.ssl_expiry,
          scan_date: response.scan_date || new Date().toISOString(),
          vulnerabilities_found: (response.critical_issues ?? 0) + (response.high_issues ?? 0) + (response.medium_issues ?? 0) + (response.low_issues ?? 0),
          critical_issues: response.critical_issues ?? 0,
          high_issues: response.high_issues ?? 0,
          medium_issues: response.medium_issues ?? 0,
          low_issues: response.low_issues ?? 0,
          status: 'active',
          report_id: response.report_id,
        });
      } else {
        setError('Certificate not found');
      }
    } catch {
      setError('Unable to verify certificate. Please check the certificate number.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (certificateNumber) {
      void fetchVerification(certificateNumber);
    }
  }, [certificateNumber, fetchVerification]);

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Loading State
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="relative mb-4">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
              <Shield className="w-8 h-8 text-primary absolute inset-0 m-auto" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Verifying Certificate</h2>
            <p className="text-muted-foreground">Please wait while we verify the security certificate...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // Error State
  if (error || !verificationData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center p-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <Card className="bg-card/80 backdrop-blur-md border-red-500/30">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Certificate Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  {error || 'The certificate number you entered could not be verified.'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Certificate: <code className="bg-muted px-2 py-1 rounded">{certificateNumber}</code>
                </p>
                <Link to="/">
                  <Button variant="invertPrimary" className="px-4 py-2">Return to Home</Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // Success State - Certificate Verified
  return (
    <Layout>
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 font-orbitron">
              AiVedha Guard Verification
            </h1>
            <p className="text-muted-foreground">
              Security Certificate Verification Portal
            </p>
          </motion.div>

          {/* Main Verification Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card/90 backdrop-blur-md border-2 border-primary/30 shadow-xl overflow-hidden">
              {/* Status Banner */}
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4">
                <div className="flex items-center justify-center gap-3 text-white">
                  <CheckCircle className="w-6 h-6" />
                  <span className="text-lg font-semibold">CERTIFICATE VERIFIED</span>
                </div>
              </div>

              <CardContent className="p-8">
                {/* Domain Info */}
                <div className="text-center mb-8">
                  <p className="text-sm text-muted-foreground mb-2">This certificate confirms that</p>
                  <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                    <Globe className="w-6 h-6 text-primary" />
                    {verificationData.domain}
                  </h2>
                  {verificationData.organization_name && (
                    <p className="text-muted-foreground">
                      Owned by: <span className="text-foreground font-medium">{verificationData.organization_name}</span>
                    </p>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Security Score */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
                  <div className={`w-32 h-32 rounded-full border-4 ${getScoreBgColor(verificationData.security_score)} flex flex-col items-center justify-center`}>
                    <span className={`text-4xl font-bold ${getScoreColor(verificationData.security_score)}`}>
                      {verificationData.security_score.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">/10</span>
                  </div>
                  <div className="text-center md:text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-primary" />
                      <span className="text-lg font-semibold">Security Grade: {verificationData.grade}</span>
                    </div>
                    <p className="text-muted-foreground max-w-sm">
                      This website has been tested for external server and security weaknesses by AiVedha Guard,
                      an AI Gemini 3.0 powered security assessment service.
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {/* SSL/TLS Status */}
                  <div className="bg-muted/50 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <Lock className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">SSL/TLS Encryption</h3>
                        <p className="text-sm text-muted-foreground">Certificate Status</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="default" className="bg-emerald-500">
                          <CheckCircle className="w-3 h-3 mr-1" /> {verificationData.ssl_status}
                        </Badge>
                      </div>
                      {verificationData.ssl_grade && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Grade</span>
                          <span className="font-medium text-foreground">{verificationData.ssl_grade}</span>
                        </div>
                      )}
                      {verificationData.ssl_issuer && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Issuer</span>
                          <span className="font-medium text-foreground truncate max-w-[150px]">{verificationData.ssl_issuer}</span>
                        </div>
                      )}
                      {verificationData.ssl_expiry && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expires</span>
                          <span className="font-medium text-foreground">{formatDate(verificationData.ssl_expiry)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vulnerability Summary */}
                  <div className="bg-muted/50 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                        <Server className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Security Scan Results</h3>
                        <p className="text-sm text-muted-foreground">Vulnerability Assessment</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Critical Issues</span>
                        <Badge variant={verificationData.critical_issues > 0 ? 'destructive' : 'secondary'}>
                          {verificationData.critical_issues}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">High Issues</span>
                        <Badge variant={verificationData.high_issues > 0 ? 'outline' : 'secondary'} className={verificationData.high_issues > 0 ? 'border-orange-500 text-orange-500' : ''}>
                          {verificationData.high_issues}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Medium Issues</span>
                        <Badge variant={verificationData.medium_issues > 0 ? 'outline' : 'secondary'} className={verificationData.medium_issues > 0 ? 'border-amber-500 text-amber-500' : ''}>
                          {verificationData.medium_issues}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Low / Info</span>
                        <Badge variant="secondary">
                          {verificationData.low_issues}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certificate Info */}
                <div className="bg-primary/5 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Certificate Details</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Certificate Number</span>
                      <p className="font-mono font-medium text-foreground">{verificationData.certificate_number}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Scan Date</span>
                      <p className="font-medium text-foreground">{formatDate(verificationData.scan_date)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="default" className="bg-emerald-500 ml-2">Active</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Verified By</span>
                      <p className="font-medium text-foreground">AiVedha Guard - AI Gemini 3.0</p>
                    </div>
                  </div>
                </div>

                {/* View Full Report button */}
                {verificationData.report_id && (
                  <div className="text-center mb-6">
                    <Link to={`/certificate/${verificationData.certificate_number}`}>
                      <Button variant="invertPrimary" className="px-6 py-3">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Full Certificate
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground mb-1">Important Disclaimer</p>
                      <p className="text-muted-foreground">
                        This certificate represents a point-in-time security assessment. AiVedha Guard provides no warranty
                        or guarantee of continuous security. Website security requires ongoing maintenance, patching, and monitoring
                        by the website owner. Always verify HTTPS and browser security indicators when visiting any website.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-8"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Powered by AiVedha Guard</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI Gemini 3.0 powered security assessment by Aivibe Software Services Pvt Ltd
            </p>
            <div className="mt-4">
              <Link to="/security-audit" className="text-primary hover:underline text-sm">
                Get your website audited
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Verify;
