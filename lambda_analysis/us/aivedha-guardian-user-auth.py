import json
import boto3
import hashlib
import jwt
import uuid
import os
import base64
from datetime import datetime, timedelta
from botocore.exceptions import ClientError
from decimal import Decimal

# Configuration
USERS_TABLE = 'aivedha-guardian-users'
SESSIONS_TABLE = 'aivedha-user-sessions'
SETTINGS_TABLE = 'admin-system-settings'
FREE_CREDITS = 3  # Free credits for new users

# SES Client for email notifications
_ses_client = None

def get_ses_client():
    """Get SES client singleton."""
    global _ses_client
    if _ses_client is None:
        _ses_client = boto3.client('ses', region_name='us-east-1')
    return _ses_client


def send_email_via_ses(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Send email via Amazon SES."""
    try:
        ses = get_ses_client()
        response = ses.send_email(
            Source='AiVedha Guard <noreply@aivedha.ai>',
            Destination={'ToAddresses': [to_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'}
                }
            }
        )
        print(f"Email sent to {to_email}: {response.get('MessageId')}")
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {str(e)}")
        return False


# Multi-language email templates for login alerts
LOGIN_EMAIL_TEMPLATES = {
    'en': {  # English (Default, India, US, UK, etc.)
        'subject': '🔐 Security Alert: New login to your AiVedha Guard account',
        'header': 'Security Alert',
        'subheader': 'New login detected on your account',
        'greeting': 'Hello',
        'message': 'We detected a new login to your AiVedha Guard account. For your security, please review the details below.',
        'time_label': 'Time',
        'ip_label': 'IP Address',
        'device_label': 'Device',
        'location_label': 'Location',
        'was_you': 'Was this you?',
        'was_you_yes': 'If yes, you can safely ignore this email. Your account is secure.',
        'not_you': 'Not you?',
        'not_you_action': 'If you did not perform this login, please secure your account immediately by changing your password and contact our support team.',
        'support_text': 'Need help? Contact us at',
        'footer': 'AiVedha Guard - Enterprise Security Platform',
        'copyright': '© 2025 Aivibe Software Services Pvt Ltd. All rights reserved.'
    },
    'es': {  # Spanish
        'subject': '🔐 Alerta de Seguridad: Nuevo inicio de sesión en su cuenta AiVedha Guard',
        'header': 'Alerta de Seguridad',
        'subheader': 'Nuevo inicio de sesión detectado en su cuenta',
        'greeting': 'Hola',
        'message': 'Hemos detectado un nuevo inicio de sesión en su cuenta de AiVedha Guard. Por su seguridad, revise los detalles a continuación.',
        'time_label': 'Hora',
        'ip_label': 'Dirección IP',
        'device_label': 'Dispositivo',
        'location_label': 'Ubicación',
        'was_you': '¿Fue usted?',
        'was_you_yes': 'Si fue usted, puede ignorar este correo. Su cuenta está segura.',
        'not_you': '¿No fue usted?',
        'not_you_action': 'Si no realizó este inicio de sesión, proteja su cuenta inmediatamente cambiando su contraseña y contacte a nuestro equipo de soporte.',
        'support_text': '¿Necesita ayuda? Contáctenos en',
        'footer': 'AiVedha Guard - Plataforma de Seguridad Empresarial',
        'copyright': '© 2025 Aivibe Software Services Pvt Ltd. Todos los derechos reservados.'
    },
    'fr': {  # French
        'subject': '🔐 Alerte de Sécurité: Nouvelle connexion à votre compte AiVedha Guard',
        'header': 'Alerte de Sécurité',
        'subheader': 'Nouvelle connexion détectée sur votre compte',
        'greeting': 'Bonjour',
        'message': 'Nous avons détecté une nouvelle connexion à votre compte AiVedha Guard. Pour votre sécurité, veuillez vérifier les détails ci-dessous.',
        'time_label': 'Heure',
        'ip_label': 'Adresse IP',
        'device_label': 'Appareil',
        'location_label': 'Localisation',
        'was_you': 'C\'était vous?',
        'was_you_yes': 'Si oui, vous pouvez ignorer cet email. Votre compte est sécurisé.',
        'not_you': 'Ce n\'était pas vous?',
        'not_you_action': 'Si vous n\'avez pas effectué cette connexion, sécurisez votre compte immédiatement en changeant votre mot de passe et contactez notre équipe de support.',
        'support_text': 'Besoin d\'aide? Contactez-nous à',
        'footer': 'AiVedha Guard - Plateforme de Sécurité d\'Entreprise',
        'copyright': '© 2025 Aivibe Software Services Pvt Ltd. Tous droits réservés.'
    },
    'de': {  # German
        'subject': '🔐 Sicherheitswarnung: Neue Anmeldung bei Ihrem AiVedha Guard Konto',
        'header': 'Sicherheitswarnung',
        'subheader': 'Neue Anmeldung bei Ihrem Konto erkannt',
        'greeting': 'Hallo',
        'message': 'Wir haben eine neue Anmeldung bei Ihrem AiVedha Guard Konto festgestellt. Zu Ihrer Sicherheit überprüfen Sie bitte die folgenden Details.',
        'time_label': 'Zeit',
        'ip_label': 'IP-Adresse',
        'device_label': 'Gerät',
        'location_label': 'Standort',
        'was_you': 'Waren Sie das?',
        'was_you_yes': 'Wenn ja, können Sie diese E-Mail ignorieren. Ihr Konto ist sicher.',
        'not_you': 'Waren Sie das nicht?',
        'not_you_action': 'Wenn Sie diese Anmeldung nicht durchgeführt haben, sichern Sie Ihr Konto sofort, indem Sie Ihr Passwort ändern und kontaktieren Sie unser Support-Team.',
        'support_text': 'Brauchen Sie Hilfe? Kontaktieren Sie uns unter',
        'footer': 'AiVedha Guard - Enterprise-Sicherheitsplattform',
        'copyright': '© 2025 Aivibe Software Services Pvt Ltd. Alle Rechte vorbehalten.'
    },
    'pt': {  # Portuguese
        'subject': '🔐 Alerta de Segurança: Novo login em sua conta AiVedha Guard',
        'header': 'Alerta de Segurança',
        'subheader': 'Novo login detectado em sua conta',
        'greeting': 'Olá',
        'message': 'Detectamos um novo login em sua conta AiVedha Guard. Para sua segurança, revise os detalhes abaixo.',
        'time_label': 'Hora',
        'ip_label': 'Endereço IP',
        'device_label': 'Dispositivo',
        'location_label': 'Localização',
        'was_you': 'Foi você?',
        'was_you_yes': 'Se sim, pode ignorar este email. Sua conta está segura.',
        'not_you': 'Não foi você?',
        'not_you_action': 'Se você não realizou este login, proteja sua conta imediatamente alterando sua senha e entre em contato com nossa equipe de suporte.',
        'support_text': 'Precisa de ajuda? Entre em contato conosco em',
        'footer': 'AiVedha Guard - Plataforma de Segurança Empresarial',
        'copyright': '© 2025 Aivibe Software Services Pvt Ltd. Todos os direitos reservados.'
    },
    'ja': {  # Japanese
        'subject': '🔐 セキュリティ警告：AiVedha Guardアカウントへの新しいログイン',
        'header': 'セキュリティ警告',
        'subheader': 'アカウントへの新しいログインが検出されました',
        'greeting': 'こんにちは',
        'message': 'AiVedha Guardアカウントへの新しいログインを検出しました。セキュリティのため、以下の詳細をご確認ください。',
        'time_label': '時間',
        'ip_label': 'IPアドレス',
        'device_label': 'デバイス',
        'location_label': '場所',
        'was_you': 'これはあなたですか？',
        'was_you_yes': 'はいの場合、このメールは無視できます。アカウントは安全です。',
        'not_you': 'あなたではない場合',
        'not_you_action': 'このログインを行っていない場合は、すぐにパスワードを変更してアカウントを保護し、サポートチームにご連絡ください。',
        'support_text': 'ヘルプが必要ですか？お問い合わせ先',
        'footer': 'AiVedha Guard - エンタープライズセキュリティプラットフォーム',
        'copyright': '© 2025 Aivibe Software Services Pvt Ltd. All rights reserved.'
    },
    'zh': {  # Chinese (Simplified)
        'subject': '🔐 安全警报：您的AiVedha Guard账户有新登录',
        'header': '安全警报',
        'subheader': '检测到您的账户有新登录',
        'greeting': '您好',
        'message': '我们检测到您的AiVedha Guard账户有新的登录活动。为了您的安全，请查看以下详细信息。',
        'time_label': '时间',
        'ip_label': 'IP地址',
        'device_label': '设备',
        'location_label': '位置',
        'was_you': '是您本人吗？',
        'was_you_yes': '如果是，您可以忽略此邮件。您的账户是安全的。',
        'not_you': '不是您本人？',
        'not_you_action': '如果您未进行此登录，请立即更改密码以保护您的账户，并联系我们的支持团队。',
        'support_text': '需要帮助？请联系我们',
        'footer': 'AiVedha Guard - 企业安全平台',
        'copyright': '© 2025 Aivibe Software Services Pvt Ltd. 保留所有权利。'
    },
    'ar': {  # Arabic
        'subject': '🔐 تنبيه أمني: تسجيل دخول جديد إلى حسابك في AiVedha Guard',
        'header': 'تنبيه أمني',
        'subheader': 'تم اكتشاف تسجيل دخول جديد في حسابك',
        'greeting': 'مرحباً',
        'message': 'اكتشفنا تسجيل دخول جديد إلى حسابك في AiVedha Guard. لأمانك، يرجى مراجعة التفاصيل أدناه.',
        'time_label': 'الوقت',
        'ip_label': 'عنوان IP',
        'device_label': 'الجهاز',
        'location_label': 'الموقع',
        'was_you': 'هل كان هذا أنت؟',
        'was_you_yes': 'إذا كان الأمر كذلك، يمكنك تجاهل هذا البريد الإلكتروني. حسابك آمن.',
        'not_you': 'لم يكن أنت؟',
        'not_you_action': 'إذا لم تقم بتسجيل الدخول هذا، يرجى تأمين حسابك فوراً بتغيير كلمة المرور والاتصال بفريق الدعم.',
        'support_text': 'تحتاج مساعدة؟ تواصل معنا على',
        'footer': 'AiVedha Guard - منصة أمان المؤسسات',
        'copyright': '© 2025 Aivibe Software Services Pvt Ltd. جميع الحقوق محفوظة.'
    }
}

# Country to language mapping
COUNTRY_LANGUAGE_MAP = {
    # India - Always English
    'IN': 'en', 'IND': 'en',
    # English speaking countries
    'US': 'en', 'USA': 'en', 'GB': 'en', 'UK': 'en', 'AU': 'en', 'CA': 'en', 'NZ': 'en', 'IE': 'en', 'SG': 'en',
    # Spanish speaking countries
    'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'PE': 'es', 'CL': 'es', 'VE': 'es', 'EC': 'es',
    # French speaking countries
    'FR': 'fr', 'BE': 'fr', 'CH': 'fr', 'LU': 'fr', 'MC': 'fr',
    # German speaking countries
    'DE': 'de', 'AT': 'de',
    # Portuguese speaking countries
    'BR': 'pt', 'PT': 'pt',
    # Japanese
    'JP': 'ja',
    # Chinese speaking regions
    'CN': 'zh', 'TW': 'zh', 'HK': 'zh',
    # Arabic speaking countries
    'SA': 'ar', 'AE': 'ar', 'EG': 'ar', 'QA': 'ar', 'KW': 'ar', 'OM': 'ar', 'BH': 'ar', 'JO': 'ar', 'LB': 'ar'
}


def get_language_from_location(country_code: str = None, user_location: str = None) -> str:
    """Get language code based on country. India always returns English."""
    if country_code:
        country_upper = country_code.upper().strip()
        return COUNTRY_LANGUAGE_MAP.get(country_upper, 'en')
    if user_location:
        # Try to extract country from location string
        location_upper = user_location.upper()
        for country, lang in COUNTRY_LANGUAGE_MAP.items():
            if country in location_upper:
                return lang
    return 'en'  # Default to English


def generate_login_alert_html(template: dict, user_name: str, login_time: str, login_ip: str, login_device: str, login_location: str = "Unknown") -> str:
    """Generate professional HTML email for login alert."""
    name = user_name or 'Valued User'
    is_rtl = template.get('subject', '').startswith('🔐 تنبيه')  # Arabic is RTL

    direction = 'rtl' if is_rtl else 'ltr'
    text_align = 'right' if is_rtl else 'left'

    return f'''<!DOCTYPE html>
<html lang="{template.get('lang', 'en')}" dir="{direction}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{template['subject']}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8; direction: {direction};">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0f4f8;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);">

                    <!-- Header with gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0ea5e9 100%); padding: 40px 30px; text-align: center;">
                            <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 40px;">🛡️</span>
                            </div>
                            <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">{template['header']}</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">{template['subheader']}</p>
                        </td>
                    </tr>

                    <!-- Main content -->
                    <tr>
                        <td style="padding: 40px 30px; text-align: {text_align};">
                            <h2 style="color: #1e3a8a; margin: 0 0 16px 0; font-size: 22px;">{template['greeting']}, {name}!</h2>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">{template['message']}</p>

                            <!-- Login details card -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; border-{text_align}: 4px solid #0ea5e9; margin: 24px 0;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">{template['time_label']}</span><br>
                                                    <span style="color: #1e3a8a; font-size: 16px; font-weight: 600;">{login_time}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-top: 1px solid rgba(14, 165, 233, 0.2);">
                                                    <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">{template['ip_label']}</span><br>
                                                    <span style="color: #1e3a8a; font-size: 16px; font-weight: 600;">{login_ip}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-top: 1px solid rgba(14, 165, 233, 0.2);">
                                                    <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">{template['device_label']}</span><br>
                                                    <span style="color: #1e3a8a; font-size: 16px; font-weight: 600;">{login_device}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-top: 1px solid rgba(14, 165, 233, 0.2);">
                                                    <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">{template['location_label']}</span><br>
                                                    <span style="color: #1e3a8a; font-size: 16px; font-weight: 600;">{login_location}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Was this you? section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                                <tr>
                                    <td style="background: #f0fdf4; border-radius: 12px; padding: 20px; border-{text_align}: 4px solid #22c55e;">
                                        <p style="margin: 0 0 8px 0; color: #166534; font-weight: 700; font-size: 16px;">✅ {template['was_you']}</p>
                                        <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">{template['was_you_yes']}</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Not you? section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                                <tr>
                                    <td style="background: #fef3c7; border-radius: 12px; padding: 20px; border-{text_align}: 4px solid #f59e0b;">
                                        <p style="margin: 0 0 8px 0; color: #92400e; font-weight: 700; font-size: 16px;">⚠️ {template['not_you']}</p>
                                        <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">{template['not_you_action']}</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Support link -->
                            <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0; text-align: center;">
                                {template['support_text']} <a href="mailto:support@aivedha.ai" style="color: #3b82f6; text-decoration: none; font-weight: 600;">support@aivedha.ai</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; text-align: center;">
                            <p style="color: #94a3b8; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">{template['footer']}</p>
                            <p style="color: #64748b; margin: 0 0 16px 0; font-size: 12px;">{template['copyright']}</p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="padding: 0 8px;">
                                        <a href="https://aivedha.ai" style="color: #60a5fa; text-decoration: none; font-size: 12px;">Website</a>
                                    </td>
                                    <td style="color: #475569;">|</td>
                                    <td style="padding: 0 8px;">
                                        <a href="https://aivedha.ai/privacy" style="color: #60a5fa; text-decoration: none; font-size: 12px;">Privacy</a>
                                    </td>
                                    <td style="color: #475569;">|</td>
                                    <td style="padding: 0 8px;">
                                        <a href="https://aivedha.ai/terms" style="color: #60a5fa; text-decoration: none; font-size: 12px;">Terms</a>
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
</html>'''


def send_login_alert_email(user_email: str, user_name: str, login_time: str, login_ip: str = "Unknown", login_device: str = "Unknown", country_code: str = None, login_location: str = "Unknown"):
    """Send professional multi-language login security alert email."""
    try:
        # Determine language based on country (India = English always)
        lang = get_language_from_location(country_code, login_location)
        template = LOGIN_EMAIL_TEMPLATES.get(lang, LOGIN_EMAIL_TEMPLATES['en'])

        subject = template['subject']
        html_body = generate_login_alert_html(template, user_name, login_time, login_ip, login_device, login_location)

        # Plain text fallback
        text_body = f'''{template['header']}

{template['greeting']}, {user_name or 'Valued User'}!

{template['message']}

{template['time_label']}: {login_time}
{template['ip_label']}: {login_ip}
{template['device_label']}: {login_device}
{template['location_label']}: {login_location}

✅ {template['was_you']}
{template['was_you_yes']}

⚠️ {template['not_you']}
{template['not_you_action']}

{template['support_text']} support@aivedha.ai

--
{template['footer']}
https://aivedha.ai
{template['copyright']}
'''

        result = send_email_via_ses(user_email, subject, html_body, text_body)
        print(f"Login alert sent to {user_email} in language: {lang}")
        return result
    except Exception as e:
        print(f"Failed to send login alert: {str(e)}")
        return False


def send_welcome_email(user_email: str, user_name: str, credits: int = 3):
    """Send welcome email to new users."""
    try:
        subject = f"🎁 Welcome to AiVedha Guard - {credits} Free Security Audits Await!"

        html_body = f'''
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #1e40af, #0ea5e9); padding: 24px; text-align: center; color: white;">
                    <h1>🛡️ Welcome to AiVedha Guard!</h1>
                    <p>Your journey to better security starts now</p>
                </div>
                <div style="padding: 24px;">
                    <h2>Hello {user_name or 'there'}! 👋</h2>
                    <p>Thank you for joining AiVedha Guard. We're thrilled to have you!</p>

                    <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; border: 1px solid #86efac;">
                        <div style="font-size: 48px;">🎁</div>
                        <h3 style="color: #166534;">Your Welcome Gift!</h3>
                        <p style="color: #15803d; font-style: italic;">
                            "In the realm of digital trust,<br>
                            Security is an absolute must.<br>
                            Three audits free, no strings attached,<br>
                            Your cyber safety perfectly matched."
                        </p>
                        <div style="background: white; border-radius: 8px; padding: 16px; display: inline-block;">
                            <span style="font-size: 36px; font-weight: 700; color: #10b981;">{credits}</span>
                            <span style="display: block; color: #6b7280;">Free Audit Credits</span>
                        </div>
                    </div>

                    <div style="background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 16px; text-align: center;">
                        <strong style="color: #1e40af;">✨ No Credit Card • No Hidden Fees • No Commitments ✨</strong>
                    </div>

                    <div style="text-align: center; margin: 24px 0;">
                        <a href="https://aivedha.ai/audit" style="background: linear-gradient(135deg, #1e40af, #0ea5e9); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">🔍 Start Your First Audit</a>
                    </div>
                </div>
                <div style="background: #1f2937; padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                    <p>AiVedha Guard - Enterprise Security Platform</p>
                    <p>© 2025 Aivibe Software Services Pvt Ltd</p>
                </div>
            </div>
        </body>
        </html>
        '''

        text_body = f'''
Welcome to AiVedha Guard! 🛡️

Hello {user_name or 'there'},

Thank you for joining AiVedha Guard!

🎁 YOUR WELCOME GIFT:
You've received {credits} FREE AUDIT CREDITS!

"In the realm of digital trust,
Security is an absolute must.
Three audits free, no strings attached,
Your cyber safety perfectly matched."

✨ No Credit Card • No Hidden Fees • No Commitments ✨

Start your first FREE audit: https://aivedha.ai/audit

--
AiVedha Guard
Enterprise Security Platform
https://aivedha.ai
        '''

        return send_email_via_ses(user_email, subject, html_body, text_body)
    except Exception as e:
        print(f"Failed to send welcome email: {str(e)}")
        return False


def get_jwt_secret():
    """Get JWT secret from DynamoDB config or environment variable."""
    # First try DynamoDB
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(SETTINGS_TABLE)
        response = table.get_item(
            Key={'setting_category': 'jwt', 'setting_key': 'user_jwt_secret'}
        )
        if 'Item' in response:
            value = response['Item'].get('value', '')
            # Decrypt if encrypted
            if value and value.startswith('ENC:'):
                try:
                    encoded = value.replace('ENC:', '')
                    return base64.b64decode(encoded).decode()
                except:
                    pass
            elif value:
                return value
    except Exception as e:
        print(f"Config lookup error: {e}")

    # Fall back to environment variable
    return os.environ.get('JWT_SECRET', os.environ.get('USER_JWT_SECRET'))

# Fix #7: Allowed CORS origins (restricted from wildcard)
ALLOWED_ORIGINS = [
    'https://aivedha.ai',
    'https://www.aivedha.ai',
    'https://admin.aivedha.ai',
    'http://localhost:8080',
    'http://localhost:5173'
]


def get_cors_origin(event):
    """Get CORS origin if it's in the allowed list (Fix #7)"""
    origin = None
    headers = event.get('headers', {}) or {}

    for key, value in headers.items():
        if key.lower() == 'origin':
            origin = value
            break

    if origin in ALLOWED_ORIGINS:
        return origin

    return 'https://aivedha.ai'


def lambda_handler(event, context):
    """
    AWS Lambda function for user authentication
    Handles user registration, login, and session management
    """

    # Get JWT secret (from DynamoDB or environment)
    JWT_SECRET = get_jwt_secret()

    # Validate JWT secret is configured
    if not JWT_SECRET:
        print("CRITICAL: JWT_SECRET not configured in DynamoDB or environment")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Server configuration error'})
        }

    # Fix #7: CORS headers with restricted origins
    cors_origin = get_cors_origin(event)
    cors_headers = {
        'Access-Control-Allow-Origin': cors_origin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    }

    # Initialize AWS services
    dynamodb = boto3.resource('dynamodb')

    # Handle API Gateway request format
    if 'httpMethod' in event or 'requestContext' in event:
        return handle_api_gateway_request(event, dynamodb, cors_headers)

    # Direct Lambda invocation (legacy)
    action = event.get('action')
    result = handle_action(action, event, dynamodb)
    return result


