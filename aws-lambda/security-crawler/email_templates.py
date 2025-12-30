"""
AiVedha Guard - Professional Email Templates
Version: 4.0.0

Beautiful, responsive HTML email templates for:
- Audit completion notifications
- Certificate issuance
- Welcome emails
- Credit alerts

Owner: Aravind Jayamohan
Company: AiVibe Software Services Pvt Ltd
"""

from datetime import datetime
from typing import Dict, Optional


def get_base_email_style() -> str:
    """Get base CSS styles for emails."""
    return """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background-color: #f3f4f6;
            margin: 0;
            padding: 0;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header {
            background: linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%);
            padding: 32px 24px;
            text-align: center;
        }

        .header h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.5px;
        }

        .header p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin: 8px 0 0 0;
        }

        .content {
            padding: 32px 24px;
        }

        .score-card {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin: 24px 0;
            border: 1px solid #bae6fd;
        }

        .score-value {
            font-size: 64px;
            font-weight: 700;
            color: #1e40af;
            line-height: 1;
        }

        .score-label {
            font-size: 14px;
            color: #64748b;
            margin-top: 8px;
        }

        .grade-badge {
            display: inline-block;
            padding: 8px 24px;
            border-radius: 999px;
            font-size: 18px;
            font-weight: 600;
            margin-top: 12px;
        }

        .grade-a { background-color: #10b981; color: white; }
        .grade-b { background-color: #22c55e; color: white; }
        .grade-c { background-color: #f59e0b; color: white; }
        .grade-d { background-color: #f97316; color: white; }
        .grade-f { background-color: #ef4444; color: white; }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin: 24px 0;
        }

        .stat-item {
            text-align: center;
            padding: 16px;
            background-color: #f9fafb;
            border-radius: 8px;
        }

        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #1f2937;
        }

        .stat-label {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
        }

        .stat-critical { color: #dc2626; }
        .stat-medium { color: #f59e0b; }
        .stat-low { color: #22c55e; }

        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 16px 0;
            text-align: center;
        }

        .cta-button:hover {
            opacity: 0.9;
        }

        .secondary-button {
            display: inline-block;
            background-color: #f3f4f6;
            color: #1f2937 !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            font-size: 14px;
            margin: 8px 0;
            border: 1px solid #e5e7eb;
        }

        .info-box {
            background-color: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 16px;
            margin: 24px 0;
            border-radius: 0 8px 8px 0;
        }

        .warning-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 24px 0;
            border-radius: 0 8px 8px 0;
        }

        .success-box {
            background-color: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 16px;
            margin: 24px 0;
            border-radius: 0 8px 8px 0;
        }

        .footer {
            background-color: #1f2937;
            padding: 24px;
            text-align: center;
        }

        .footer p {
            color: #9ca3af;
            font-size: 12px;
            margin: 4px 0;
        }

        .footer a {
            color: #60a5fa;
            text-decoration: none;
        }

        .divider {
            border-top: 1px solid #e5e7eb;
            margin: 24px 0;
        }

        .certificate-number {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #1e40af;
            background-color: #f0f9ff;
            padding: 8px 16px;
            border-radius: 4px;
            display: inline-block;
            margin: 8px 0;
        }

        @media only screen and (max-width: 600px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }

            .content {
                padding: 24px 16px;
            }
        }
    </style>
    """


