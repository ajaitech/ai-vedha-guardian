import { Link } from "react-router-dom";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="mt-auto rounded-t-3xl overflow-hidden relative footer-glass"
    >
      {/* Matte Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/[0.06] via-transparent to-transparent pointer-events-none" />

      {/* 3D Elevated Top Border - Multi-layer effect */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="absolute -top-[2px] left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent blur-[2px]" />
      <div className="absolute -top-[4px] left-16 right-16 h-[3px] bg-gradient-to-r from-transparent via-primary/15 to-transparent blur-[4px]" />
      <div className="absolute -top-[6px] left-24 right-24 h-[4px] bg-gradient-to-r from-transparent via-accent/10 to-transparent blur-[6px]" />

      <div className="container mx-auto px-4 py-3 relative z-10">
        <div className="flex flex-col space-y-2">
          {/* Main Footer Content */}
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            {/* Brand with Logo - matching header style */}
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center group-hover:border-primary/50 transition-all duration-300">
                    <svg
                      className="w-5 h-5 text-primary group-hover:text-cyan-400 transition-colors duration-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-sm font-bold bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent font-orbitron">
                    AiVedha
                  </span>
                  <span className="text-xs font-bold text-muted-foreground font-orbitron">
                    GUARD
                  </span>
                </div>
              </Link>
              <div className="hidden md:flex items-center space-x-3">
                <Link to="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Terms
                </Link>
                <span className="text-muted-foreground/30">|</span>
                <Link to="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Privacy
                </Link>
                <span className="text-muted-foreground/30">|</span>
                <Link to="/faq" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  FAQ
                </Link>
                <span className="text-muted-foreground/30">|</span>
                <Link to="/pricing" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </Link>
                <span className="text-muted-foreground/30">|</span>
                <Link to="/support" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Support
                </Link>
              </div>
            </div>

            {/* Copyright & Version */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                v2.5.0
              </span>
              <p className="text-xs text-muted-foreground">
                &copy; {currentYear} Aivibe Software Services Pvt Ltd. All rights reserved.
              </p>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="border-t border-border/30 pt-2">
            <p className="text-[10px] text-muted-foreground/70 text-center leading-relaxed">
              <span className="font-medium">Disclaimer:</span> This security audit report is auto-generated based on automated scanning and analysis.
              While we strive for accuracy, AiVedha Guard and Aivibe Software Services Pvt Ltd do not guarantee the completeness,
              accuracy, or reliability of the information provided. This report should not be considered as professional security advice.
              Users are advised to consult with qualified cybersecurity professionals for comprehensive security assessments.
              We are not liable for any damages or losses arising from the use of this service or reliance on its findings.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