def handle_api_gateway_request(event, dynamodb, cors_headers):
    """Handle requests from API Gateway"""
    http_method = event.get('httpMethod', 'POST')
    path = event.get('path', '')

    # Handle CORS preflight
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': ''
        }

    # Parse request body
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event.get('body', '{}'))
        except:
            body = {}

    # Determine action from path
    action = None
    if '/auth/login' in path:
        action = 'login'
    elif '/auth/register' in path:
        action = 'register'
    elif '/auth/google' in path:
        action = 'google_auth'
    elif '/auth/verify' in path:
        action = 'verify_token'
    elif '/auth/logout' in path:
        action = 'logout'
    elif '/auth/reset-password' in path:
        action = 'reset_password'
    else:
        # Try to get action from body
        action = body.get('action')

    if not action:
        return {
            'statusCode': 400,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Invalid endpoint or action'})
        }

    # Handle the action
    result = handle_action(action, body, dynamodb)

    # Add CORS headers to result
    if 'headers' not in result:
        result['headers'] = {}
    result['headers'].update(cors_headers)

    return result


def handle_action(action, event, dynamodb):
    """Route to appropriate handler based on action"""
    if action == 'register':
        return register_user(event, dynamodb)
    elif action == 'login':
        return login_user(event, dynamodb)
    elif action == 'google_auth':
        return google_auth(event, dynamodb)
    elif action == 'verify_token':
        return verify_token(event, dynamodb)
    elif action == 'logout':
        return logout_user(event, dynamodb)
    elif action == 'reset_password':
        return reset_password(event, dynamodb)
    elif action == 'startup_register':
        return startup_register(event, dynamodb)
    elif action == 'update_profile':
        return update_user_profile(event, dynamodb)
    else:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid action'})
        }


