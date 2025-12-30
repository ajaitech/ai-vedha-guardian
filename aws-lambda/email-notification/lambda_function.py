import json
import boto3
import os
from datetime import datetime
import uuid

# Initialize AWS services
ses = boto3.client('ses', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# Email sender configuration
SENDER_ADMIN = "AiVedha Guardian <admin@aivedha.ai>"
SENDER_NOREPLY = "AiVedha Guardian <noreply@aivedha.ai>"
SENDER_SUPPORT = "AiVedha Support <support@aivedha.ai>"

def lambda_handler(event, context):
    """
    Lambda function for sending email notifications
    Handles: welcome emails, login alerts, payment confirmations, subscription reminders
    """

    try:
        # Parse event body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', event)

        email_type = body.get('type')
        recipient_email = body.get('email')
        template_data = body.get('data', {})

        if not email_type or not recipient_email:
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'Missing required parameters: type, email'})
            }

        # Route to appropriate email handler
        if email_type == 'welcome':
            result = send_welcome_email(recipient_email, template_data)
        elif email_type == 'login_alert':
            result = send_login_alert(recipient_email, template_data)
        elif email_type == 'payment_success':
            result = send_payment_success(recipient_email, template_data)
        elif email_type == 'subscription_reminder':
            result = send_subscription_reminder(recipient_email, template_data)
        elif email_type == 'audit_completion':
            result = send_audit_completion(recipient_email, template_data)
        else:
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': f'Unknown email type: {email_type}'})
            }

        # Log email sent
        log_email_sent(email_type, recipient_email, result)

        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps({
                'success': True,
                'message': f'{email_type} email sent successfully',
                'messageId': result.get('MessageId')
            })
        }

    except Exception as e:
        print(f"Email error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': str(e)})
        }

