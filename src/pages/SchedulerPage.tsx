/**
 * AiVedha Guard - Scheduled Audits Page
 * Version: 1.0.0
 *
 * Beautiful UI for managing scheduled security audits.
 * Features:
 * - Create/Edit/Delete scheduled audits
 * - Real-time validation against user subscription
 * - Visual scheduler with frequency options
 * - Credit balance check before scheduling
 * - Disabled state when addon expires
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Globe,
  Play,
  Pause,
  Trash2,
  Edit3,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Shield,
  Zap,
  RefreshCw,
  Timer,
  CalendarDays,
  CalendarClock,
  ChevronDown,
  Info,
  Lock,
  Coins,
  AlertCircle,
  Settings,
  History,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  MapPin,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Layout } from "@/components/Layout";
import { Link, useNavigate } from "react-router-dom";
import AivedhaAPI from "@/lib/api";
import { CognitoAuth } from "@/lib/cognito";
import { useToast } from "@/hooks/use-toast";
import { selectOptimalRegion, detectUserRegion, REGIONS } from "@/lib/regionRouter";

// ============================================================================
// TYPES
// ============================================================================

interface ScheduledAudit {
  id: string;
  url: string;
  domain: string;
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  startDate: string;
  startTime: string;
  endDate: string | null;
  endTime: string | null;
  status: "active" | "paused" | "completed" | "expired";
  lastRun: string | null;
  nextRun: string | null;
  creditsUsed: number;
  createdAt: string;
  // Region routing (v5.0.0)
  scanRegion?: string; // Preferred region for this schedule
  regionName?: string; // Human-readable region name
}

// API response format for schedules
interface ApiScheduleResponse {
  schedule_id?: string;
  id?: string;
  url: string;
  frequency: string;
  start_date?: string;
  startDate?: string;
  start_time?: string;
  startTime?: string;
  end_date?: string;
  endDate?: string;
  end_time?: string;
  endTime?: string;
  status?: string;
  last_run?: string;
  lastRun?: string;
  next_run?: string;
  nextRun?: string;
  credits_used?: number;
  creditsUsed?: number;
  created_at?: string;
  createdAt?: string;
}

interface UserSubscription {
  isLoggedIn: boolean;
  currentPlanId: string | null;
  planStatus: "active" | "expired" | "cancelled" | "none";
  creditsRemaining: number;
  hasScheduledAuditsAddon: boolean;
  addonStatus: "active" | "expired" | "none";
  addonExpiresAt: string | null;
  maxSchedulers: number;
}

interface SchedulerFormData {
  url: string;
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  hasEndDate: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily", icon: CalendarDays, description: "Run every day at specified time", creditsPerMonth: 30 },
  { value: "weekly", label: "Weekly", icon: Calendar, description: "Run once every week", creditsPerMonth: 4 },
  { value: "biweekly", label: "Bi-Weekly", icon: CalendarClock, description: "Run every two weeks", creditsPerMonth: 2 },
  { value: "monthly", label: "Monthly", icon: Timer, description: "Run once a month", creditsPerMonth: 1 },
] as const;

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const validateUrl = (url: string): { valid: boolean; message: string; domain: string } => {
  if (!url.trim()) {
    return { valid: false, message: "URL is required", domain: "" };
  }

  try {
    // Add protocol if missing
    let urlToValidate = url.trim();
    if (!urlToValidate.startsWith("http://") && !urlToValidate.startsWith("https://")) {
      urlToValidate = `https://${urlToValidate}`;
    }

    const urlObj = new URL(urlToValidate);
    const domain = urlObj.hostname.replace(/^www\./, "");

    if (!domain.includes(".")) {
      return { valid: false, message: "Please enter a valid domain", domain: "" };
    }

    return { valid: true, message: "Valid URL", domain };
  } catch {
    return { valid: false, message: "Please enter a valid URL", domain: "" };
  }
};

const formatDateTime = (date: string, time: string): string => {
  const d = new Date(`${date}T${time}`);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getNextRunDate = (frequency: string, startDate: string, startTime: string): string => {
  const now = new Date();
  const next = new Date(`${startDate}T${startTime}`);

  if (next <= now) {
    switch (frequency) {
      case "daily":
        next.setDate(next.getDate() + 1);
        break;
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "biweekly":
        next.setDate(next.getDate() + 14);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
    }
  }

  return next.toISOString();
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "paused":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "completed":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "expired":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30";
  }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Addon Disabled Overlay
const AddonDisabledOverlay: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl"
  >
    <div className="text-center p-8 max-w-md">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <Lock className="w-10 h-10 text-red-500" />
      </div>
      <h3 className="text-2xl font-bold text-foreground mb-3">Scheduled Audits Unavailable</h3>
      <p className="text-muted-foreground mb-6">
        Your Scheduled Audits addon has expired or is not active. Subscribe to the addon to create and manage scheduled security audits.
      </p>
      <Button onClick={onUpgrade} className="border-2 border-violet-600 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:bg-background hover:from-background hover:to-background hover:text-violet-600 hover:border-violet-600 rounded-xl px-6 transition-all duration-300">
        <Zap className="w-4 h-4 mr-2" />
        Subscribe to Addon
      </Button>
    </div>
  </motion.div>
);

// Free Plan Restriction Overlay
const FreePlanOverlay: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl"
  >
    <div className="text-center p-8 max-w-md">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <AlertCircle className="w-10 h-10 text-amber-500" />
      </div>
      <h3 className="text-2xl font-bold text-foreground mb-3">Paid Plan Required</h3>
      <p className="text-muted-foreground mb-6">
        Scheduled Audits addon is only available for paid plan subscribers. Upgrade your plan to access this feature.
      </p>
      <Button onClick={onUpgrade} className="border-2 border-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:bg-background hover:from-background hover:to-background hover:text-amber-500 hover:border-amber-500 rounded-xl px-6 transition-all duration-300">
        <TrendingUp className="w-4 h-4 mr-2" />
        Upgrade Plan
      </Button>
    </div>
  </motion.div>
);

// Stats Card
const StatsCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon: Icon, label, value, color }) => (
  <Card className="bg-card/50 border-border/50">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Schedule Card
const ScheduleCard: React.FC<{
  schedule: ScheduledAudit;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onRunNow: () => void;
  disabled: boolean;
  isRunning: boolean;
  hasCredits: boolean;
}> = ({ schedule, onEdit, onDelete, onToggle, onRunNow, disabled, isRunning, hasCredits }) => {
  const frequencyInfo = FREQUENCY_OPTIONS.find(f => f.value === schedule.frequency);

  return (
    <motion.div variants={cardVariants}>
      <Card className={`bg-card/80 border-border/50 overflow-hidden transition-all hover:shadow-lg ${disabled ? "opacity-60" : ""}`}>
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-4 border-b border-border/30 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground truncate max-w-[200px]">{schedule.domain}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{schedule.url}</p>
                </div>
              </div>
              <Badge className={`${getStatusColor(schedule.status)} border`}>
                {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {/* Frequency */}
            <div className="flex items-center gap-2 text-sm">
              {frequencyInfo && <frequencyInfo.icon className="w-4 h-4 text-muted-foreground" />}
              <span className="text-muted-foreground">Frequency:</span>
              <span className="font-medium text-foreground">{frequencyInfo?.label || schedule.frequency}</span>
            </div>

            {/* Next Run */}
            {schedule.nextRun && schedule.status === "active" && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Next Run:</span>
                <span className="font-medium text-foreground">
                  {new Date(schedule.nextRun).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            )}

            {/* Last Run */}
            {schedule.lastRun && (
              <div className="flex items-center gap-2 text-sm">
                <History className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last Run:</span>
                <span className="font-medium text-foreground">
                  {new Date(schedule.lastRun).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            )}

            {/* Credits Used */}
            <div className="flex items-center gap-2 text-sm">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground">Credits Used:</span>
              <span className="font-medium text-foreground">{schedule.creditsUsed}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 pt-0 space-y-2">
            {/* Run Now button - Primary Action */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRunNow}
              disabled={disabled || isRunning || !hasCredits || schedule.status === "expired"}
              className="w-full rounded-lg border-2 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-300"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Audit...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Run Now
                </>
              )}
            </Button>

            {/* Secondary Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggle}
                disabled={disabled || schedule.status === "completed" || schedule.status === "expired"}
                className="flex-1 rounded-lg"
              >
                {schedule.status === "active" ? (
                  <>
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Resume
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                disabled={disabled}
                className="rounded-lg"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                disabled={disabled}
                className="rounded-lg border-2 border-red-500/50 text-red-500 bg-transparent hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Create/Edit Schedule Modal
const ScheduleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SchedulerFormData) => Promise<void>;
  editData?: ScheduledAudit | null;
  creditsRemaining: number;
}> = ({ isOpen, onClose, onSubmit, editData, creditsRemaining }) => {
  const [formData, setFormData] = useState<SchedulerFormData>({
    url: "",
    frequency: "weekly",
    startDate: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endDate: "",
    endTime: "09:00",
    hasEndDate: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlValidation, setUrlValidation] = useState({ valid: true, message: "", domain: "" });

  useEffect(() => {
    if (editData) {
      setFormData({
        url: editData.url,
        frequency: editData.frequency,
        startDate: editData.startDate,
        startTime: editData.startTime,
        endDate: editData.endDate || "",
        endTime: editData.endTime || "09:00",
        hasEndDate: !!editData.endDate,
      });
    } else {
      setFormData({
        url: "",
        frequency: "weekly",
        startDate: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endDate: "",
        endTime: "09:00",
        hasEndDate: false,
      });
    }
  }, [editData, isOpen]);

  useEffect(() => {
    if (formData.url) {
      setUrlValidation(validateUrl(formData.url));
    }
  }, [formData.url]);

  const selectedFrequency = FREQUENCY_OPTIONS.find(f => f.value === formData.frequency);
  const estimatedCredits = selectedFrequency?.creditsPerMonth || 0;
  const hasEnoughCredits = creditsRemaining >= estimatedCredits;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlValidation.valid || !hasEnoughCredits) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="bg-card border-border/50 shadow-2xl">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-violet-600 to-fuchsia-600 p-6 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <CalendarClock className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{editData ? "Edit Schedule" : "Create New Schedule"}</h2>
                <p className="text-white/80 text-sm mt-1">Configure automated security audits</p>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* URL Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    Website URL to Audit
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                    formData.url && !urlValidation.valid
                      ? "border-red-500 focus:ring-red-500/20"
                      : formData.url && urlValidation.valid
                      ? "border-emerald-500 focus:ring-emerald-500/20"
                      : "border-border focus:ring-primary/20 focus:border-primary"
                  }`}
                />
                {formData.url && (
                  <div className={`flex items-center gap-2 text-sm ${urlValidation.valid ? "text-emerald-600" : "text-red-500"}`}>
                    {urlValidation.valid ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {urlValidation.message}
                  </div>
                )}
              </div>

              {/* Frequency Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    Audit Frequency
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, frequency: option.value })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.frequency === option.value
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                          : "border-border hover:border-violet-300 dark:hover:border-violet-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <option.icon className={`w-5 h-5 ${formData.frequency === option.value ? "text-violet-500" : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-medium text-foreground">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                          <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">~{option.creditsPerMonth} credits/month</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date/Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* End Date Toggle */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="hasEndDate"
                    checked={formData.hasEndDate}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasEndDate: checked === true })}
                    aria-label="Set end date for scheduled audits"
                  />
                  <Label htmlFor="hasEndDate" className="text-sm font-medium text-foreground cursor-pointer">
                    Set end date (optional)
                  </Label>
                </div>

                {formData.hasEndDate && (
                  <div className="grid grid-cols-2 gap-4 ml-8">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">End Date</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        min={formData.startDate}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">End Time</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Credit Warning */}
              <div className={`flex items-start gap-3 p-4 rounded-xl ${hasEnoughCredits ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                <Coins className={`w-5 h-5 mt-0.5 ${hasEnoughCredits ? "text-emerald-500" : "text-red-500"}`} />
                <div>
                  <p className={`font-medium ${hasEnoughCredits ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                    {hasEnoughCredits ? "Credit Check Passed" : "Insufficient Credits"}
                  </p>
                  <p className={`text-sm ${hasEnoughCredits ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    Estimated: ~{estimatedCredits} credits/month • Available: {creditsRemaining} credits
                  </p>
                  {!hasEnoughCredits && (
                    <Link to="/pricing" className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 mt-2">
                      Purchase more credits <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" className="flex-1 rounded-xl" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
                  disabled={isSubmitting || !urlValidation.valid || !hasEnoughCredits}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editData ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {editData ? "Update Schedule" : "Create Schedule"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

// Delete Confirmation Dialog
const DeleteConfirmDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  scheduleDomain: string;
  isDeleting: boolean;
}> = ({ isOpen, onClose, onConfirm, scheduleDomain, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md"
      >
        <Card className="bg-card border-red-500/30 shadow-2xl">
          <CardContent className="p-6">
            <div className="text-center">
              {/* Warning Icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-foreground mb-2">Delete Schedule?</h3>

              {/* Message */}
              <p className="text-muted-foreground mb-2">
                Are you sure you want to delete the scheduled audit for:
              </p>
              <p className="font-semibold text-foreground mb-4 px-4 py-2 bg-muted/50 rounded-lg inline-block">
                {scheduleDomain}
              </p>
              <p className="text-sm text-red-500 dark:text-red-400 mb-6">
                This action cannot be undone. All scheduled runs will be cancelled.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white border-0"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Schedule
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SchedulerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [subscription, setSubscription] = useState<UserSubscription>({
    isLoggedIn: false,
    currentPlanId: null,
    planStatus: "none",
    creditsRemaining: 0,
    hasScheduledAuditsAddon: false,
    addonStatus: "none",
    addonExpiresAt: null,
    maxSchedulers: 1,
  });
  const [schedules, setSchedules] = useState<ScheduledAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledAudit | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    schedule: ScheduledAudit | null;
    isDeleting: boolean;
  }>({ isOpen: false, schedule: null, isDeleting: false });

  // Run Now state
  const [runningNow, setRunningNow] = useState<string | null>(null);

  // Get user's timezone
  const userTimezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  // Load user subscription and schedules
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Get current user from auth
        const currentUser = CognitoAuth.getCurrentUser();
        if (!currentUser) {
          // User not logged in, redirect to login
          navigate("/login", { state: { from: "/scheduler" } });
          return;
        }

        const currentUserId = currentUser.email || currentUser.identityId || currentUser.id;
        setUserId(currentUserId);

        // Fetch user subscription and credits
        const [subscriptionData, creditsData, addonValidation, schedulesData] = await Promise.all([
          AivedhaAPI.getCurrentSubscription(currentUserId).catch(() => null),
          AivedhaAPI.getUserCredits(currentUserId).catch(() => ({ credits: 0 })),
          AivedhaAPI.validateSchedulerAddon(currentUserId).catch(() => ({ has_addon: false })),
          AivedhaAPI.listSchedules(currentUserId).catch(() => ({ schedules: [] })),
        ]);

        setSubscription({
          isLoggedIn: true,
          currentPlanId: subscriptionData?.planCode || null,
          planStatus: (subscriptionData?.status as "active" | "expired" | "cancelled") || "none",
          creditsRemaining: typeof creditsData.credits === "number" ? creditsData.credits : parseInt(String(creditsData.credits)) || 0,
          hasScheduledAuditsAddon: addonValidation.has_addon,
          addonStatus: addonValidation.has_addon ? "active" : "none",
          addonExpiresAt: 'expires_at' in addonValidation ? addonValidation.expires_at || null : null,
          maxSchedulers: 'max_schedulers' in addonValidation ? addonValidation.max_schedulers || 1 : 1,
        });

        // Transform schedules from API format to component format
        if (schedulesData.schedules && schedulesData.schedules.length > 0) {
          // Helper to validate and cast frequency
          const toFrequency = (freq: string): "daily" | "weekly" | "biweekly" | "monthly" => {
            const validFreqs = ["daily", "weekly", "biweekly", "monthly"] as const;
            return validFreqs.includes(freq as typeof validFreqs[number])
              ? (freq as typeof validFreqs[number])
              : "monthly";
          };

          // Helper to validate and cast status
          const toStatus = (status: string | undefined): "active" | "paused" | "completed" | "expired" => {
            const validStatuses = ["active", "paused", "completed", "expired"] as const;
            const s = status || "active";
            return validStatuses.includes(s as typeof validStatuses[number])
              ? (s as typeof validStatuses[number])
              : "active";
          };

          const transformedSchedules: ScheduledAudit[] = schedulesData.schedules.map((s: ApiScheduleResponse, index: number) => ({
            id: s.schedule_id || s.id || `schedule-${Date.now()}-${index}`,
            url: s.url,
            domain: new URL(s.url.startsWith("http") ? s.url : `https://${s.url}`).hostname.replace(/^www\./, ""),
            frequency: toFrequency(s.frequency),
            startDate: s.start_date || s.startDate || new Date().toISOString().split('T')[0],
            startTime: s.start_time || s.startTime || '00:00',
            endDate: s.end_date || s.endDate || null,
            endTime: s.end_time || s.endTime || null,
            status: toStatus(s.status),
            lastRun: s.last_run || s.lastRun || null,
            nextRun: s.next_run || s.nextRun || null,
            creditsUsed: s.credits_used || s.creditsUsed || 0,
            createdAt: s.created_at || s.createdAt || new Date().toISOString(),
          }));
          setSchedules(transformedSchedules);
        }
      } catch (error) {
        logger.error("Failed to load data:", error);
        toast({
          title: "Error",
          description: "Failed to load scheduler data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate, toast]);

  // Computed values
  const isFreePlan = subscription.currentPlanId === "aarambh" || !subscription.currentPlanId;
  const isAddonActive = subscription.hasScheduledAuditsAddon && subscription.addonStatus === "active";
  const canCreateSchedule = isAddonActive && schedules.length < subscription.maxSchedulers;
  const activeSchedules = schedules.filter(s => s.status === "active").length;

  // Handlers
  const handleCreateSchedule = async (data: SchedulerFormData) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User not authenticated. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const urlValidation = validateUrl(data.url);

      if (editingSchedule) {
        // Update existing schedule
        const response = await AivedhaAPI.updateSchedule({
          scheduleId: editingSchedule.id,
          userId,
          url: data.url,
          frequency: data.frequency,
          startDate: data.startDate,
          startTime: data.startTime,
          endDate: data.hasEndDate ? data.endDate : undefined,
          endTime: data.hasEndDate ? data.endTime : undefined,
        });

        if (response.success) {
          // Update local state
          const updatedSchedule: ScheduledAudit = {
            ...editingSchedule,
            url: data.url,
            domain: urlValidation.domain,
            frequency: data.frequency,
            startDate: data.startDate,
            startTime: data.startTime,
            endDate: data.hasEndDate ? data.endDate : null,
            endTime: data.hasEndDate ? data.endTime : null,
            nextRun: getNextRunDate(data.frequency, data.startDate, data.startTime),
          };
          setSchedules(schedules.map(s => s.id === editingSchedule.id ? updatedSchedule : s));
          toast({
            title: "Schedule Updated",
            description: "Your scheduled audit has been updated successfully.",
          });
        } else {
          throw new Error(response.error || "Failed to update schedule");
        }
      } else {
        // Create new schedule
        const response = await AivedhaAPI.createSchedule({
          userId,
          url: data.url,
          frequency: data.frequency,
          startDate: data.startDate,
          startTime: data.startTime,
          endDate: data.hasEndDate ? data.endDate : undefined,
          endTime: data.hasEndDate ? data.endTime : undefined,
        });

        if (response.success && response.schedule) {
          // Determine optimal region for scheduled audits
          const userRegion = detectUserRegion();
          const optimalRegion = selectOptimalRegion(data.url, userRegion);
          const regionInfo = REGIONS[optimalRegion];

          const newSchedule: ScheduledAudit = {
            id: response.schedule.schedule_id,
            url: data.url,
            domain: urlValidation.domain,
            frequency: data.frequency,
            startDate: data.startDate,
            startTime: data.startTime,
            endDate: data.hasEndDate ? data.endDate : null,
            endTime: data.hasEndDate ? data.endTime : null,
            status: "active",
            lastRun: null,
            nextRun: getNextRunDate(data.frequency, data.startDate, data.startTime),
            creditsUsed: 0,
            createdAt: new Date().toISOString(),
            scanRegion: optimalRegion,
            regionName: regionInfo.regionName,
          };
          setSchedules([...schedules, newSchedule]);
          toast({
            title: "Schedule Created",
            description: "Your scheduled audit has been created successfully.",
          });
        } else {
          throw new Error(response.error || "Failed to create schedule");
        }
      }
      setEditingSchedule(null);
    } catch (error) {
      logger.error("Schedule operation failed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleSchedule = async (id: string) => {
    if (!userId) return;

    try {
      const response = await AivedhaAPI.toggleSchedule(id, userId);
      if (response.success) {
        setSchedules(schedules.map(s =>
          s.id === id ? { ...s, status: response.status === "active" ? "active" : "paused" } : s
        ));
        toast({
          title: response.status === "active" ? "Schedule Resumed" : "Schedule Paused",
          description: `Your scheduled audit has been ${response.status === "active" ? "resumed" : "paused"}.`,
        });
      } else {
        throw new Error("Failed to toggle schedule");
      }
    } catch (error) {
      logger.error("Toggle schedule failed:", error);
      toast({
        title: "Error",
        description: "Failed to update schedule status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show delete confirmation dialog
  const handleDeleteSchedule = (schedule: ScheduledAudit) => {
    setDeleteConfirm({ isOpen: true, schedule, isDeleting: false });
  };

  // Confirm and execute deletion
  const handleConfirmDelete = async () => {
    if (!userId || !deleteConfirm.schedule) return;

    setDeleteConfirm(prev => ({ ...prev, isDeleting: true }));

    try {
      const response = await AivedhaAPI.deleteSchedule(deleteConfirm.schedule.id, userId);
      if (response.success) {
        setSchedules(schedules.filter(s => s.id !== deleteConfirm.schedule?.id));
        toast({
          title: "Schedule Deleted",
          description: "Your scheduled audit has been deleted successfully.",
        });
        setDeleteConfirm({ isOpen: false, schedule: null, isDeleting: false });
      } else {
        throw new Error("Failed to delete schedule");
      }
    } catch (error) {
      logger.error("Delete schedule failed:", error);
      toast({
        title: "Error",
        description: "Failed to delete schedule. Please try again.",
        variant: "destructive",
      });
      setDeleteConfirm(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Run audit immediately
  const handleRunNow = async (schedule: ScheduledAudit) => {
    if (!userId || runningNow) return;

    setRunningNow(schedule.id);

    try {
      // Trigger immediate audit via API
      const response = await AivedhaAPI.startAudit({
        url: schedule.url,
        userId,
        userEmail: userId, // userId is email in this context
      });

      if (response.success || response.report_id) {
        toast({
          title: "Audit Started",
          description: `Security audit for ${schedule.domain} has been initiated.`,
        });

        // Update last run time locally
        setSchedules(schedules.map(s =>
          s.id === schedule.id
            ? { ...s, lastRun: new Date().toISOString(), creditsUsed: s.creditsUsed + 1 }
            : s
        ));

        // Update credits remaining
        setSubscription(prev => ({
          ...prev,
          creditsRemaining: Math.max(0, prev.creditsRemaining - 1)
        }));
      } else {
        throw new Error(response.error || "Failed to start audit");
      }
    } catch (error) {
      logger.error("Run now failed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start audit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRunningNow(null);
    }
  };

  const handleEditSchedule = (schedule: ScheduledAudit) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  // Set page title
  useEffect(() => {
    document.title = "Scheduled Audits | AiVedha Guard";
  }, []);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-violet-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading scheduler...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="mb-8"
          >
            <motion.div variants={fadeInUp} className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <CalendarClock className="w-8 h-8 text-violet-500" />
                  Scheduled Audits
                </h1>
                <p className="text-muted-foreground mt-1">
                  Automate your security audits with scheduled scans
                </p>
              </div>

              {isAddonActive && (
                <Button
                  onClick={() => {
                    setEditingSchedule(null);
                    setIsModalOpen(true);
                  }}
                  disabled={!canCreateSchedule}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Schedule
                </Button>
              )}
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <motion.div variants={fadeInUp}>
              <StatsCard
                icon={Calendar}
                label="Active Schedules"
                value={`${activeSchedules}/${subscription.maxSchedulers}`}
                color="bg-violet-500/10 text-violet-500"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatsCard
                icon={Coins}
                label="Credits Available"
                value={subscription.creditsRemaining}
                color="bg-amber-500/10 text-amber-500"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatsCard
                icon={CheckCircle2}
                label="Addon Status"
                value={isAddonActive ? "Active" : "Inactive"}
                color={isAddonActive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatsCard
                icon={Shield}
                label="Plan"
                value={(subscription.currentPlanId?.charAt(0).toUpperCase() ?? '') + (subscription.currentPlanId?.slice(1) ?? '') || "None"}
                color="bg-blue-500/10 text-blue-500"
              />
            </motion.div>
          </motion.div>

          {/* Timezone Indicator */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="mb-6"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-4 py-2 rounded-lg w-fit">
              <MapPin className="w-4 h-4" />
              <span>All times shown in your local timezone:</span>
              <span className="font-medium text-foreground">{userTimezone}</span>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="relative"
          >
            <Card className="bg-card/50 border-border/50 overflow-hidden">
              <CardHeader className="border-b border-border/30">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  Your Scheduled Audits
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 relative min-h-[400px]">
                {/* Free Plan Overlay */}
                {isFreePlan && <FreePlanOverlay onUpgrade={() => window.location.href = "/pricing"} />}

                {/* Addon Disabled Overlay */}
                {!isFreePlan && !isAddonActive && <AddonDisabledOverlay onUpgrade={() => window.location.href = "/pricing"} />}

                {/* Schedules Grid */}
                {isAddonActive && (
                  <>
                    {schedules.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                          <CalendarClock className="w-10 h-10 text-violet-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No Schedules Yet</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          Create your first scheduled audit to automate your security monitoring.
                        </p>
                        <Button
                          onClick={() => {
                            setEditingSchedule(null);
                            setIsModalOpen(true);
                          }}
                          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First Schedule
                        </Button>
                      </div>
                    ) : (
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="grid md:grid-cols-2 gap-4"
                      >
                        {schedules.map(schedule => (
                          <ScheduleCard
                            key={schedule.id}
                            schedule={schedule}
                            onEdit={() => handleEditSchedule(schedule)}
                            onDelete={() => handleDeleteSchedule(schedule)}
                            onToggle={() => handleToggleSchedule(schedule.id)}
                            onRunNow={() => handleRunNow(schedule)}
                            disabled={!isAddonActive}
                            isRunning={runningNow === schedule.id}
                            hasCredits={subscription.creditsRemaining > 0}
                          />
                        ))}
                      </motion.div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Info Section */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="mt-8"
          >
            <Card className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border-violet-200 dark:border-violet-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Info className="w-6 h-6 text-violet-500 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">How Scheduled Audits Work</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Each scheduled audit consumes 1 credit per execution</li>
                      <li>• Schedules automatically pause if credits are exhausted</li>
                      <li>• Maximum 1 active scheduler per Scheduled Audits addon</li>
                      <li>• Results are emailed and saved to your dashboard</li>
                      <li>• Addon expiry removes all scheduled automations</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <ScheduleModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingSchedule(null);
            }}
            onSubmit={handleCreateSchedule}
            editData={editingSchedule}
            creditsRemaining={subscription.creditsRemaining}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirm.isOpen && deleteConfirm.schedule && (
          <DeleteConfirmDialog
            isOpen={deleteConfirm.isOpen}
            onClose={() => setDeleteConfirm({ isOpen: false, schedule: null, isDeleting: false })}
            onConfirm={handleConfirmDelete}
            scheduleDomain={deleteConfirm.schedule.domain}
            isDeleting={deleteConfirm.isDeleting}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}