def generate_audit_completion_email(
    user_name: str,
    user_email: str,
    url: str,
    security_score: float,
    grade: str,
    critical_issues: int,
    high_issues: int,
    medium_issues: int,
    low_issues: int,
    report_id: str,
    certificate_number: str,
    pdf_url: str,
    brand_name: str = "AiVedha Guard"
) -> Dict[str, str]:
    """
    Generate audit completion email HTML.

    Returns:
        Dict with 'subject', 'html', and 'text' keys
    """
    # Determine grade class
    grade_class = 'grade-a' if grade in ['A+', 'A'] else \
                  'grade-b' if grade == 'B' else \
                  'grade-c' if grade == 'C' else \
                  'grade-d' if grade == 'D' else 'grade-f'

    # Assessment message based on score
    if security_score >= 8:
        assessment = "Excellent! Your website demonstrates strong security practices."
        assessment_class = "success-box"
    elif security_score >= 6:
        assessment = "Good work! Some improvements recommended to enhance security."
        assessment_class = "info-box"
    elif security_score >= 4:
        assessment = "Attention needed. Several security issues should be addressed."
        assessment_class = "warning-box"
    else:
        assessment = "Critical! Immediate action required to secure your website."
        assessment_class = "warning-box"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Audit Complete</title>
        {get_base_email_style()}
    </head>
    <body>
        <div style="padding: 20px; background-color: #f3f4f6;">
            <div class="email-container">
                <!-- Header -->
                <div class="header">
                    <h1>🛡️ {brand_name}</h1>
                    <p>Enterprise Security Audit Platform</p>
                </div>

                <!-- Content -->
                <div class="content">
                    <h2 style="color: #1f2937; margin: 0 0 8px 0;">Security Audit Complete!</h2>
                    <p style="color: #6b7280; margin: 0 0 24px 0;">
                        Hello {user_name or 'there'},<br>
                        Your security audit for <strong>{url}</strong> has been completed.
                    </p>

                    <!-- Score Card -->
                    <div class="score-card">
                        <div class="score-value">{security_score}</div>
                        <div class="score-label">Security Score out of 10</div>
                        <div class="grade-badge {grade_class}">Grade: {grade}</div>
                    </div>

                    <!-- Assessment -->
                    <div class="{assessment_class}">
                        <strong>Assessment:</strong> {assessment}
                    </div>

                    <!-- Stats Grid -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                        <tr>
                            <td style="text-align: center; padding: 12px; background-color: #fef2f2; border-radius: 8px;">
                                <div style="font-size: 22px; font-weight: 700; color: #dc2626;">{critical_issues}</div>
                                <div style="font-size: 11px; color: #6b7280;">Critical</div>
                            </td>
                            <td width="8"></td>
                            <td style="text-align: center; padding: 12px; background-color: #fff7ed; border-radius: 8px;">
                                <div style="font-size: 22px; font-weight: 700; color: #ea580c;">{high_issues}</div>
                                <div style="font-size: 11px; color: #6b7280;">High</div>
                            </td>
                            <td width="8"></td>
                            <td style="text-align: center; padding: 12px; background-color: #fef3c7; border-radius: 8px;">
                                <div style="font-size: 22px; font-weight: 700; color: #f59e0b;">{medium_issues}</div>
                                <div style="font-size: 11px; color: #6b7280;">Medium</div>
                            </td>
                            <td width="8"></td>
                            <td style="text-align: center; padding: 12px; background-color: #d1fae5; border-radius: 8px;">
                                <div style="font-size: 22px; font-weight: 700; color: #22c55e;">{low_issues}</div>
                                <div style="font-size: 11px; color: #6b7280;">Low</div>
                            </td>
                        </tr>
                    </table>

                    <!-- Certificate Number -->
                    <div style="text-align: center; margin: 24px 0;">
                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Your Certificate Number:</p>
                        <div class="certificate-number">{certificate_number}</div>
                    </div>

                    <div class="divider"></div>

                    <!-- CTA buttons -->
                    <div style="text-align: center;">
                        <a href="{pdf_url}" class="cta-button">📥 Download PDF Report</a>
                        <br>
                        <a href="https://aivedha.ai/dashboard" class="secondary-button">View in Dashboard</a>
                        <a href="https://aivedha.ai/certificate/{certificate_number}" class="secondary-button">View Certificate</a>
                    </div>

                    <div class="divider"></div>

                    <!-- Additional Info -->
                    <div class="info-box">
                        <strong>What's Next?</strong>
                        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #4b5563;">
                            <li>Review the detailed findings in your PDF report</li>
                            <li>Address critical and high severity issues first</li>
                            <li>Re-run the audit after making fixes to verify improvements</li>
                            <li>Share your certificate to demonstrate security commitment</li>
                        </ul>
                    </div>

                    <p style="color: #6b7280; font-size: 14px;">
                        The download link expires in 3 days. You can always access your reports from the dashboard.
                    </p>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <p><strong>{brand_name}</strong></p>
                    <p>Enterprise Security Platform by Aivibe Software Services Pvt Ltd</p>
                    <p>
                        <a href="https://aivedha.ai">Website</a> |
                        <a href="https://aivedha.ai/dashboard">Dashboard</a> |
                        <a href="mailto:support@aivedha.ai">Support</a>
                    </p>
                    <p style="margin-top: 16px;">
                        © {datetime.utcnow().year} Aivibe Software Services Pvt Ltd. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    text = f"""
{brand_name} - Security Audit Complete

Hello {user_name or 'there'},

Your security audit for {url} has been completed.

SECURITY SCORE: {security_score}/10 (Grade: {grade})

Findings Summary:
- Critical Issues: {critical_issues}
- High Issues: {high_issues}
- Medium Issues: {medium_issues}
- Low Issues: {low_issues}

Certificate Number: {certificate_number}

Download your full PDF report: {pdf_url}

View your certificate: https://aivedha.ai/certificate/{certificate_number}

This link expires in 3 days. You can always access your reports from the dashboard.

--
{brand_name}
Enterprise Security Platform by Aivibe Software Services Pvt Ltd
https://aivedha.ai
    """

    subject = f"Security Audit Complete: {url} scored {security_score}/10 (Grade: {grade})"

    return {
        'subject': subject,
        'html': html,
        'text': text
    }