def send_welcome_email(recipient_email, data):
    """Send welcome email to new users - Professional HTML design"""
    user_name = data.get('userName', recipient_email.split('@')[0])
    credits = data.get('credits', 3)
    plan_name = data.get('planName', 'Aarambh')

    html_body = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Arial,sans-serif;background-color:#f0f4f8;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <!-- Header with Logo -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#3b82f6 100%);padding:40px 30px;text-align:center;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <div style="width:80px;height:80px;background:rgba(255,255,255,0.15);border-radius:20px;display:inline-block;line-height:80px;">
                                            <span style="font-size:40px;color:#ffffff;">&#128737;</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top:20px;">
                                        <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:600;letter-spacing:-0.5px;">Welcome to AiVedha Guardian</h1>
                                        <p style="color:rgba(255,255,255,0.8);margin:10px 0 0;font-size:16px;">AI-Powered Security for the Modern Web</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Welcome Message -->
                    <tr>
                        <td style="padding:40px 40px 20px;">
                            <p style="font-size:18px;color:#1e293b;margin:0 0 20px;">Hello <strong style="color:#1e3a8a;">{user_name}</strong>,</p>
                            <p style="font-size:16px;color:#475569;line-height:1.7;margin:0;">
                                Thank you for joining AiVedha Guardian. You now have access to enterprise-grade security auditing powered by artificial intelligence.
                            </p>
                        </td>
                    </tr>

                    <!-- Account Summary Card -->
                    <tr>
                        <td style="padding:0 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%);border-radius:12px;border:1px solid #e2e8f0;">
                                <tr>
                                    <td style="padding:25px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="border-bottom:1px solid #cbd5e1;padding-bottom:15px;margin-bottom:15px;">
                                                    <span style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Your Account</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding-top:15px;">
                                                    <table width="100%" cellpadding="8" cellspacing="0">
                                                        <tr>
                                                            <td style="color:#64748b;font-size:14px;">Email</td>
                                                            <td align="right" style="color:#1e293b;font-size:14px;font-weight:500;">{recipient_email}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="color:#64748b;font-size:14px;">Plan</td>
                                                            <td align="right" style="color:#1e3a8a;font-size:14px;font-weight:600;">{plan_name}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="color:#64748b;font-size:14px;">Audit Credits</td>
                                                            <td align="right" style="color:#059669;font-size:14px;font-weight:600;">{credits} Credits</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Features -->
                    <tr>
                        <td style="padding:30px 40px;">
                            <p style="font-size:14px;color:#64748b;margin:0 0 15px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">What You Can Do</p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding:10px 0;">
                                        <table cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="width:24px;vertical-align:top;padding-right:12px;">
                                                    <span style="color:#3b82f6;font-size:16px;">&#10003;</span>
                                                </td>
                                                <td style="color:#475569;font-size:14px;line-height:1.5;">
                                                    <strong>Comprehensive Security Scans</strong> - Detect vulnerabilities, misconfigurations, and security risks
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0;">
                                        <table cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="width:24px;vertical-align:top;padding-right:12px;">
                                                    <span style="color:#3b82f6;font-size:16px;">&#10003;</span>
                                                </td>
                                                <td style="color:#475569;font-size:14px;line-height:1.5;">
                                                    <strong>AI-Powered Analysis</strong> - Get intelligent recommendations with remediation guidance
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0;">
                                        <table cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="width:24px;vertical-align:top;padding-right:12px;">
                                                    <span style="color:#3b82f6;font-size:16px;">&#10003;</span>
                                                </td>
                                                <td style="color:#475569;font-size:14px;line-height:1.5;">
                                                    <strong>Professional Certificates</strong> - Shareable security certificates for your clients
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                        <td style="padding:10px 40px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="https://aivedha.ai/dashboard" style="display:inline-block;background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);color:#ffffff;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 4px 14px rgba(59,130,246,0.4);">Start Your First Audit</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8fafc;padding:30px 40px;border-top:1px solid #e2e8f0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin:0 0 10px;font-size:13px;color:#64748b;">Need help? Visit our <a href="https://aivedha.ai/faq" style="color:#3b82f6;text-decoration:none;">FAQ</a> or contact <a href="mailto:support@aivedha.ai" style="color:#3b82f6;text-decoration:none;">support@aivedha.ai</a></p>
                                        <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; {datetime.utcnow().year} AiVedha Guard by Aivibe Software Services Pvt Ltd</p>
                                        <p style="margin:5px 0 0;font-size:11px;color:#94a3b8;">ISO 27001:2022 Certified | Global AI Security Platform</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
'''

    text_body = f'''Welcome to AiVedha Guardian

Hello {user_name},

Thank you for joining AiVedha Guardian - AI-Powered Security for the Modern Web.

YOUR ACCOUNT
- Email: {recipient_email}
- Plan: {plan_name}
- Audit Credits: {credits}

WHAT YOU CAN DO
- Comprehensive Security Scans - Detect vulnerabilities and security risks
- AI-Powered Analysis - Get intelligent recommendations
- Professional Certificates - Shareable security certificates

Start your first audit at: https://aivedha.ai/dashboard

Need help? Visit https://aivedha.ai/faq or contact support@aivedha.ai

