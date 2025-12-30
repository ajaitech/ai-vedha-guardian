/**
 * SecurityBadge Component
 *
 * A premium certificate-style security badge that website owners can embed
 * to show their site has been audited by AiVedha Guard.
 * Features: AiVedha logo, QR code verification, glossy certificate effects,
 * stamp-style design with glitter animations and encryption tags.
 *
 * NOTE: This badge is AiVedha branded and cannot be white-labeled.
 */

import { Shield, CheckCircle, Lock, ShieldCheck, Award, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export interface SecurityBadgeProps {
  certificateNumber: string;
  securityScore: number;
  domain: string;
  scanDate: string;
  sslGrade?: string;
  variant?: 'full' | 'compact' | 'minimal' | 'animated' | 'inline' | 'stamp';
  theme?: 'dark' | 'light';
  showScore?: boolean;
  className?: string;
  demoMode?: boolean; // When true, hides verify link (for display purposes)
  expirationDate?: string; // Certificate expiration date
  validationStatus?: 'valid' | 'expired' | 'pending'; // Real-time validation
  showAnimations?: boolean; // Enable pulse/glow animations
  size?: 'small' | 'medium' | 'large'; // Badge size
  onVerify?: () => void; // Custom verify handler
}

// Get grade from score
const getGrade = (score: number): string => {
  if (score >= 9) return 'A+';
  if (score >= 8) return 'A';
  if (score >= 7) return 'B';
  if (score >= 6) return 'C';
  if (score >= 5) return 'D';
  return 'F';
};

// Get color based on score
const getScoreColor = (score: number, theme: 'dark' | 'light'): string => {
  if (theme === 'dark') {
    if (score >= 8) return '#10b981'; // emerald
    if (score >= 6) return '#f59e0b'; // amber
    return '#ef4444'; // red
  } else {
    if (score >= 8) return '#059669'; // emerald-600
    if (score >= 6) return '#d97706'; // amber-600
    return '#dc2626'; // red-600
  }
};

// Get grade color with gold/silver/bronze theming
const getGradeStyle = (score: number): { bg: string; border: string; text: string } => {
  if (score >= 9) return { bg: 'linear-gradient(135deg, #ffd700 0%, #ffed4a 50%, #ffd700 100%)', border: '#ffd700', text: '#1a1a2e' }; // Gold
  if (score >= 8) return { bg: 'linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 50%, #c0c0c0 100%)', border: '#c0c0c0', text: '#1a1a2e' }; // Silver
  if (score >= 7) return { bg: 'linear-gradient(135deg, #cd7f32 0%, #e8a962 50%, #cd7f32 100%)', border: '#cd7f32', text: '#ffffff' }; // Bronze
  return { bg: 'linear-gradient(135deg, #64748b 0%, #94a3b8 50%, #64748b 100%)', border: '#64748b', text: '#ffffff' };
};

// Full Badge - Premium Certificate Style with AiVedha branding
export const SecurityBadgeFull: React.FC<SecurityBadgeProps> = ({
  certificateNumber,
  securityScore,
  domain,
  scanDate,
  sslGrade = 'A+',
  theme = 'dark',
  className = '',
  demoMode = false,
}) => {
  const scoreColor = getScoreColor(securityScore, theme);
  const grade = getGrade(securityScore);
  const gradeStyle = getGradeStyle(securityScore);
  const verifyUrl = `https://aivedha.ai/verify/${certificateNumber}`;

  // Theme colors
  const isDark = theme === 'dark';
  const bgGradient = isDark
    ? 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
    : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderGold = 'linear-gradient(135deg, #d4af37 0%, #f4e4ba 25%, #d4af37 50%, #c5a028 75%, #d4af37 100%)';

  return (
    <div
      className={`security-badge-certificate ${className}`}
      style={{
        width: '280px',
        position: 'relative',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Outer Gold Border Frame */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '3px',
          background: borderGold,
          borderRadius: '20px',
          boxShadow: `
            0 0 30px rgba(212, 175, 55, 0.3),
            0 10px 40px rgba(0,0,0,0.3),
            inset 0 0 20px rgba(255,255,255,0.1)
          `,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: bgGradient,
            borderRadius: '17px',
          }}
        />
      </div>

      {/* Main Certificate Content */}
      <div
        style={{
          position: 'relative',
          padding: '16px',
          zIndex: 1,
        }}
      >
        {/* Glossy Shine Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)',
            borderRadius: '17px 17px 0 0',
            pointerEvents: 'none',
          }}
        />

        {/* Watermark Pattern */}
        <div
          style={{
            position: 'absolute',
            inset: '20px',
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L55 20v20L30 55 5 40V20z' fill='none' stroke='%23d4af37' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }}
        />

        {/* Corner Ornaments */}
        <div style={{ position: 'absolute', top: '8px', left: '8px', color: '#d4af37', opacity: 0.6 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h8v2H5v6H3V3zm0 18v-8h2v6h6v2H3zm18-18v8h-2V5h-6V3h8zm0 18h-8v-2h6v-6h2v8z"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', top: '8px', right: '8px', color: '#d4af37', opacity: 0.6, transform: 'rotate(90deg)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h8v2H5v6H3V3zm0 18v-8h2v6h6v2H3zm18-18v8h-2V5h-6V3h8zm0 18h-8v-2h6v-6h2v8z"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: '8px', left: '8px', color: '#d4af37', opacity: 0.6, transform: 'rotate(270deg)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h8v2H5v6H3V3zm0 18v-8h2v6h6v2H3zm18-18v8h-2V5h-6V3h8zm0 18h-8v-2h6v-6h2v8z"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: '8px', right: '8px', color: '#d4af37', opacity: 0.6, transform: 'rotate(180deg)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h8v2H5v6H3V3zm0 18v-8h2v6h6v2H3zm18-18v8h-2V5h-6V3h8zm0 18h-8v-2h6v-6h2v8z"/>
          </svg>
        </div>

        {/* Header with AiVedha Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          <img
            src="/aivibe/Ai%20Vedha.png"
            alt="AiVedha"
            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
          />
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '800',
              color: '#d4af37',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}>
              AiVedha Guard
            </div>
            <div style={{ fontSize: '8px', color: mutedColor, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Security Certificate
            </div>
          </div>
          <Award style={{ width: '24px', height: '24px', color: '#d4af37' }} />
        </div>

        {/* Certificate Title Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />
          <ShieldCheck style={{ width: '16px', height: '16px', color: '#d4af37' }} />
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          {/* Left: Score & Grade */}
          <div style={{ flex: 1 }}>
            {/* Score Display */}
            <div
              style={{
                padding: '8px',
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(248, 250, 252, 0.8)',
                borderRadius: '10px',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                marginBottom: '8px',
              }}
            >
              <div style={{ fontSize: '8px', color: mutedColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px', textAlign: 'center' }}>
                Security Score
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <span style={{ fontSize: '22px', fontWeight: '800', color: scoreColor }}>{securityScore.toFixed(1)}</span>
                <span style={{ fontSize: '11px', color: mutedColor }}>/10</span>
              </div>
            </div>

            {/* Grade Badge */}
            <div
              style={{
                width: '100%',
                padding: '6px',
                borderRadius: '10px',
                background: gradeStyle.bg,
                border: `2px solid ${gradeStyle.border}`,
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: '900', color: gradeStyle.text, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                Grade {grade}
              </span>
            </div>
          </div>

          {/* Right: QR Code - Hidden in demo mode */}
          {!demoMode && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '6px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '2px solid #d4af37',
            }}>
              <QRCodeSVG
                value={verifyUrl}
                size={60}
                level="M"
                bgColor="#ffffff"
                fgColor="#1a1a2e"
              />
              <div style={{ fontSize: '7px', color: '#64748b', marginTop: '2px', textAlign: 'center' }}>
                Scan to Verify
              </div>
            </div>
          )}
        </div>

        {/* Domain & Details */}
        <div style={{
          padding: '8px',
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.5)',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          marginBottom: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '9px', color: mutedColor }}>Domain</span>
            <span style={{ fontSize: '9px', color: textColor, fontWeight: '600' }}>{domain}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '9px', color: mutedColor }}>SSL/TLS</span>
            <span style={{ fontSize: '9px', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Lock style={{ width: '8px', height: '8px' }} />
              {sslGrade} • TLS 1.3
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '9px', color: mutedColor }}>Verified</span>
            <span style={{ fontSize: '9px', color: textColor }}>{scanDate}</span>
          </div>
        </div>

        {/* Encryption Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '5px 8px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
          borderRadius: '6px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          marginBottom: '8px',
        }}>
          <Shield style={{ width: '10px', height: '10px', color: '#10b981' }} />
          <span style={{ fontSize: '7px', color: '#10b981', fontWeight: '600', letterSpacing: '0.04em' }}>
            256-BIT AES • OWASP COMPLIANT • AI VERIFIED
          </span>
        </div>

        {/* Verification Link - Compact - Hidden in demo mode */}
        {!demoMode && (
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '6px 10px',
              textDecoration: 'none',
              color: '#d4af37',
              fontSize: '10px',
              fontWeight: '600',
              transition: 'all 0.2s',
              letterSpacing: '0.03em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f4e4ba';
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#d4af37';
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            <CheckCircle style={{ width: '12px', height: '12px' }} />
            Verify Certificate →
          </a>
        )}

        {/* Certificate Number Footer */}
        <div style={{
          marginTop: '6px',
          textAlign: 'center',
          paddingTop: '6px',
          borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        }}>
          <span style={{ fontSize: '7px', color: mutedColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {demoMode ? 'Sample Certificate' : `Cert: ${certificateNumber}`}
          </span>
        </div>
      </div>
    </div>
  );
};

// Compact Badge - Premium gold-bordered version for sidebars
export const SecurityBadgeCompact: React.FC<SecurityBadgeProps> = ({
  certificateNumber,
  securityScore,
  theme = 'dark',
  className = '',
  demoMode = false,
}) => {
  const scoreColor = getScoreColor(securityScore, theme);
  const grade = getGrade(securityScore);
  const gradeStyle = getGradeStyle(securityScore);
  const isDark = theme === 'dark';
  const bgGradient = isDark
    ? 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)'
    : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)';
  const verifyUrl = `https://aivedha.ai/verify/${certificateNumber}`;

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: bgGradient,
    border: '1.5px solid #d4af37',
    borderRadius: '10px',
    textDecoration: 'none',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    boxShadow: '0 0 12px rgba(212, 175, 55, 0.15), 0 2px 12px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    position: 'relative',
    overflow: 'hidden',
  };

  const content = (
    <>
      {/* Glossy shine */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
        pointerEvents: 'none',
      }} />
      <img
        src="/aivibe/Ai%20Vedha.png"
        alt="AiVedha"
        style={{ width: '28px', height: '28px', objectFit: 'contain', position: 'relative', zIndex: 1 }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#d4af37', letterSpacing: '0.04em' }}>
          AiVedha Guard
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: '800',
            padding: '1px 6px',
            borderRadius: '4px',
            background: gradeStyle.bg,
            color: gradeStyle.text,
          }}>{grade}</span>
          <span style={{ fontSize: '9px', color: scoreColor, fontWeight: '600' }}>
            {demoMode ? 'Sample' : 'Verified ✓'}
          </span>
        </div>
      </div>
    </>
  );

  // In demo mode, render as div instead of link
  if (demoMode) {
    return (
      <div className={`security-badge-compact ${className}`} style={containerStyle}>
        {content}
      </div>
    );
  }

  return (
    <a
      href={verifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`security-badge-compact ${className}`}
      style={containerStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.3), 0 4px 16px rgba(0,0,0,0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 0 12px rgba(212, 175, 55, 0.15), 0 2px 12px rgba(0,0,0,0.2)';
      }}
    >
      {content}
    </a>
  );
};

// Minimal Badge - Gold shield icon with verification
export const SecurityBadgeMinimal: React.FC<SecurityBadgeProps> = ({
  certificateNumber,
  securityScore,
  className = '',
  demoMode = false,
}) => {
  const grade = getGrade(securityScore);
  const gradeStyle = getGradeStyle(securityScore);
  const verifyUrl = `https://aivedha.ai/verify/${certificateNumber}`;

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4e4ba 50%, #d4af37 100%)',
    textDecoration: 'none',
    boxShadow: '0 0 20px rgba(212, 175, 55, 0.4), 0 4px 12px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    position: 'relative',
    border: '2px solid #c5a028',
    cursor: demoMode ? 'default' : 'pointer',
  };

  const content = (
    <>
      {/* Glossy shine */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)',
        borderRadius: '12px 12px 0 0',
        pointerEvents: 'none',
      }} />
      <ShieldCheck style={{ width: '28px', height: '28px', color: '#1a1a2e' }} />
      {/* Grade indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '-6px',
          right: '-6px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: gradeStyle.bg,
          border: `2px solid ${gradeStyle.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: '800',
          color: gradeStyle.text,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {grade[0]}
      </div>
    </>
  );

  // In demo mode, render as div instead of link
  if (demoMode) {
    return (
      <div
        className={`security-badge-minimal ${className}`}
        style={containerStyle}
        title={`AiVedha Guard - Grade: ${grade} (Sample)`}
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={verifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`security-badge-minimal ${className}`}
      style={containerStyle}
      title={`AiVedha Guard Verified - Grade: ${grade}`}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 0 30px rgba(212, 175, 55, 0.6), 0 6px 20px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.4), 0 4px 12px rgba(0,0,0,0.2)';
      }}
    >
      {content}
    </a>
  );
};

// Animated Badge - Premium animated version with pulse effect
export const SecurityBadgeAnimated: React.FC<SecurityBadgeProps> = ({
  certificateNumber,
  securityScore,
  domain,
  validationStatus = 'valid',
  theme = 'dark',
  className = '',
  demoMode = false,
  onVerify,
}) => {
  const grade = getGrade(securityScore);
  const gradeStyle = getGradeStyle(securityScore);
  const isDark = theme === 'dark';
  const verifyUrl = `https://aivedha.ai/verify/${certificateNumber}`;

  const statusColor = validationStatus === 'valid' ? '#10b981' : validationStatus === 'expired' ? '#ef4444' : '#f59e0b';
  const statusText = validationStatus === 'valid' ? 'VERIFIED' : validationStatus === 'expired' ? 'EXPIRED' : 'PENDING';

  const handleClick = () => {
    if (onVerify) {
      onVerify();
    } else if (!demoMode) {
      window.open(verifyUrl, '_blank');
    }
  };

  return (
    <div
      className={`security-badge-animated ${className}`}
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: isDark ? 'linear-gradient(145deg, #0f172a, #1e293b)' : 'linear-gradient(145deg, #fff, #f8fafc)',
        border: '2px solid #d4af37',
        borderRadius: '12px',
        cursor: demoMode ? 'default' : 'pointer',
        fontFamily: "'Inter', sans-serif",
        boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated pulse ring */}
      <div style={{
        position: 'absolute',
        inset: '-2px',
        borderRadius: '14px',
        background: `linear-gradient(90deg, transparent, ${statusColor}40, transparent)`,
        animation: 'pulse-sweep 2s ease-in-out infinite',
      }} />

      {/* Shield icon with animation */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: gradeStyle.bg,
        animation: 'pulse-glow 2s ease-in-out infinite',
        boxShadow: `0 0 15px ${statusColor}40`,
      }}>
        <ShieldCheck style={{ width: '24px', height: '24px', color: gradeStyle.text }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#d4af37' }}>AiVedha Guard</span>
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            padding: '2px 6px',
            borderRadius: '4px',
            background: `${statusColor}20`,
            color: statusColor,
            animation: validationStatus === 'valid' ? 'pulse-text 2s ease-in-out infinite' : 'none',
          }}>
            {statusText}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '14px',
            fontWeight: '800',
            padding: '2px 8px',
            borderRadius: '4px',
            background: gradeStyle.bg,
            color: gradeStyle.text,
          }}>
            Grade {grade}
          </span>
          <span style={{ fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b' }}>
            {domain}
          </span>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse-sweep {
          0%, 100% { opacity: 0; transform: translateX(-100%); }
          50% { opacity: 1; transform: translateX(100%); }
        }
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

// Inline Badge - Small inline version for embedding in text
export const SecurityBadgeInline: React.FC<SecurityBadgeProps> = ({
  certificateNumber,
  securityScore,
  validationStatus = 'valid',
  className = '',
  demoMode = false,
  size = 'medium',
}) => {
  const grade = getGrade(securityScore);
  const gradeStyle = getGradeStyle(securityScore);
  const verifyUrl = `https://aivedha.ai/verify/${certificateNumber}`;

  const statusColor = validationStatus === 'valid' ? '#10b981' : validationStatus === 'expired' ? '#ef4444' : '#f59e0b';

  const sizeStyles = {
    small: { height: '20px', fontSize: '9px', iconSize: 12, padding: '2px 6px' },
    medium: { height: '24px', fontSize: '10px', iconSize: 14, padding: '3px 8px' },
    large: { height: '28px', fontSize: '11px', iconSize: 16, padding: '4px 10px' },
  };

  const s = sizeStyles[size];

  const content = (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      height: s.height,
      padding: s.padding,
      background: 'linear-gradient(135deg, #d4af37, #f4e4ba)',
      borderRadius: '4px',
      fontFamily: "'Inter', sans-serif",
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    }}>
      <ShieldCheck style={{ width: s.iconSize, height: s.iconSize, color: '#1a1a2e' }} />
      <span style={{ fontSize: s.fontSize, fontWeight: '700', color: '#1a1a2e' }}>{grade}</span>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: statusColor,
        boxShadow: `0 0 4px ${statusColor}`,
      }} />
    </span>
  );

  if (demoMode) {
    return <span className={`security-badge-inline ${className}`}>{content}</span>;
  }

  return (
    <a
      href={verifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`security-badge-inline ${className}`}
      style={{ textDecoration: 'none' }}
      title={`AiVedha Verified - Grade ${grade}`}
    >
      {content}
    </a>
  );
};