def generate_welcome_email(
    user_name: str,
    user_email: str,
    credits: int = 3,
    brand_name: str = "AiVedha Guard"
) -> Dict[str, str]:
    """
    Generate welcome email for new users.
    Includes poetic message about 3 free credits with no hidden fees.

    Returns:
        Dict with 'subject', 'html', and 'text' keys
    """
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to {brand_name}</title>
        {get_base_email_style()}
    </head>
    <body>
        <div style="padding: 20px; background-color: #f3f4f6;">
            <div class="email-container">
                <!-- Header -->
                <div class="header">
                    <h1>🛡️ Welcome to {brand_name}!</h1>
                    <p>Your journey to better security starts now</p>
                </div>

                <!-- Content -->
                <div class="content">
                    <h2 style="color: #1f2937; margin: 0 0 8px 0;">Hello {user_name or 'there'}! 👋</h2>
                    <p style="color: #6b7280; margin: 0 0 24px 0;">
                        Thank you for joining {brand_name}. We're thrilled to have you on board!
                    </p>

                    <!-- Poetic Welcome Message -->
                    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; border: 1px solid #86efac;">
                        <div style="font-size: 48px; margin-bottom: 12px;">🎁</div>
                        <h3 style="color: #166534; margin: 0 0 12px 0; font-size: 20px;">Your Welcome Gift Awaits!</h3>
                        <p style="color: #15803d; font-size: 16px; margin: 0 0 16px 0; font-style: italic;">
                            "In the realm of digital trust,<br>
                            Security is an absolute must.<br>
                            Three audits free, no strings attached,<br>
                            Your cyber safety perfectly matched."
                        </p>
                        <div style="background: white; border-radius: 8px; padding: 16px; display: inline-block;">
                            <span style="font-size: 36px; font-weight: 700; color: #10b981;">{credits}</span>
                            <span style="font-size: 16px; color: #6b7280; display: block;">Free Audit Credits</span>
                        </div>
                    </div>

                    <!-- No Hidden Fees Banner -->
                    <div style="background-color: #eff6ff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
                        <strong style="color: #1e40af; font-size: 16px;">✨ No Credit Card Required • No Hidden Fees • No Commitments ✨</strong>
                        <p style="color: #3b82f6; margin: 8px 0 0 0; font-size: 14px;">
                            Use your {credits} free credits anytime. Full features unlocked. Pure security, no surprises!
                        </p>
                    </div>

                    <!-- Getting Started -->
                    <h3 style="color: #1f2937; margin: 24px 0 16px 0;">🚀 Getting Started in 3 Easy Steps</h3>

                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding: 16px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
                                <strong style="color: #1e40af;">1. 🔍 Run Your First Audit</strong>
                                <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">
                                    Enter any website URL and get a comprehensive security report in minutes.
                                    Our AI-powered scanner checks for 100+ vulnerability types.
                                </p>
                            </td>
                        </tr>
                        <tr><td height="12"></td></tr>
                        <tr>
                            <td style="padding: 16px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
                                <strong style="color: #1e40af;">2. 📊 Review Findings</strong>
                                <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">
                                    Get detailed vulnerability reports with severity ratings, CVSS scores,
                                    and AI-powered fix recommendations tailored to your tech stack.
                                </p>
                            </td>
                        </tr>
                        <tr><td height="12"></td></tr>
                        <tr>
                            <td style="padding: 16px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
                                <strong style="color: #1e40af;">3. 🏆 Get Certified</strong>
                                <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">
                                    Receive a verifiable security certificate and professional PDF report
                                    to share with stakeholders, clients, and compliance auditors.
                                </p>
                            </td>
                        </tr>
                    </table>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="https://aivedha.ai/audit" class="cta-button">🔍 Start Your First Free Audit</a>
                    </div>

                    <div class="divider"></div>

                    <!-- Features -->
                    <h3 style="color: #1f2937; margin: 0 0 16px 0;">🛡️ What's Included (All Features Unlocked!)</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="50%" style="padding: 8px 0;">
                                <span style="color: #10b981;">✓</span> <span style="color: #4b5563;">OWASP Top 10 Scanning</span>
                            </td>
                            <td width="50%" style="padding: 8px 0;">
                                <span style="color: #10b981;">✓</span> <span style="color: #4b5563;">SSL/TLS Analysis</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">
                                <span style="color: #10b981;">✓</span> <span style="color: #4b5563;">Security Headers Check</span>
                            </td>
                            <td style="padding: 8px 0;">
                                <span style="color: #10b981;">✓</span> <span style="color: #4b5563;">AI Fix Recommendations</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">
                                <span style="color: #10b981;">✓</span> <span style="color: #4b5563;">Professional PDF Reports</span>
                            </td>
                            <td style="padding: 8px 0;">
                                <span style="color: #10b981;">✓</span> <span style="color: #4b5563;">Verified Certificates</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">
                                <span style="color: #10b981;">✓</span> <span style="color: #4b5563;">DNS Security Analysis</span>
                            </td>
                            <td style="padding: 8px 0;">
                                <span style="color: #10b981;">✓</span> <span style="color: #4b5563;">CMS Detection</span>
                            </td>
                        </tr>
                    </table>

                    <div class="info-box" style="margin-top: 24px;">
                        <strong>💡 Pro Tip:</strong><br>
                        Use your free credits to audit your most important websites first.
                        When you're ready for more, check out our
                        <a href="https://aivedha.ai/pricing" style="color: #0ea5e9;">affordable plans</a>
                        starting at just $10/month!
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <p><strong>{brand_name}</strong></p>
                    <p>Enterprise Security Platform by Aivibe Software Services Pvt Ltd</p>
                    <p>
                        <a href="https://aivedha.ai">Website</a> |
                        <a href="https://aivedha.ai/faq">FAQ</a> |
                        <a href="mailto:support@aivedha.ai">Support</a>
                    </p>
                    <p style="margin-top: 16px; font-size: 11px; color: #9ca3af;">
                        © {datetime.utcnow().year} Aivibe Software Services Pvt Ltd. All rights reserved.<br>
                        ISO 27001:2022 Certified | NVIDIA Inception Partner | AWS Activate
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    text = f"""
Welcome to {brand_name}! 🛡️

Hello {user_name or 'there'},

Thank you for joining {brand_name}. We're thrilled to have you on board!

🎁 YOUR WELCOME GIFT AWAITS!

"In the realm of digital trust,
Security is an absolute must.
Three audits free, no strings attached,
Your cyber safety perfectly matched."

You've received {credits} FREE AUDIT CREDITS!

✨ No Credit Card Required • No Hidden Fees • No Commitments ✨
Use your {credits} free credits anytime. Full features unlocked. Pure security, no surprises!

🚀 GETTING STARTED IN 3 EASY STEPS:

1. 🔍 Run Your First Audit
   Enter any website URL and get a comprehensive security report in minutes.

2. 📊 Review Findings
   Get detailed vulnerability reports with AI-powered fix recommendations.

3. 🏆 Get Certified
   Receive a verifiable security certificate and professional PDF report.

Start your first FREE audit: https://aivedha.ai/audit

🛡️ ALL FEATURES INCLUDED:
✓ OWASP Top 10 Scanning
✓ SSL/TLS Analysis
✓ Security Headers Check
✓ AI Fix Recommendations
✓ Professional PDF Reports
✓ Verified Certificates

Need help? Contact us at support@aivedha.ai

--
{brand_name}
Enterprise Security Platform by Aivibe Software Services Pvt Ltd
https://aivedha.ai

ISO 27001:2022 Certified | NVIDIA Inception Partner | AWS Activate
    """

    subject = f"🎁 Welcome to {brand_name} - 3 Free Security Audits Await!"

    return {
        'subject': subject,
        'html': html,
        'text': text
    }