--
AiVedha Guard - AI-Powered Security Audits
https://aivedha.ai
'''

    response = ses.send_email(
        Source=SENDER_ADMIN,
        Destination={'ToAddresses': [recipient_email]},
        Message={
            'Subject': {'Data': 'Welcome to AiVedha Guardian - Your Security Journey Begins', 'Charset': 'UTF-8'},
            'Body': {
                'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                'Html': {'Data': html_body, 'Charset': 'UTF-8'}
            }
        }
    )
    return response

def send_login_alert(recipient_email, data):
    """Send login alert notification - Professional security-focused design"""
    user_name = data.get('userName', 'User')
    login_time = data.get('loginTime', datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC'))
    login_location = data.get('loginLocation', 'Unknown Location')
    device_info = data.get('deviceInfo', 'Unknown Device')
    ip_address = data.get('ipAddress', 'Unknown')
    login_method = data.get('loginMethod', 'Email')

    html_body = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Arial,sans-serif;background-color:#f0f4f8;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%);padding:35px 30px;text-align:center;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <div style="width:60px;height:60px;background:rgba(255,255,255,0.15);border-radius:50%;display:inline-block;line-height:60px;">
                                            <span style="font-size:28px;color:#ffffff;">&#128274;</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top:15px;">
                                        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;">New Sign-In Detected</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Alert Message -->
                    <tr>
                        <td style="padding:35px 40px 20px;">
                            <p style="font-size:16px;color:#1e293b;margin:0 0 15px;">Hello <strong>{user_name}</strong>,</p>
                            <p style="font-size:15px;color:#475569;line-height:1.6;margin:0;">
                                We detected a new sign-in to your AiVedha Guardian account. If this was you, no action is needed.
                            </p>
                        </td>
                    </tr>

                    <!-- Login Details Card -->
                    <tr>
                        <td style="padding:0 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:12px;border-left:4px solid #3b82f6;">
                                <tr>
                                    <td style="padding:25px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding-bottom:20px;">
                                                    <span style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Sign-In Details</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;width:120px;">Time</td>
                                                                        <td style="color:#1e293b;font-size:13px;font-weight:500;">{login_time}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;width:120px;">Method</td>
                                                                        <td style="color:#1e293b;font-size:13px;font-weight:500;">{login_method}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;width:120px;">Device</td>
                                                                        <td style="color:#1e293b;font-size:13px;font-weight:500;">{device_info}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;width:120px;">Location</td>
                                                                        <td style="color:#1e293b;font-size:13px;font-weight:500;">{login_location}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:8px 0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;width:120px;">IP Address</td>
                                                                        <td style="color:#1e293b;font-size:13px;font-weight:500;font-family:monospace;">{ip_address}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Security Notice -->
                    <tr>
                        <td style="padding:25px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef3c7;border-radius:8px;border:1px solid #fcd34d;">
                                <tr>
                                    <td style="padding:15px 20px;">
                                        <table cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="width:24px;vertical-align:top;padding-right:12px;">
                                                    <span style="color:#d97706;font-size:18px;">&#9888;</span>
                                                </td>
                                                <td style="color:#92400e;font-size:13px;line-height:1.5;">
                                                    <strong>Not you?</strong> If you did not sign in, please secure your account immediately by changing your password and contacting our support team.
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                        <td style="padding:10px 40px 35px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="https://aivedha.ai/dashboard/profile" style="display:inline-block;background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Review Account Security</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8fafc;padding:25px 40px;border-top:1px solid #e2e8f0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin:0 0 8px;font-size:12px;color:#64748b;">This is an automated security notification from AiVedha Guardian</p>
                                        <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; {datetime.utcnow().year} AiVedha Guard by Aivibe Software Services Pvt Ltd</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
'''

    text_body = f'''New Sign-In Detected - AiVedha Guardian

Hello {user_name},

We detected a new sign-in to your AiVedha Guardian account.

SIGN-IN DETAILS
- Time: {login_time}
- Method: {login_method}
- Device: {device_info}
- Location: {login_location}
- IP Address: {ip_address}

If this was you, no action is needed.

NOT YOU?
If you did not sign in, please secure your account immediately:
1. Change your password
2. Contact support@aivedha.ai

Review your account security: https://aivedha.ai/dashboard/profile

--
AiVedha Guard Security Team
https://aivedha.ai
'''

    response = ses.send_email(
        Source=SENDER_NOREPLY,
        Destination={'ToAddresses': [recipient_email]},
        Message={
            'Subject': {'Data': 'Security Alert - New Sign-In to Your AiVedha Account', 'Charset': 'UTF-8'},
            'Body': {
                'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                'Html': {'Data': html_body, 'Charset': 'UTF-8'}
            }
        }
    )
    return response

