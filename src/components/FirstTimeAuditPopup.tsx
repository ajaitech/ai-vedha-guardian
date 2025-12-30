import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Sparkles,
  ArrowRight,
  X,
  Globe,
  Zap,
  CheckCircle,
  Lock,
  Search
} from "lucide-react";

interface FirstTimeAuditPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onStartAudit: (url: string) => void;
  userName?: string;
}

export const FirstTimeAuditPopup = ({
  isOpen,
  onClose,
  onStartAudit,
  userName
}: FirstTimeAuditPopupProps) => {
  const [protocol, setProtocol] = useState<'https://' | 'http://'>('https://');
  const [urlDomain, setUrlDomain] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Validate URL as user types
  useEffect(() => {
    const urlPattern = /^([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
    setIsValidUrl(urlPattern.test(urlDomain) && urlDomain.length > 0);
  }, [urlDomain]);

  // Handle URL input change with auto-protocol detection
  const handleUrlChange = (value: string) => {
    // Check if user pasted a full URL with protocol
    if (value.startsWith('https://')) {
      setProtocol('https://');
      setUrlDomain(value.slice(8));
    } else if (value.startsWith('http://')) {
      setProtocol('http://');
      setUrlDomain(value.slice(7));
    } else {
      // Remove any accidental protocol prefix
      const cleanValue = value.replace(/^(https?:\/\/)+/i, '');
      setUrlDomain(cleanValue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidUrl) {
      const fullUrl = protocol + urlDomain.trim();
      onStartAudit(fullUrl);
    }
  };

  const handleDismiss = () => {
    // Mark popup as dismissed in localStorage
    localStorage.setItem('firstTimeAuditPopupDismissed', 'true');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={handleDismiss}
      >
        {/* Backdrop with blur */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Popup Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-cyan-500/30 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{
            boxShadow: `
              0 0 80px rgba(34, 211, 238, 0.15),
              0 0 40px rgba(34, 211, 238, 0.1),
              0 25px 50px -12px rgba(0, 0, 0, 0.5),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `
          }}
        >
          {/* Static subtle background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 text-slate-400 hover:text-white transition-all duration-300 hover:scale-110"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="relative p-8 pt-6">
            {/* Header - static icon, no animations */}
            <div className="flex justify-center mb-6">
              <Shield className="w-12 h-12 text-cyan-400" />
            </div>

            {/* Welcome Text */}
            <div className="text-center mb-6">
              <motion.h2
                className="text-2xl font-bold text-white mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {userName ? `Welcome, ${userName.split(' ')[0]}!` : 'Ready to Secure Your Website?'}
              </motion.h2>
              <motion.p
                className="text-slate-300"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Enter any public URL to start your first security audit
              </motion.p>
            </div>

            {/* URL Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                className={`relative rounded-xl transition-all duration-300 ${
                  isFocused
                    ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20'
                    : 'ring-1 ring-slate-600'
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {/* Protocol Selector */}
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value as 'https://' | 'http://')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 pl-2 pr-1 bg-slate-700/80 border border-slate-600 rounded-lg text-sm font-medium text-cyan-400 cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-cyan-400 z-10"
                  style={{ width: '80px' }}
                >
                  <option value="https://">https://</option>
                  <option value="http://">http://</option>
                </select>
                <Input
                  type="text"
                  value={urlDomain}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="example.com"
                  className="pl-24 pr-12 py-6 bg-slate-800/50 border-0 text-white placeholder:text-slate-500 text-lg rounded-xl focus:ring-0 focus-visible:ring-0"
                  autoFocus
                />
                {isValidUrl && (
                  <motion.div
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                  >
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </motion.div>
                )}
              </motion.div>

              {/* Submit button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  type="submit"
                  disabled={!isValidUrl}
                  className={`w-full py-6 text-lg font-semibold rounded-xl transition-all duration-300 border-2 ${
                    isValidUrl
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 border-transparent hover:bg-transparent hover:bg-none hover:text-cyan-400 hover:border-cyan-400 hover:shadow-cyan-500/50 hover:-translate-y-1 hover:scale-[1.02]'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed border-transparent'
                  }`}
                >
                  <motion.span
                    className="flex items-center justify-center gap-2"
                    animate={isValidUrl ? { x: [0, 5, 0] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Zap className="w-5 h-5" />
                    Start Security Audit
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </button>
              </motion.div>
            </form>

            {/* Features Preview */}
            <motion.div
              className="mt-6 grid grid-cols-3 gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {[
                { icon: Lock, label: "SSL Check" },
                { icon: Shield, label: "21 Modules" },
                { icon: Search, label: "Deep Scan" }
              ].map((feature, index) => (
                <motion.div
                  key={feature.label}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  whileHover={{ scale: 1.05, borderColor: 'rgba(34, 211, 238, 0.3)' }}
                >
                  <feature.icon className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs text-slate-400">{feature.label}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Footer note */}
            <motion.p
              className="text-center text-xs text-slate-500 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Free audit uses 1 credit. Your first audit is on us!
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FirstTimeAuditPopup;