def generate_low_credits_alert(
    user_name: str,
    user_email: str,
    remaining_credits: int,
    brand_name: str = "AiVedha Guard"
) -> Dict[str, str]:
    """
    Generate low credits alert email.

    Returns:
        Dict with 'subject', 'html', and 'text' keys
    """
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Low Credits Alert</title>
        {get_base_email_style()}
    </head>
    <body>
        <div style="padding: 20px; background-color: #f3f4f6;">
            <div class="email-container">
                <!-- Header -->
                <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    <h1>⚠️ Low Credits Alert</h1>
                    <p>Your audit credits are running low</p>
                </div>

                <!-- Content -->
                <div class="content">
                    <h2 style="color: #1f2937; margin: 0 0 8px 0;">Hello {user_name or 'there'},</h2>
                    <p style="color: #6b7280; margin: 0 0 24px 0;">
                        This is a friendly reminder that your audit credits are running low.
                    </p>

                    <!-- Credits Display -->
                    <div class="warning-box" style="text-align: center;">
                        <div style="font-size: 48px; font-weight: 700; color: #f59e0b;">{remaining_credits}</div>
                        <div style="color: #92400e; font-size: 14px;">Credits Remaining</div>
                    </div>

                    <p style="color: #4b5563;">
                        To continue running security audits without interruption, consider topping up your credits
                        or upgrading to a subscription plan.
                    </p>

                    <div style="text-align: center; margin: 24px 0;">
                        <a href="https://aivedha.ai/pricing" class="cta-button">💳 Get More Credits</a>
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <p><strong>{brand_name}</strong></p>
                    <p>
                        <a href="https://aivedha.ai">Website</a> |
                        <a href="mailto:support@aivedha.ai">Support</a>
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    text = f"""
{brand_name} - Low Credits Alert

Hello {user_name or 'there'},

Your audit credits are running low.

Credits Remaining: {remaining_credits}

To continue running security audits without interruption, consider topping up:
https://aivedha.ai/pricing

--
{brand_name}
https://aivedha.ai
    """

    subject = f"⚠️ Low Credits Alert - Only {remaining_credits} credit{'s' if remaining_credits != 1 else ''} remaining"

    return {
        'subject': subject,
        'html': html,
        'text': text
    }