def send_payment_success(recipient_email, data):
    """Send payment success/invoice email - Professional HTML design"""
    user_name = data.get('userName', 'Valued Customer')
    invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    invoice_date = datetime.utcnow().strftime('%B %d, %Y')
    plan_name = data.get('planName', 'Premium')
    amount = data.get('amount', '$10.00')
    credits = data.get('credits', 10)
    subscription_id = data.get('subscriptionId', 'N/A')
    billing_period = data.get('billingPeriod', 'Monthly')
    next_billing_date = data.get('nextBillingDate', 'N/A')
    payment_method = data.get('paymentMethod', 'PayPal')

    html_body = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Arial,sans-serif;background-color:#f0f4f8;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:35px 30px;text-align:center;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <div style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-block;line-height:60px;">
                                            <span style="font-size:28px;color:#ffffff;">&#10003;</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top:15px;">
                                        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;">Payment Successful</h1>
                                        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Thank you for your subscription</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding:35px 40px 20px;">
                            <p style="font-size:16px;color:#1e293b;margin:0;">Hello <strong style="color:#059669;">{user_name}</strong>,</p>
                            <p style="font-size:15px;color:#475569;line-height:1.6;margin:15px 0 0;">
                                Your payment has been processed successfully. Here are your transaction details:
                            </p>
                        </td>
                    </tr>

                    <!-- Invoice Card -->
                    <tr>
                        <td style="padding:0 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                                <tr>
                                    <td style="padding:25px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="border-bottom:1px solid #e2e8f0;padding-bottom:15px;">
                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td>
                                                                <span style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Invoice</span>
                                                                <p style="margin:5px 0 0;font-size:14px;color:#1e293b;font-weight:600;">{invoice_number}</p>
                                                            </td>
                                                            <td align="right">
                                                                <span style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Date</span>
                                                                <p style="margin:5px 0 0;font-size:14px;color:#1e293b;font-weight:500;">{invoice_date}</p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding-top:20px;">
                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;">Plan</td>
                                                                        <td align="right" style="color:#1e293b;font-size:13px;font-weight:600;">{plan_name}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;">Credits Added</td>
                                                                        <td align="right" style="color:#059669;font-size:13px;font-weight:600;">{credits} Credits</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;">Billing Period</td>
                                                                        <td align="right" style="color:#1e293b;font-size:13px;font-weight:500;">{billing_period}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;">Payment Method</td>
                                                                        <td align="right" style="color:#1e293b;font-size:13px;font-weight:500;">{payment_method}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;">Next Billing</td>
                                                                        <td align="right" style="color:#1e293b;font-size:13px;font-weight:500;">{next_billing_date}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:15px 0 8px;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#1e293b;font-size:15px;font-weight:600;">Total Paid</td>
                                                                        <td align="right" style="color:#059669;font-size:18px;font-weight:700;">{amount}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Subscription ID -->
                    <tr>
                        <td style="padding:20px 40px;">
                            <p style="font-size:12px;color:#64748b;margin:0;text-align:center;">
                                Subscription ID: <span style="font-family:monospace;color:#475569;">{subscription_id}</span>
                            </p>
                        </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                        <td style="padding:10px 40px 35px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="https://aivedha.ai/dashboard" style="display:inline-block;background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Go to Dashboard</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8fafc;padding:25px 40px;border-top:1px solid #e2e8f0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin:0 0 8px;font-size:12px;color:#64748b;">Questions? Contact <a href="mailto:support@aivedha.ai" style="color:#3b82f6;text-decoration:none;">support@aivedha.ai</a></p>
                                        <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; {datetime.utcnow().year} AiVedha Guard by Aivibe Software Services Pvt Ltd</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
'''

    text_body = f'''Payment Successful - AiVedha Guardian

Hello {user_name},

Your payment has been processed successfully.