def update_user_profile(event, dynamodb):
    """Update user profile including phone, address, employment, organization"""
    try:
        user_id = event.get('userId') or event.get('user_id')
        if not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'success': False, 'error': 'User ID is required'})
            }

        users_table = dynamodb.Table(USERS_TABLE)

        # Build update expression
        update_parts = []
        expression_values = {}
        expression_names = {}

        # Handle simple fields
        simple_fields = ['fullName', 'phone', 'category', 'orgName', 'gstin', 'pan']
        for field in simple_fields:
            if field in event and event[field] is not None:
                update_parts.append(f"#{field} = :{field}")
                expression_values[f":{field}"] = event[field]
                expression_names[f"#{field}"] = field

        # Handle nested objects (address, employment, organization)
        nested_fields = ['address', 'employment', 'organization']
        for field in nested_fields:
            if field in event and event[field]:
                update_parts.append(f"#{field} = :{field}")
                expression_values[f":{field}"] = event[field]
                expression_names[f"#{field}"] = field

        # Add updated_at timestamp
        update_parts.append("#updatedAt = :updatedAt")
        expression_values[":updatedAt"] = datetime.utcnow().isoformat()
        expression_names["#updatedAt"] = "updated_at"

        if not update_parts:
            return {
                'statusCode': 400,
                'body': json.dumps({'success': False, 'error': 'No fields to update'})
            }

        # Perform update
        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression="SET " + ", ".join(update_parts),
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames=expression_names
        )

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'message': 'Profile updated successfully'
            })
        }

    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'success': False, 'error': str(e)})
        }