def generate_login_alert_email(
    user_name: str,
    user_email: str,
    login_time: str,
    login_ip: str = "Unknown",
    login_location: str = "Unknown",
    login_device: str = "Unknown",
    brand_name: str = "AiVedha Guard"
) -> Dict[str, str]:
    """
    Generate login security alert email.
    Sent on every login to notify user of account activity.

    Returns:
        Dict with 'subject', 'html', and 'text' keys
    """
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Alert</title>
        {get_base_email_style()}
    </head>
    <body>
        <div style="padding: 20px; background-color: #f3f4f6;">
            <div class="email-container">
                <!-- Header -->
                <div class="header" style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);">
                    <h1>🔐 Security Alert</h1>
                    <p>New login detected on your account</p>
                </div>

                <!-- Content -->
                <div class="content">
                    <h2 style="color: #1f2937; margin: 0 0 8px 0;">Hello {user_name or 'there'},</h2>
                    <p style="color: #6b7280; margin: 0 0 24px 0;">
                        We detected a new login to your {brand_name} account.
                    </p>

                    <!-- Login Details -->
                    <div class="info-box">
                        <strong>📍 Login Details:</strong>
                        <table style="margin-top: 12px; width: 100%;">
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; width: 120px;">Time:</td>
                                <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">{login_time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">IP Address:</td>
                                <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">{login_ip}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Location:</td>
                                <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">{login_location}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Device:</td>
                                <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">{login_device}</td>
                            </tr>
                        </table>
                    </div>

                    <div class="success-box">
                        <strong>✅ Was this you?</strong><br>
                        If you recognize this login, no action is needed. You can safely ignore this email.
                    </div>

                    <div class="warning-box">
                        <strong>⚠️ Didn't recognize this login?</strong><br>
                        If you don't recognize this activity, please:
                        <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                            <li>Change your password immediately</li>
                            <li>Review your recent account activity</li>
                            <li>Contact our support team</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 24px 0;">
                        <a href="https://aivedha.ai/dashboard" class="cta-button">View Account Activity</a>
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <p><strong>{brand_name}</strong></p>
                    <p>This is an automated security notification.</p>
                    <p>
                        <a href="https://aivedha.ai">Website</a> |
                        <a href="mailto:support@aivedha.ai">Support</a>
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    text = f"""
{brand_name} - Security Alert

Hello {user_name or 'there'},

We detected a new login to your {brand_name} account.

Login Details:
- Time: {login_time}
- IP Address: {login_ip}
- Location: {login_location}
- Device: {login_device}

Was this you?
If you recognize this login, no action is needed.

Didn't recognize this login?
- Change your password immediately
- Review your recent account activity
- Contact support at support@aivedha.ai

--
{brand_name}
https://aivedha.ai
    """

    subject = f"🔐 New login to your {brand_name} account"

    return {
        'subject': subject,
        'html': html,
        'text': text
    }


def generate_purchase_confirmation_email(
    user_name: str,
    user_email: str,
    plan_name: str,
    plan_price: str,
    currency: str = "USD",
    billing_cycle: str = "monthly",
    credits_received: int = 10,
    invoice_number: str = "",
    payment_method: str = "Card",
    transaction_id: str = "",
    next_billing_date: str = "",
    brand_name: str = "AiVedha Guard"
) -> Dict[str, str]:
    """
    Generate purchase/subscription confirmation email.
    Sent after successful plan purchase.

    Returns:
        Dict with 'subject', 'html', and 'text' keys
    """
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Purchase Confirmation</title>
        {get_base_email_style()}
    </head>
    <body>
        <div style="padding: 20px; background-color: #f3f4f6;">
            <div class="email-container">
                <!-- Header -->
                <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    <h1>✅ Payment Successful!</h1>
                    <p>Thank you for your purchase</p>
                </div>

                <!-- Content -->
                <div class="content">
                    <h2 style="color: #1f2937; margin: 0 0 8px 0;">Thank you, {user_name or 'valued customer'}!</h2>
                    <p style="color: #6b7280; margin: 0 0 24px 0;">
                        Your subscription to {brand_name} has been successfully activated.
                    </p>

                    <!-- Order Summary -->
                    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 24px; margin: 24px 0;">
                        <h3 style="color: #166534; margin: 0 0 16px 0;">📦 Order Summary</h3>
                        <table style="width: 100%;">
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Plan:</td>
                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">{plan_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Price:</td>
                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">{currency} {plan_price}/{billing_cycle}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Credits Added:</td>
                                <td style="padding: 8px 0; color: #10b981; font-weight: 600; text-align: right;">+{credits_received} credits</td>
                            </tr>
                            <tr style="border-top: 1px solid #86efac;">
                                <td style="padding: 12px 0 0 0; color: #6b7280;">Payment Method:</td>
                                <td style="padding: 12px 0 0 0; color: #1f2937; text-align: right;">{payment_method}</td>
                            </tr>
                            {"<tr><td style='padding: 8px 0; color: #6b7280;'>Transaction ID:</td><td style='padding: 8px 0; color: #1f2937; text-align: right; font-family: monospace;'>" + transaction_id + "</td></tr>" if transaction_id else ""}
                            {"<tr><td style='padding: 8px 0; color: #6b7280;'>Invoice #:</td><td style='padding: 8px 0; color: #1f2937; text-align: right;'>" + invoice_number + "</td></tr>" if invoice_number else ""}
                        </table>
                    </div>

                    <!-- Next Steps -->
                    <div class="success-box">
                        <strong>🎉 Your credits are ready!</strong><br>
                        You now have <strong>{credits_received} audit credits</strong> to use.
                        Start scanning your websites for vulnerabilities today!
                    </div>

                    {"<div class='info-box'><strong>📅 Next Billing:</strong><br>Your subscription will renew on <strong>" + next_billing_date + "</strong>.</div>" if next_billing_date else ""}

                    <div style="text-align: center; margin: 24px 0;">
                        <a href="https://aivedha.ai/audit" class="cta-button">Start Security Audit</a>
                        <br>
                        <a href="https://aivedha.ai/dashboard" class="secondary-button">View Dashboard</a>
                    </div>

                    <div class="divider"></div>

                    <p style="color: #6b7280; font-size: 14px;">
                        Questions about your purchase? Contact us at
                        <a href="mailto:support@aivedha.ai" style="color: #0ea5e9;">support@aivedha.ai</a>
                    </p>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <p><strong>{brand_name}</strong></p>
                    <p>Enterprise Security Platform by Aivibe Software Services Pvt Ltd</p>
                    <p>
                        <a href="https://aivedha.ai">Website</a> |
                        <a href="https://aivedha.ai/dashboard">Dashboard</a> |
                        <a href="mailto:support@aivedha.ai">Support</a>
                    </p>
                    <p style="margin-top: 16px;">
                        © {datetime.utcnow().year} Aivibe Software Services Pvt Ltd. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    text = f"""
{brand_name} - Payment Successful!

Thank you, {user_name or 'valued customer'}!

Your subscription to {brand_name} has been successfully activated.

Order Summary:
- Plan: {plan_name}
- Price: {currency} {plan_price}/{billing_cycle}
- Credits Added: +{credits_received} credits
- Payment Method: {payment_method}
{f"- Transaction ID: {transaction_id}" if transaction_id else ""}
{f"- Invoice #: {invoice_number}" if invoice_number else ""}

Your credits are ready! Start scanning your websites today.

{f"Next Billing: {next_billing_date}" if next_billing_date else ""}

Start auditing: https://aivedha.ai/audit
View dashboard: https://aivedha.ai/dashboard

Questions? Contact support@aivedha.ai

--
{brand_name}
Enterprise Security Platform by Aivibe Software Services Pvt Ltd
https://aivedha.ai
    """

    subject = f"✅ Payment Confirmed - Welcome to {plan_name}!"

    return {
        'subject': subject,
        'html': html,
        'text': text
    }


# Export functions
__all__ = [
    'generate_audit_completion_email',
    'generate_welcome_email',
    'generate_low_credits_alert',
    'generate_login_alert_email',
    'generate_purchase_confirmation_email',
    'get_base_email_style'
]