INVOICE DETAILS
- Invoice Number: {invoice_number}
- Date: {invoice_date}
- Plan: {plan_name}
- Credits Added: {credits}
- Billing Period: {billing_period}
- Payment Method: {payment_method}
- Next Billing: {next_billing_date}
- Total Paid: {amount}

Subscription ID: {subscription_id}

Go to your dashboard: https://aivedha.ai/dashboard

Questions? Contact support@aivedha.ai

--
AiVedha Guard - AI-Powered Security Audits
https://aivedha.ai
'''

    response = ses.send_email(
        Source=SENDER_NOREPLY,
        Destination={'ToAddresses': [recipient_email]},
        Message={
            'Subject': {'Data': f'Payment Confirmed - {plan_name} Plan Activated', 'Charset': 'UTF-8'},
            'Body': {
                'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                'Html': {'Data': html_body, 'Charset': 'UTF-8'}
            }
        }
    )
    return response

def send_subscription_reminder(recipient_email, data):
    """Send subscription renewal reminder - Professional HTML design"""
    user_name = data.get('userName', 'Valued Subscriber')
    renewal_date = data.get('renewalDate', 'N/A')
    subscription_id = data.get('subscriptionId', 'N/A')
    plan_name = data.get('planName', 'Premium')
    amount = data.get('amount', '$10.00')
    credits_remaining = data.get('creditsRemaining', 0)
    days_until_renewal = data.get('daysUntilRenewal', 7)

    html_body = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Arial,sans-serif;background-color:#f0f4f8;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);padding:35px 30px;text-align:center;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <div style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-block;line-height:60px;">
                                            <span style="font-size:28px;color:#ffffff;">&#128276;</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top:15px;">
                                        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;">Subscription Renewal Reminder</h1>
                                        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Your subscription renews in {days_until_renewal} days</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding:35px 40px 20px;">
                            <p style="font-size:16px;color:#1e293b;margin:0;">Hello <strong style="color:#7c3aed;">{user_name}</strong>,</p>
                            <p style="font-size:15px;color:#475569;line-height:1.6;margin:15px 0 0;">
                                This is a friendly reminder that your AiVedha Guardian subscription will automatically renew soon. No action is required to continue enjoying uninterrupted security auditing.
                            </p>
                        </td>
                    </tr>

                    <!-- Subscription Details Card -->
                    <tr>
                        <td style="padding:0 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:12px;border-left:4px solid #7c3aed;">
                                <tr>
                                    <td style="padding:25px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding-bottom:15px;">
                                                    <span style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Subscription Details</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;">Current Plan</td>
                                                                        <td align="right" style="color:#7c3aed;font-size:13px;font-weight:600;">{plan_name}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;">Renewal Amount</td>
                                                                        <td align="right" style="color:#1e293b;font-size:13px;font-weight:600;">{amount}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;">Renewal Date</td>
                                                                        <td align="right" style="color:#1e293b;font-size:13px;font-weight:500;">{renewal_date}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:8px 0;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="color:#64748b;font-size:13px;">Credits Remaining</td>
                                                                        <td align="right" style="color:#059669;font-size:13px;font-weight:600;">{credits_remaining}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Info Notice -->
                    <tr>
                        <td style="padding:25px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ede9fe;border-radius:8px;border:1px solid #c4b5fd;">
                                <tr>
                                    <td style="padding:15px 20px;">
                                        <table cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="width:24px;vertical-align:top;padding-right:12px;">
                                                    <span style="color:#7c3aed;font-size:18px;">&#8505;</span>
                                                </td>
                                                <td style="color:#5b21b6;font-size:13px;line-height:1.5;">
                                                    <strong>Auto-Renewal:</strong> Your subscription will automatically renew. To manage your subscription or cancel, visit your account settings.
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                        <td style="padding:10px 40px 35px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="https://aivedha.ai/dashboard/subscription" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Manage Subscription</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Subscription ID -->
                    <tr>
                        <td style="padding:0 40px 25px;">
                            <p style="font-size:11px;color:#94a3b8;margin:0;text-align:center;">
                                Subscription ID: <span style="font-family:monospace;">{subscription_id}</span>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8fafc;padding:25px 40px;border-top:1px solid #e2e8f0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin:0 0 8px;font-size:12px;color:#64748b;">Questions about billing? Contact <a href="mailto:support@aivedha.ai" style="color:#7c3aed;text-decoration:none;">support@aivedha.ai</a></p>
                                        <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; {datetime.utcnow().year} AiVedha Guard by Aivibe Software Services Pvt Ltd</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
'''

    text_body = f'''Subscription Renewal Reminder - AiVedha Guardian

Hello {user_name},

This is a friendly reminder that your AiVedha Guardian subscription will automatically renew soon.

SUBSCRIPTION DETAILS
- Current Plan: {plan_name}
- Renewal Amount: {amount}
- Renewal Date: {renewal_date}
- Credits Remaining: {credits_remaining}

Your subscription will automatically renew. To manage your subscription or cancel, visit your account settings.

Manage your subscription: https://aivedha.ai/dashboard/subscription

Subscription ID: {subscription_id}

Questions about billing? Contact support@aivedha.ai

--
AiVedha Guard - AI-Powered Security Audits
https://aivedha.ai
'''

    response = ses.send_email(
        Source=SENDER_NOREPLY,
        Destination={'ToAddresses': [recipient_email]},
        Message={
            'Subject': {'Data': f'Subscription Renewal Reminder - Renews on {renewal_date}', 'Charset': 'UTF-8'},
            'Body': {
                'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                'Html': {'Data': html_body, 'Charset': 'UTF-8'}
            }
        }
    )
    return response