def register_user(event, dynamodb):
    """Register a new user"""
    try:
        email = event.get('email')
        password = event.get('password')
        full_name = event.get('fullName') or event.get('full_name', '')

        if not all([email, password]):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Email and password are required'})
            }

        if '@' not in email or '.' not in email:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid email format'})
            }

        users_table = dynamodb.Table(USERS_TABLE)

        # Check if ACTIVE user exists by email using GSI query
        # Deleted/inactive users are ignored - allows re-registration with same email
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        if response.get('Items'):
            existing_user = response['Items'][0]
            user_status = existing_user.get('status', 'active')
            account_status = existing_user.get('account_status', 'active')

            # Only block if user is active (not deleted/inactive)
            if user_status == 'active' and account_status not in ['deleted', 'inactive']:
                return {
                    'statusCode': 409,
                    'body': json.dumps({'error': 'User already exists'})
                }
            # If user was deleted/inactive, allow re-registration as new user
            print(f"Allowing re-registration for previously deleted email: {email}")

        # Generate user ID and hash password
        user_id = f"email-{str(uuid.uuid4())[:8]}"
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        # Create user record with FREE_CREDITS (3 free credits for new users)
        # SECURITY: Set aarambh_credits_claimed flag to prevent credit farming
        user_data = {
            'user_id': user_id,
            'email': email,
            'password_hash': password_hash,
            'fullName': full_name,
            'credits': FREE_CREDITS,  # 3 free credits for new users
            'plan': 'Free',
            'subscription_plan': 'aarambh_free',
            'aarambh_credits_claimed': True,  # SECURITY: Mark free credits as claimed
            'aarambh_claimed_at': datetime.utcnow().isoformat(),
            'status': 'active',
            'created_at': datetime.utcnow().isoformat(),
            'last_login': datetime.utcnow().isoformat(),
            'total_audits': 0,
            'login_method': 'email',
            'welcome_email_sent': True  # Mark that welcome email will be sent
        }

        users_table.put_item(Item=user_data)

        # Generate JWT token
        token = generate_token(user_id, email)

        # Send welcome email to new user (async - don't block response)
        try:
            send_welcome_email(email, full_name, FREE_CREDITS)
        except Exception as email_error:
            print(f"Failed to send welcome email (non-blocking): {email_error}")

        return {
            'statusCode': 201,
            'body': json.dumps({
                'success': True,
                'message': 'User registered successfully',
                'user': {
                    'user_id': user_id,
                    'email': email,
                    'fullName': full_name,
                    'credits': FREE_CREDITS,  # 3 free credits for new users
                    'plan': 'Free'
                },
                'token': token,
                'isNewUser': True
            })
        }

    except Exception as e:
        # Fix #17: Log error internally but don't expose to client
        print(f"Registration error: {type(e).__name__}: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Registration failed. Please try again.'})
        }