// Stamp Badge - Royal King Premium Seal with Crown, Laurel Wreath, and Premium Styling
export const SecurityBadgeStamp: React.FC<SecurityBadgeProps> = ({
  certificateNumber,
  securityScore,
  domain,
  scanDate,
  sslGrade = 'A+',
  theme = 'dark',
  className = '',
  demoMode = false,
}) => {
  const grade = getGrade(securityScore);
  const gradeStyle = getGradeStyle(securityScore);
  const isDark = theme === 'dark';
  const verifyUrl = `https://aivedha.ai/verify/${certificateNumber}`;

  // Royal Premium Colors
  const goldPrimary = '#d4af37';
  const goldLight = '#f4e4ba';
  const goldDark = '#b8962e';
  const royalPurple = '#4c1d95';
  const royalRed = '#991b1b';
  const bgColor = isDark ? '#0a0a1a' : '#ffffff';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';

  // Royal color based on grade
  const getRoyalAccent = () => {
    if (securityScore >= 9) return { main: goldPrimary, glow: 'rgba(212, 175, 55, 0.5)' };
    if (securityScore >= 7) return { main: '#c0c0c0', glow: 'rgba(192, 192, 192, 0.4)' };
    return { main: '#cd7f32', glow: 'rgba(205, 127, 50, 0.4)' };
  };
  const royalAccent = getRoyalAccent();

  return (
    <div
      className={`security-badge-stamp ${className}`}
      style={{
        width: '300px',
        position: 'relative',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Glitter Animation Styles */}
      <style>{`
        @keyframes glitter-1 {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        @keyframes glitter-2 {
          0%, 100% { opacity: 0; transform: scale(0) rotate(45deg); }
          50% { opacity: 1; transform: scale(1) rotate(225deg); }
        }
        @keyframes glitter-3 {
          0%, 100% { opacity: 0; transform: scale(0) rotate(90deg); }
          50% { opacity: 1; transform: scale(1) rotate(270deg); }
        }
        @keyframes stamp-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.4), inset 0 0 30px rgba(212, 175, 55, 0.1); }
          50% { box-shadow: 0 0 40px rgba(212, 175, 55, 0.6), inset 0 0 40px rgba(212, 175, 55, 0.2); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(25deg); }
          100% { transform: translateX(200%) rotate(25deg); }
        }
        .stamp-badge-hover:hover {
          transform: scale(1.02);
          filter: brightness(1.05);
        }
      `}</style>

      {/* Outer Serrated/Stamp Edge Frame */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 0% 50%, transparent 3px, ${goldPrimary} 3px, ${goldPrimary} 5px, transparent 5px) 0 0 / 10px 20px repeat-y,
            radial-gradient(circle at 100% 50%, transparent 3px, ${goldPrimary} 3px, ${goldPrimary} 5px, transparent 5px) 100% 0 / 10px 20px repeat-y,
            radial-gradient(circle at 50% 0%, transparent 3px, ${goldPrimary} 3px, ${goldPrimary} 5px, transparent 5px) 0 0 / 20px 10px repeat-x,
            radial-gradient(circle at 50% 100%, transparent 3px, ${goldPrimary} 3px, ${goldPrimary} 5px, transparent 5px) 0 100% / 20px 10px repeat-x,
            linear-gradient(135deg, ${goldDark} 0%, ${goldPrimary} 25%, ${goldLight} 50%, ${goldPrimary} 75%, ${goldDark} 100%)
          `,
          borderRadius: '16px',
          padding: '4px',
          animation: 'stamp-pulse 3s ease-in-out infinite',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: bgColor,
            borderRadius: '12px',
          }}
        />
      </div>

      {/* Glitter Particles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            background: `radial-gradient(circle, ${goldLight} 0%, ${goldPrimary} 50%, transparent 70%)`,
            borderRadius: '50%',
            top: `${10 + Math.random() * 80}%`,
            left: `${5 + Math.random() * 90}%`,
            animation: `glitter-${(i % 3) + 1} ${2 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      ))}

      {/* Encryption Tag - Top Right Corner */}
      <div
        style={{
          position: 'absolute',
          top: '-8px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
          zIndex: 20,
        }}
      >
        <Lock style={{ width: '10px', height: '10px', color: '#ffffff' }} />
        <span style={{ fontSize: '8px', fontWeight: '700', color: '#ffffff', letterSpacing: '0.05em' }}>
          256-BIT SSL
        </span>
      </div>

      {/* Main Content */}
      <div
        className="stamp-badge-hover"
        style={{
          position: 'relative',
          padding: '20px 16px 16px',
          zIndex: 1,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Shimmer Effect Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            borderRadius: '12px',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '50%',
              height: '200%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              animation: 'shimmer 4s ease-in-out infinite',
            }}
          />
        </div>

        {/* CERTIFIED Banner at Top */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '12px',
            padding: '6px 16px',
            background: `linear-gradient(135deg, ${goldDark} 0%, ${goldPrimary} 50%, ${goldLight} 100%)`,
            borderRadius: '20px',
            boxShadow: `0 4px 15px rgba(212, 175, 55, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}
        >
          <Sparkles style={{ width: '14px', height: '14px', color: '#1a1a2e' }} />
          <span
            style={{
              fontSize: '13px',
              fontWeight: '900',
              color: '#1a1a2e',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textShadow: '0 1px 0 rgba(255,255,255,0.5)',
            }}
          >
            CERTIFIED
          </span>
          <Sparkles style={{ width: '14px', height: '14px', color: '#1a1a2e' }} />
        </div>

        {/* Royal King Stamp with Crown & Laurel Wreath */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '12px',
            position: 'relative',
          }}
        >
          {/* Crown above seal */}
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
            }}
          >
            <svg width="60" height="35" viewBox="0 0 60 35" fill="none">
              {/* Crown base */}
              <path d="M10 30 L50 30 L50 25 L10 25 Z" fill={royalAccent.main} stroke={goldDark} strokeWidth="1"/>
              {/* Crown body */}
              <path d="M8 25 L5 10 L15 18 L22 5 L30 15 L38 5 L45 18 L55 10 L52 25 Z"
                    fill={`url(#crownGradient-${certificateNumber})`}
                    stroke={goldDark}
                    strokeWidth="1"/>
              {/* Crown jewels */}
              <circle cx="30" cy="12" r="4" fill="#ef4444" stroke={goldDark} strokeWidth="1"/>
              <circle cx="18" cy="16" r="3" fill="#3b82f6" stroke={goldDark} strokeWidth="0.5"/>
              <circle cx="42" cy="16" r="3" fill="#22c55e" stroke={goldDark} strokeWidth="0.5"/>
              {/* Crown points */}
              <circle cx="22" cy="5" r="2" fill={goldLight}/>
              <circle cx="30" cy="2" r="2.5" fill={goldLight}/>
              <circle cx="38" cy="5" r="2" fill={goldLight}/>
              {/* Gradient definition */}
              <defs>
                <linearGradient id={`crownGradient-${certificateNumber}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={goldLight}/>
                  <stop offset="50%" stopColor={royalAccent.main}/>
                  <stop offset="100%" stopColor={goldDark}/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Laurel Wreath - Left */}
          <div
            style={{
              position: 'absolute',
              left: '10px',
              top: '20px',
              width: '40px',
              height: '100px',
              zIndex: 15,
            }}
          >
            <svg width="40" height="100" viewBox="0 0 40 100" fill="none">
              {[...Array(6)].map((_, i) => (
                <g key={`left-${i}`}>
                  <ellipse
                    cx="25"
                    cy={15 + i * 14}
                    rx="12"
                    ry="6"
                    fill="#22c55e"
                    transform={`rotate(-30 25 ${15 + i * 14})`}
                    opacity={0.8 - i * 0.05}
                  />
                  <ellipse
                    cx="25"
                    cy={15 + i * 14}
                    rx="10"
                    ry="4"
                    fill="#16a34a"
                    transform={`rotate(-30 25 ${15 + i * 14})`}
                    opacity={0.9}
                  />
                </g>
              ))}
              <path d="M28 10 Q30 50, 25 90" stroke={goldDark} strokeWidth="2" fill="none"/>
            </svg>
          </div>

          {/* Laurel Wreath - Right */}
          <div
            style={{
              position: 'absolute',
              right: '10px',
              top: '20px',
              width: '40px',
              height: '100px',
              zIndex: 15,
              transform: 'scaleX(-1)',
            }}
          >
            <svg width="40" height="100" viewBox="0 0 40 100" fill="none">
              {[...Array(6)].map((_, i) => (
                <g key={`right-${i}`}>
                  <ellipse
                    cx="25"
                    cy={15 + i * 14}
                    rx="12"
                    ry="6"
                    fill="#22c55e"
                    transform={`rotate(-30 25 ${15 + i * 14})`}
                    opacity={0.8 - i * 0.05}
                  />
                  <ellipse
                    cx="25"
                    cy={15 + i * 14}
                    rx="10"
                    ry="4"
                    fill="#16a34a"
                    transform={`rotate(-30 25 ${15 + i * 14})`}
                    opacity={0.9}
                  />
                </g>
              ))}
              <path d="M28 10 Q30 50, 25 90" stroke={goldDark} strokeWidth="2" fill="none"/>
            </svg>
          </div>

          {/* Main Royal Seal */}
          <div
            style={{
              position: 'relative',
              width: '140px',
              height: '140px',
              marginTop: '10px',
              borderRadius: '50%',
              background: `
                radial-gradient(circle at 30% 30%, ${goldLight} 0%, transparent 40%),
                radial-gradient(circle at 70% 70%, rgba(0,0,0,0.2) 0%, transparent 40%),
                linear-gradient(135deg, ${goldDark} 0%, ${royalAccent.main} 25%, ${goldLight} 50%, ${royalAccent.main} 75%, ${goldDark} 100%)
              `,
              border: `5px solid ${royalAccent.main}`,
              boxShadow: `
                0 0 0 3px ${goldDark},
                0 0 0 8px ${royalAccent.main}30,
                0 0 30px ${royalAccent.glow},
                0 12px 40px rgba(0,0,0,0.4),
                inset 0 6px 12px rgba(255,255,255,0.4),
                inset 0 -6px 12px rgba(0,0,0,0.3)
              `,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Inner decorative ring */}
            <div
              style={{
                position: 'absolute',
                inset: '10px',
                borderRadius: '50%',
                border: `3px double ${goldDark}`,
                opacity: 0.6,
              }}
            />

            {/* Inner solid ring */}
            <div
              style={{
                position: 'absolute',
                inset: '20px',
                borderRadius: '50%',
                border: `1px solid ${goldPrimary}`,
                background: `radial-gradient(circle, ${isDark ? '#1a1a2e' : '#fefefe'} 0%, ${isDark ? '#0f0f1e' : '#f8f8f8'} 100%)`,
              }}
            />

            {/* Shield Icon */}
            <ShieldCheck
              style={{
                position: 'relative',
                width: '28px',
                height: '28px',
                color: royalAccent.main,
                marginBottom: '2px',
                filter: `drop-shadow(0 2px 4px ${royalAccent.glow})`,
                zIndex: 5,
              }}
            />

            {/* Grade Badge */}
            <div
              style={{
                position: 'relative',
                padding: '4px 12px',
                background: `linear-gradient(135deg, ${goldDark} 0%, ${royalAccent.main} 50%, ${goldDark} 100%)`,
                borderRadius: '12px',
                marginBottom: '2px',
                boxShadow: `0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)`,
                zIndex: 5,
              }}
            >
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: '900',
                  color: '#1a1a2e',
                  textShadow: '0 1px 0 rgba(255,255,255,0.4)',
                  letterSpacing: '0.08em',
                }}
              >
                {grade}
              </span>
            </div>

            {/* Score */}
            <span
              style={{
                position: 'relative',
                fontSize: '28px',
                fontWeight: '900',
                color: royalAccent.main,
                textShadow: `0 2px 4px rgba(0,0,0,0.3), 0 0 20px ${royalAccent.glow}`,
                lineHeight: 1,
                zIndex: 5,
              }}
            >
              {securityScore.toFixed(1)}
            </span>

            {/* Royal star decorations around seal */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '8px',
                  height: '8px',
                  background: `radial-gradient(circle, ${goldLight} 0%, ${goldPrimary} 100%)`,
                  borderRadius: '50%',
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${i * 45}deg) translateY(-65px) translateX(-4px)`,
                  transformOrigin: '4px 4px',
                  boxShadow: `0 0 6px ${royalAccent.glow}, inset 0 1px 2px rgba(255,255,255,0.5)`,
                }}
              />
            ))}

            {/* Royal notches */}
            {[...Array(24)].map((_, i) => (
              <div
                key={`notch-${i}`}
                style={{
                  position: 'absolute',
                  width: '3px',
                  height: i % 3 === 0 ? '10px' : '6px',
                  background: i % 3 === 0 ? goldLight : goldPrimary,
                  borderRadius: '2px',
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${i * 15}deg) translateY(-68px)`,
                  transformOrigin: '0 0',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
        </div>

        {/* AiVedha Branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
          <img
            src="/aivibe/Ai%20Vedha.png"
            alt="AiVedha"
            style={{ width: '24px', height: '24px', objectFit: 'contain' }}
          />
          <span style={{
            fontSize: '14px',
            fontWeight: '800',
            color: goldPrimary,
            letterSpacing: '0.06em',
          }}>
            AiVedha Guard
          </span>
          <Award style={{ width: '18px', height: '18px', color: goldPrimary }} />
        </div>

        {/* Domain & SSL Info */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          marginBottom: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ fontSize: '9px', color: mutedColor }}>Domain</span>
            <span style={{ fontSize: '9px', color: textColor, fontWeight: '600' }}>{domain}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ fontSize: '9px', color: mutedColor }}>SSL/TLS</span>
            <span style={{ fontSize: '9px', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Lock style={{ width: '8px', height: '8px' }} />
              {sslGrade} • TLS 1.3
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '9px', color: mutedColor }}>Verified</span>
            <span style={{ fontSize: '9px', color: textColor }}>{scanDate}</span>
          </div>
        </div>

        {/* Security Standards Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          padding: '6px 10px',
          background: `linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)`,
          borderRadius: '6px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          marginBottom: '8px',
        }}>
          <Shield style={{ width: '10px', height: '10px', color: '#10b981' }} />
          <span style={{ fontSize: '8px', color: '#10b981', fontWeight: '700', letterSpacing: '0.03em' }}>
            OWASP COMPLIANT • AI VERIFIED • 256-BIT AES
          </span>
        </div>

        {/* QR Code & Verify Section - Hidden in demo mode */}
        {!demoMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '6px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: `2px solid ${goldPrimary}`,
            }}>
              <QRCodeSVG
                value={verifyUrl}
                size={50}
                level="M"
                bgColor="#ffffff"
                fgColor="#1a1a2e"
              />
            </div>
            <div style={{ flex: 1 }}>
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: `linear-gradient(135deg, ${goldDark} 0%, ${goldPrimary} 100%)`,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#1a1a2e',
                  fontSize: '11px',
                  fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
                  transition: 'all 0.2s',
                }}
              >
                <CheckCircle style={{ width: '14px', height: '14px' }} />
                Verify Certificate
              </a>
              <div style={{
                fontSize: '7px',
                color: mutedColor,
                textAlign: 'center',
                marginTop: '4px',
                letterSpacing: '0.05em',
              }}>
                {certificateNumber}
              </div>
            </div>
          </div>
        )}

        {/* Demo mode certificate number */}
        {demoMode && (
          <div style={{
            textAlign: 'center',
            paddingTop: '4px',
            borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}>
            <span style={{ fontSize: '8px', color: mutedColor, letterSpacing: '0.06em' }}>
              Sample Certificate
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Main export - renders based on variant
const SecurityBadge: React.FC<SecurityBadgeProps> = (props) => {
  const { variant = 'full' } = props;

  switch (variant) {
    case 'compact':
      return <SecurityBadgeCompact {...props} />;
    case 'minimal':
      return <SecurityBadgeMinimal {...props} />;
    case 'animated':
      return <SecurityBadgeAnimated {...props} />;
    case 'inline':
      return <SecurityBadgeInline {...props} />;
    case 'stamp':
      return <SecurityBadgeStamp {...props} />;
    default:
      return <SecurityBadgeFull {...props} />;
  }
};

export default SecurityBadge;