def send_audit_completion(recipient_email, data):
    """Send audit completion notification email"""
    user_name = data.get('userName', 'User')
    audit_url = data.get('auditUrl', 'N/A')
    security_score = data.get('securityScore', 0)
    critical_issues = data.get('criticalIssues', 0)
    medium_issues = data.get('mediumIssues', 0)
    low_issues = data.get('lowIssues', 0)
    report_id = data.get('reportId', 'N/A')
    certificate_number = data.get('certificateNumber', '')
    pdf_url = data.get('pdfUrl', '')
    dashboard_url = data.get('dashboardUrl', 'https://aivedha.ai/dashboard')
    certificate_url = data.get('certificateUrl', '')

    # Determine grade based on score
    if security_score >= 9:
        grade = 'A+'
        grade_color = '#10b981'
    elif security_score >= 8:
        grade = 'A'
        grade_color = '#22c55e'
    elif security_score >= 7:
        grade = 'B'
        grade_color = '#84cc16'
    elif security_score >= 6:
        grade = 'C'
        grade_color = '#eab308'
    elif security_score >= 5:
        grade = 'D'
        grade_color = '#f97316'
    else:
        grade = 'F'
        grade_color = '#ef4444'

    total_issues = critical_issues + medium_issues + low_issues

    html_body = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#3b82f6 100%);padding:35px 30px;text-align:center;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <div style="width:60px;height:60px;background:rgba(255,255,255,0.15);border-radius:50%;display:inline-block;line-height:60px;">
                                            <span style="font-size:28px;color:#ffffff;">&#10004;</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top:15px;">
                                        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;">Security Audit Complete</h1>
                                        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Your comprehensive security report is ready</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding:30px;">
                            <p style="font-size:16px;color:#333;">Hello <strong>{user_name}</strong>,</p>
                            <p style="font-size:16px;color:#333;">Your security audit for <strong>{audit_url}</strong> has been completed successfully.</p>

                            <!-- Score Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;">
                                <tr>
                                    <td align="center">
                                        <div style="font-size:48px;font-weight:bold;color:{grade_color};">{grade}</div>
                                        <div style="font-size:14px;color:#666;">Security Grade</div>
                                        <div style="font-size:24px;font-weight:bold;color:#333;margin-top:10px;">{security_score}/10</div>
                                    </td>
                                </tr>
                            </table>

                            <!-- Issues Summary -->
                            <table width="100%" cellpadding="10" cellspacing="0" style="margin:20px 0;">
                                <tr>
                                    <td style="background-color:#fee2e2;border-radius:4px;text-align:center;">
                                        <div style="font-size:24px;font-weight:bold;color:#dc2626;">{critical_issues}</div>
                                        <div style="font-size:12px;color:#dc2626;">Critical</div>
                                    </td>
                                    <td style="background-color:#fef3c7;border-radius:4px;text-align:center;">
                                        <div style="font-size:24px;font-weight:bold;color:#d97706;">{medium_issues}</div>
                                        <div style="font-size:12px;color:#d97706;">Medium</div>
                                    </td>
                                    <td style="background-color:#dbeafe;border-radius:4px;text-align:center;">
                                        <div style="font-size:24px;font-weight:bold;color:#2563eb;">{low_issues}</div>
                                        <div style="font-size:12px;color:#2563eb;">Low</div>
                                    </td>
                                </tr>
                            </table>

                            <p style="font-size:14px;color:#666;">Report ID: <strong>{report_id}</strong></p>
                            {f'<p style="font-size:14px;color:#666;">Certificate: <strong>{certificate_number}</strong></p>' if certificate_number else ''}

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{dashboard_url}" style="display:inline-block;background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;">View Full Report</a>
                                    </td>
                                </tr>
                            </table>

                            {f'<p style="font-size:14px;color:#666;text-align:center;"><a href="{pdf_url}" style="color:#3b82f6;">Download PDF Report</a></p>' if pdf_url else ''}
                            {f'<p style="font-size:14px;color:#666;text-align:center;"><a href="{certificate_url}" style="color:#3b82f6;">View Certificate</a></p>' if certificate_url else ''}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8f9fa;padding:20px;text-align:center;">
                            <p style="margin:0;font-size:12px;color:#666;">© {datetime.utcnow().year} AiVedha Guard by Aivibe Software Services Pvt Ltd</p>
                            <p style="margin:5px 0 0;font-size:12px;color:#999;">ISO 27001:2022 Certified | Global AI Security Platform</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