def login_user(event, dynamodb):
    """Login user with email and password"""
    try:
        email = event.get('email')
        password = event.get('password')

        if not all([email, password]):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Email and password are required'})
            }

        users_table = dynamodb.Table(USERS_TABLE)

        # Fix #6: Find user by email using GSI query instead of scan
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        if not response.get('Items'):
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Invalid email or password'})
            }

        user = response['Items'][0]

        # Verify password
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        if user.get('password_hash') != password_hash:
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Invalid email or password'})
            }

        # Check if user is active (not deleted or inactive)
        user_status = user.get('status', 'active')
        account_status = user.get('account_status', 'active')

        if user_status == 'inactive' or account_status in ['deleted', 'inactive']:
            return {
                'statusCode': 403,
                'body': json.dumps({
                    'error': 'Account has been deleted',
                    'message': 'This account no longer exists. Please create a new account to continue.'
                })
            }

        if user_status != 'active':
            return {
                'statusCode': 403,
                'body': json.dumps({'error': 'Account is deactivated'})
            }

        # Get login context
        login_time = datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')
        login_ip = event.get('sourceIp', event.get('ip', 'Unknown'))
        login_device = event.get('userAgent', event.get('device', 'Web Browser'))

        # Update last login
        users_table.update_item(
            Key={'user_id': user['user_id']},
            UpdateExpression='SET last_login = :last_login, login_count = if_not_exists(login_count, :zero) + :one',
            ExpressionAttributeValues={
                ':last_login': datetime.utcnow().isoformat(),
                ':zero': 0,
                ':one': 1
            }
        )

        # Generate JWT token
        token = generate_token(user['user_id'], email)

        # Convert Decimal to int
        credits = user.get('credits', 0)
        if isinstance(credits, Decimal):
            credits = int(credits)

        # Send login alert email on every login (async - don't block response)
        try:
            send_login_alert_email(
                user_email=email,
                user_name=user.get('fullName', ''),
                login_time=login_time,
                login_ip=login_ip,
                login_device=login_device
            )
        except Exception as email_error:
            print(f"Failed to send login alert (non-blocking): {email_error}")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'message': 'Login successful',
                'user': {
                    'user_id': user['user_id'],
                    'email': user['email'],
                    'fullName': user.get('fullName', ''),
                    'credits': credits,
                    'plan': user.get('plan', 'Free'),
                    'picture': user.get('picture', user.get('avatar', ''))
                },
                'token': token
            })
        }

    except Exception as e:
        # Fix #17: Log error internally but don't expose to client
        print(f"Login error: {type(e).__name__}: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Login failed. Please try again.'})
        }


def google_auth(event, dynamodb):
    """Handle Google OAuth authentication"""
    try:
        email = event.get('email')
        full_name = event.get('fullName')
        google_id = event.get('googleId')
        picture = event.get('picture')
        identity_id = event.get('identityId')
        is_new_user = event.get('isNewUser', False)

        if not email:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Email is required'})
            }

        users_table = dynamodb.Table(USERS_TABLE)

        # Get login context
        login_time = datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')
        login_ip = event.get('sourceIp', event.get('ip', 'Unknown'))
        login_device = event.get('userAgent', event.get('device', 'Google Sign-In'))

        # Fix #6: Find existing user by email using GSI query instead of scan
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        # Check for existing user, but treat deleted/inactive as no user
        existing_user = None
        if response.get('Items'):
            for item in response['Items']:
                user_status = item.get('status', 'active')
                account_status = item.get('account_status', 'active')
                # Only consider active users
                if user_status == 'active' and account_status not in ['deleted', 'inactive']:
                    existing_user = item
                    break

        if existing_user:
            # Existing active user - check for social provider conflicts
            user = existing_user
            user_id = user.get('user_id')
            existing_login_method = user.get('login_method', 'email')
            existing_google_id = user.get('googleId')
            existing_github_id = user.get('githubId')

            # Check if different Google account trying to use same email
            if existing_google_id and existing_google_id != google_id:
                return {
                    'statusCode': 409,
                    'body': json.dumps({
                        'error': 'Email already registered',
                        'message': 'This email is already registered with a different Google account. Please use the original Google account.',
                        'existing_method': existing_login_method,
                        'suggested_action': 'use_existing_account'
                    })
                }

            # If email exists with GitHub only, link Google account (allowed)
            if existing_github_id and not existing_google_id:
                print(f"Linking Google to existing GitHub account: {email}")

            users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression='SET googleId = :gid, picture = :pic, fullName = :name, last_login = :login, identityId = :iid, login_method = :method, login_count = if_not_exists(login_count, :zero) + :one',
                ExpressionAttributeValues={
                    ':gid': google_id,
                    ':pic': picture,
                    ':name': full_name,
                    ':login': datetime.utcnow().isoformat(),
                    ':iid': identity_id,
                    ':method': 'google',
                    ':zero': 0,
                    ':one': 1
                }
            )

            credits = user.get('credits', 0)
            if isinstance(credits, Decimal):
                credits = int(credits)

            # Send login alert email for existing users (async - don't block)
            try:
                send_login_alert_email(
                    user_email=email,
                    user_name=full_name or user.get('fullName', ''),
                    login_time=login_time,
                    login_ip=login_ip,
                    login_device=login_device
                )
            except Exception as email_error:
                print(f"Failed to send login alert (non-blocking): {email_error}")

            return {
                'statusCode': 200,
                'body': json.dumps({
                    'success': True,
                    'isNewUser': False,
                    'credits': credits,
                    'plan': user.get('plan', 'Aarambh')
                })
            }
        else:
            # New user - create account with 3 free credits
            # SECURITY: Set aarambh_credits_claimed flag to prevent credit farming
            user_id = f"google-{email.split('@')[0]}"
            now = datetime.utcnow().isoformat()

            users_table.put_item(Item={
                'user_id': user_id,
                'email': email,
                'fullName': full_name,
                'googleId': google_id,
                'picture': picture,
                'identityId': identity_id,
                'credits': FREE_CREDITS,
                'plan': 'Aarambh',
                'subscription_plan': 'aarambh_free',
                'aarambh_credits_claimed': True,  # SECURITY: Mark free credits as claimed
                'aarambh_claimed_at': now,
                'status': 'active',
                'created_at': now,
                'last_login': now,
                'login_method': 'google',
                'login_count': 1,
                'welcome_email_sent': True
            })

            # Send welcome email to new user (async - don't block)
            try:
                send_welcome_email(email, full_name, FREE_CREDITS)
            except Exception as email_error:
                print(f"Failed to send welcome email (non-blocking): {email_error}")

            return {
                'statusCode': 201,
                'body': json.dumps({
                    'success': True,
                    'isNewUser': True,
                    'credits': FREE_CREDITS,
                    'plan': 'Aarambh'
                })
            }

    except Exception as e:
        # Fix #17: Log error internally but don't expose to client
        print(f"Google auth error: {type(e).__name__}: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Google authentication failed. Please try again.'})
        }


def verify_token(event, dynamodb):
    """Verify JWT token"""
    try:
        token = event.get('token')

        if not token:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Token is required'})
            }

        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Token has expired'})
            }
        except jwt.InvalidTokenError:
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Invalid token'})
            }

        user_id = decoded.get('user_id')
        users_table = dynamodb.Table(USERS_TABLE)
        response = users_table.get_item(Key={'user_id': user_id})

        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'User not found'})
            }

        user = response['Item']
        credits = user.get('credits', 0)
        if isinstance(credits, Decimal):
            credits = int(credits)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'valid': True,
                'user_id': user['user_id'],
                'email': user['email'],
                'fullName': user.get('fullName', ''),
                'credits': credits,
                'plan': user.get('plan', 'Free')
            })
        }

    except Exception as e:
        # Fix #17: Log error internally but don't expose to client
        print(f"Token verification error: {type(e).__name__}: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Token verification failed'})
        }


def logout_user(event, dynamodb):
    """Logout user"""
    return {
        'statusCode': 200,
        'body': json.dumps({'success': True, 'message': 'Logout successful'})
    }


def reset_password(event, dynamodb):
    """Reset user password"""
    try:
        email = event.get('email')
        new_password = event.get('newPassword') or event.get('new_password')

        if not all([email, new_password]):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Email and new password are required'})
            }

        users_table = dynamodb.Table(USERS_TABLE)

        # Fix #6: Find user by email using GSI query instead of scan
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        if not response.get('Items'):
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'User not found'})
            }

        user = response['Items'][0]
        new_password_hash = hashlib.sha256(new_password.encode()).hexdigest()

        users_table.update_item(
            Key={'user_id': user['user_id']},
            UpdateExpression='SET password_hash = :ph, updated_at = :ua',
            ExpressionAttributeValues={
                ':ph': new_password_hash,
                ':ua': datetime.utcnow().isoformat()
            }
        )

        return {
            'statusCode': 200,
            'body': json.dumps({'success': True, 'message': 'Password reset successful'})
        }

    except Exception as e:
        # Fix #17: Log error internally but don't expose to client
        print(f"Password reset error: {type(e).__name__}: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Password reset failed. Please try again.'})
        }


def generate_token(user_id, email):
    """Generate JWT token"""
    token_data = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(token_data, JWT_SECRET, algorithm='HS256')


def startup_register(event, dynamodb):
    """Register a startup with special benefits (3 free credits + 50% coupon for 1 year)"""
    try:
        email = event.get('email')
        founder_name = event.get('founderName') or event.get('founder_name', '')
        startup_name = event.get('startupName') or event.get('startup_name', '')
        website = event.get('website', '')
        pitch = event.get('pitch', '')
        stage = event.get('stage', 'idea')
        coupon_code = event.get('couponCode') or event.get('coupon_code', '')

        if not email or not founder_name or not startup_name:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Email, founder name, and startup name are required'})
            }

        users_table = dynamodb.Table(USERS_TABLE)

        # Check if user already exists
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        existing_user = None
        if response.get('Items'):
            for item in response['Items']:
                if item.get('status', 'active') == 'active' and item.get('account_status', 'active') != 'deleted':
                    existing_user = item
                    break

        now = datetime.utcnow()
        coupon_expiry = (now + timedelta(days=365)).isoformat()

        if existing_user:
            # Update existing user with startup benefits
            user_id = existing_user.get('user_id')
            current_credits = int(existing_user.get('credits', 0))

            users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression='SET credits = :credits, startup_name = :startup_name, startup_pitch = :pitch, startup_stage = :stage, startup_website = :website, startup_coupon = :coupon, startup_coupon_expiry = :expiry, is_startup = :is_startup, updated_at = :updated',
                ExpressionAttributeValues={
                    ':credits': current_credits + 3,  # Add 3 free credits
                    ':startup_name': startup_name,
                    ':pitch': pitch,
                    ':stage': stage,
                    ':website': website,
                    ':coupon': coupon_code,
                    ':expiry': coupon_expiry,
                    ':is_startup': True,
                    ':updated': now.isoformat()
                }
            )
        else:
            # Create new user with startup benefits
            user_id = str(uuid.uuid4())

            users_table.put_item(Item={
                'user_id': user_id,
                'email': email,
                'full_name': founder_name,
                'status': 'active',
                'account_status': 'active',
                'credits': 3,  # 3 free credits
                'plan': 'aarambh',
                'plan_name': 'Aarambh',
                'startup_name': startup_name,
                'startup_pitch': pitch,
                'startup_stage': stage,
                'startup_website': website,
                'startup_coupon': coupon_code,
                'startup_coupon_expiry': coupon_expiry,
                'is_startup': True,
                'source': 'startup_program',
                'created_at': now.isoformat(),
                'updated_at': now.isoformat()
            })

        # Send startup welcome email
        send_startup_welcome_email(email, founder_name, startup_name, coupon_code, coupon_expiry)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'message': 'Startup registered successfully',
                'couponCode': coupon_code,
                'couponExpiry': coupon_expiry,
                'credits': 3
            })
        }

    except Exception as e:
        print(f"Startup registration error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Startup registration failed. Please try again.'})
        }


def send_startup_welcome_email(to_email, founder_name, startup_name, coupon_code, coupon_expiry):
    """Send welcome email to startup founder with coupon details"""
    try:
        subject = f"🚀 Welcome to AiVedha Guard, {founder_name}! Your Startup Benefits Are Ready"

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:20px;">
        <tr>
            <td style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <!-- Header -->
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#d946ef 100%);padding:40px 30px;text-align:center;">
                            <div style="width:80px;height:80px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
                                <span style="font-size:40px;">🚀</span>
                            </div>
                            <h1 style="color:white;margin:0;font-size:28px;font-weight:700;">Welcome to AiVedha Guard!</h1>
                            <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">Your Startup Security Journey Begins</p>
                        </td>
                    </tr>
                </table>

                <!-- Content -->
                <table width="100%" cellpadding="30" cellspacing="0">
                    <tr>
                        <td>
                            <p style="color:#374151;font-size:18px;margin:0 0 20px;">
                                Hello <strong style="color:#6366f1;">{founder_name}</strong>,
                            </p>

                            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 25px;">
                                Congratulations on registering <strong>{startup_name}</strong> with the AiVedha Guard Startup Program!
                                We're thrilled to support your journey with enterprise-grade security at startup-friendly prices.
                            </p>

                            <!-- Benefits Box -->
                            <table width="100%" style="background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%);border-radius:12px;margin:0 0 25px;">
                                <tr>
                                    <td style="padding:25px;">
                                        <h3 style="color:#0369a1;margin:0 0 15px;font-size:18px;">🎁 Your Startup Benefits</h3>
                                        <table width="100%">
                                            <tr>
                                                <td style="padding:8px 0;color:#0c4a6e;font-size:14px;">
                                                    ✅ <strong>3 Free Security Credits</strong> - Start auditing today
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0;color:#0c4a6e;font-size:14px;">
                                                    ✅ <strong>50% OFF for 1 Year</strong> - On all plan purchases
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0;color:#0c4a6e;font-size:14px;">
                                                    ✅ <strong>21 Security Modules</strong> - Enterprise-grade protection
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0;color:#0c4a6e;font-size:14px;">
                                                    ✅ <strong>AI-Powered Fixes</strong> - Copy-paste remediation code
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Coupon Box -->
                            <table width="100%" style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:12px;border:2px dashed #f59e0b;margin:0 0 25px;">
                                <tr>
                                    <td style="padding:25px;text-align:center;">
                                        <p style="color:#92400e;margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Your Exclusive Coupon Code</p>
                                        <div style="background:white;border-radius:8px;padding:15px;display:inline-block;">
                                            <code style="font-size:24px;font-weight:700;color:#d97706;letter-spacing:2px;">{coupon_code}</code>
                                        </div>
                                        <p style="color:#78350f;margin:15px 0 0;font-size:12px;">
                                            Valid until {coupon_expiry[:10]} • Use on any plan purchase
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="text-align:center;padding:10px 0 25px;">
                                        <a href="https://aivedha.ai/security-audit" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:white;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:600;font-size:16px;box-shadow:0 4px 15px rgba(99,102,241,0.4);">
                                            Start Your First Audit →
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;border-top:1px solid #e5e7eb;padding-top:20px;">
                                <strong>Why Security Matters for Startups:</strong><br>
                                60% of startups that suffer a cyber attack close within 6 months. Build trust with investors
                                and customers by showing you take security seriously from day one.
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Footer -->
                <table width="100%" style="background:#f9fafb;border-top:1px solid #e5e7eb;">
                    <tr>
                        <td style="padding:20px 30px;text-align:center;">
                            <p style="color:#9ca3af;font-size:12px;margin:0 0 10px;">
                                Need help? Contact us at <a href="mailto:support@aivedha.ai" style="color:#6366f1;">support@aivedha.ai</a>
                            </p>
                            <p style="color:#9ca3af;font-size:11px;margin:0;">
                                © 2025 Aivibe Software Services Pvt Ltd. All rights reserved.
                            </p>
                            <p style="color:#d1d5db;font-size:10px;margin:10px 0 0;line-height:1.5;">
                                Terms: The 50% discount is valid for 1 year from registration date. Can be used multiple times on plan purchases.
                                Aivibe reserves the right to modify or revoke this offer at any time.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        text_body = f"""
Welcome to AiVedha Guard, {founder_name}!

Congratulations on registering {startup_name} with the AiVedha Guard Startup Program!

YOUR STARTUP BENEFITS:
✅ 3 Free Security Credits - Start auditing today
✅ 50% OFF for 1 Year - On all plan purchases
✅ 21 Security Modules - Enterprise-grade protection
✅ AI-Powered Fixes - Copy-paste remediation code

YOUR EXCLUSIVE COUPON CODE: {coupon_code}
Valid until: {coupon_expiry[:10]}

Start your first audit: https://aivedha.ai/security-audit

Why Security Matters:
60% of startups that suffer a cyber attack close within 6 months.
Build trust with investors and customers by showing you take security seriously from day one.

Need help? Contact us at support@aivedha.ai

© 2025 Aivibe Software Services Pvt Ltd. All rights reserved.
"""

        send_email_via_ses(to_email, subject, html_body, text_body)

    except Exception as e:
        print(f"Failed to send startup welcome email: {str(e)}")