'''

    text_body = f'''Security Audit Complete

Hello {user_name},

Your security audit for {audit_url} has been completed.

Security Grade: {grade} ({security_score}/10)

Issues Found:
- Critical: {critical_issues}
- Medium: {medium_issues}
- Low: {low_issues}

Report ID: {report_id}
{f"Certificate: {certificate_number}" if certificate_number else ""}

View your full report at: {dashboard_url}

--
AiVedha Guard - AI-Powered Security Audits
https://aivedha.ai
'''

    response = ses.send_email(
        Source=SENDER_NOREPLY,
        Destination={'ToAddresses': [recipient_email]},
        Message={
            'Subject': {'Data': f'Security Audit Complete - Grade {grade} for {audit_url}', 'Charset': 'UTF-8'},
            'Body': {
                'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                'Html': {'Data': html_body, 'Charset': 'UTF-8'}
            }
        }
    )
    return response


def log_email_sent(email_type, recipient, response):
    """Log email to DynamoDB for tracking"""
    try:
        table = dynamodb.Table('aivedha-guardian-email-logs')
        table.put_item(Item={
            'email_id': str(uuid.uuid4()),
            'email_type': email_type,
            'recipient': recipient,
            'message_id': response.get('MessageId', 'N/A'),
            'sent_at': datetime.utcnow().isoformat(),
            'status': 'sent'
        })
    except Exception as e:
        print(f"Failed to log email: {str(e)}")

def cors_headers():
    """Return CORS headers"""
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }
