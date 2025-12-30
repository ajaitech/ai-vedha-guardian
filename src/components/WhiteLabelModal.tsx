/**
 * AiVedha Guard - White Label Certificate Modal
 * Version: 2.0.0
 *
 * Modal for collecting brand name and domain for white-label certificate addon.
 * Validates domain format and checks against user subscription.
 * IMPORTANT: Domain and Brand Name are NOT editable after purchase.
 * Supports multiple white-label addons per user (up to 20 per single purchase).
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Globe,
  Building2,
  Shield,
  FileCheck,
  Info,
  Sparkles,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

const MAX_ADDONS_PER_PURCHASE = 20;

interface WhiteLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WhiteLabelData[]) => Promise<void>;
  currency?: "USD"; // USD only globally
  price: number;
  existingConfigs?: WhiteLabelData[];
  mode?: "single" | "multiple";
}

interface WhiteLabelData {
  brandName: string;
  domain: string;
  id?: string;
}

interface WhiteLabelEntry {
  id: string;
  brandName: string;
  domain: string;
  validation: {
    brandName: { valid: boolean; message: string };
    domain: { valid: boolean; message: string };
  };
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring" as const, damping: 25, stiffness: 300 }
  },
  exit: { opacity: 0, scale: 0.95, y: 20 }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const validateDomain = (domain: string): { valid: boolean; message: string } => {
  if (!domain.trim()) {
    return { valid: false, message: "Domain is required" };
  }
  
  // Remove protocol if present
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  
  // Domain regex pattern
  const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
  
  if (!domainPattern.test(cleanDomain)) {
    return { valid: false, message: "Please enter a valid domain (e.g., aivedha.ai)" };
  }
  
  return { valid: true, message: "Valid domain format" };
};

const validateBrandName = (name: string): { valid: boolean; message: string } => {
  if (!name.trim()) {
    return { valid: false, message: "Brand name is required" };
  }
  
  if (name.trim().length < 2) {
    return { valid: false, message: "Brand name must be at least 2 characters" };
  }
  
  if (name.trim().length > 50) {
    return { valid: false, message: "Brand name must be less than 50 characters" };
  }
  
  // Allow letters, numbers, spaces, and common brand characters
  const brandPattern = /^[a-zA-Z0-9\s\-_.&]+$/;
  if (!brandPattern.test(name.trim())) {
    return { valid: false, message: "Brand name contains invalid characters" };
  }
  
  return { valid: true, message: "Valid brand name" };
};

const extractDomain = (input: string): string => {
  return input.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0].toLowerCase();
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const generateId = () => `wl_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

const createEmptyEntry = (): WhiteLabelEntry => ({
  id: generateId(),
  brandName: "",
  domain: "",
  validation: {
    brandName: { valid: true, message: "" },
    domain: { valid: true, message: "" },
  },
});

export const WhiteLabelModal: React.FC<WhiteLabelModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currency,
  price,
  existingConfigs = [],
  mode = "multiple",
}) => {
  const [entries, setEntries] = useState<WhiteLabelEntry[]>([createEmptyEntry()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedNonEditable, setConfirmedNonEditable] = useState(true);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (existingConfigs.length > 0) {
        setEntries(
          existingConfigs.map((config) => ({
            id: config.id || generateId(),
            brandName: config.brandName,
            domain: config.domain,
            validation: {
              brandName: validateBrandName(config.brandName),
              domain: validateDomain(config.domain),
            },
          }))
        );
      } else {
        setEntries([createEmptyEntry()]);
      }
      setSubmitError(null);
      setConfirmedNonEditable(true);  // Default checked for better UX
    }
  }, [isOpen, existingConfigs]);

  const updateEntry = (id: string, field: "brandName" | "domain", value: string) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;
        const updated = { ...entry, [field]: value };
        updated.validation = {
          ...entry.validation,
          [field]: field === "brandName" ? validateBrandName(value) : validateDomain(value),
        };
        return updated;
      })
    );
  };

  const addEntry = () => {
    if (entries.length >= MAX_ADDONS_PER_PURCHASE) {
      setSubmitError(`Maximum ${MAX_ADDONS_PER_PURCHASE} white-label addons per purchase`);
      return;
    }
    setEntries((prev) => [...prev, createEmptyEntry()]);
    setSubmitError(null);
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const validateAllEntries = (): boolean => {
    let allValid = true;
    const updatedEntries = entries.map((entry) => {
      const brandValidation = validateBrandName(entry.brandName);
      const domainValidation = validateDomain(entry.domain);
      if (!brandValidation.valid || !domainValidation.valid) {
        allValid = false;
      }
      return {
        ...entry,
        validation: {
          brandName: brandValidation,
          domain: domainValidation,
        },
      };
    });
    setEntries(updatedEntries);

    // Check for duplicate domains
    const domains = entries.map((e) => extractDomain(e.domain).toLowerCase());
    const uniqueDomains = new Set(domains);
    if (domains.length !== uniqueDomains.size) {
      setSubmitError("Duplicate domains are not allowed. Each white-label must have a unique domain.");
      return false;
    }

    return allValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirmedNonEditable) {
      setSubmitError("Please confirm that you understand the configuration cannot be edited after purchase.");
      return;
    }

    if (!validateAllEntries()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const data = entries.map((entry) => ({
        brandName: entry.brandName.trim(),
        domain: extractDomain(entry.domain),
        id: entry.id,
      }));
      await onSubmit(data);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save white label configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (amount: number) => {
    return `$${amount}`; // USD only globally
  };

  const totalPrice = entries.length * price;
  const isViewOnly = existingConfigs.length > 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card className="bg-card border-border/50 shadow-2xl overflow-hidden">
              {/* Header - static, no animations, curved bottom edges */}
              <div className="relative bg-gradient-to-r from-violet-600 to-fuchsia-600 p-6 text-white rounded-b-xl">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4">
                  <FileCheck className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">White Label Certificate</h2>
                    <p className="text-white/80 text-sm mt-1">
                      Brand your audit reports with your company name
                    </p>
                  </div>
                </div>

                {/* Price badge */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  {entries.length > 1 && (
                    <Badge className="bg-white/30 text-white border-0 text-sm px-3 py-1">
                      {entries.length} domains
                    </Badge>
                  )}
                  <Badge className="bg-white/20 text-white border-0 text-sm px-3 py-1">
                    {formatPrice(totalPrice)}/month
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4 overflow-y-auto max-h-[65vh]">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Compact Warning Banner */}
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-400 dark:border-amber-600">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>Note:</strong> Brand name and domain are permanent after purchase.
                    </p>
                  </div>

                  {/* Entries List - Compact */}
                  <div className="space-y-3">
                    {entries.map((entry, index) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-3 bg-muted/30 rounded-lg border border-border relative"
                      >
                        {entries.length > 1 && (
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary" className="text-xs">#{index + 1}</Badge>
                            {!isViewOnly && (
                              <button
                                type="button"
                                onClick={() => removeEntry(entry.id)}
                                className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                                aria-label="Remove"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

                        <div className="grid gap-3 md:grid-cols-2">
                          {/* Brand Name Input - Compact */}
                          <div>
                            <label className="flex items-center gap-1 text-xs font-medium text-foreground mb-1">
                              <Building2 className="w-3 h-3" />
                              Brand Name *
                            </label>
                            <input
                              type="text"
                              value={entry.brandName}
                              onChange={(e) => updateEntry(entry.id, "brandName", e.target.value)}
                              placeholder="Your Company"
                              style={{ backgroundColor: 'white', color: '#1a1a2e' }}
                              className={`w-full px-3 py-2 rounded-lg border text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                                entry.brandName && !entry.validation.brandName.valid
                                  ? "border-red-500 focus:ring-red-500/30"
                                  : entry.brandName && entry.validation.brandName.valid
                                  ? "border-emerald-500 focus:ring-emerald-500/30"
                                  : "border-gray-300 focus:ring-violet-500/30 focus:border-violet-500"
                              }`}
                              disabled={isSubmitting || isViewOnly}
                            />
                            {entry.brandName && !entry.validation.brandName.valid && (
                              <p className="text-xs text-red-500 mt-1">{entry.validation.brandName.message}</p>
                            )}
                            {entry.brandName && entry.validation.brandName.valid && (
                              <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </p>
                            )}
                          </div>

                          {/* Domain Input - Compact */}
                          <div>
                            <label className="flex items-center gap-1 text-xs font-medium text-foreground mb-1">
                              <Globe className="w-3 h-3" />
                              Domain *
                            </label>
                            <input
                              type="text"
                              value={entry.domain}
                              onChange={(e) => updateEntry(entry.id, "domain", e.target.value)}
                              placeholder="yourcompany.com"
                              style={{ backgroundColor: 'white', color: '#1a1a2e' }}
                              className={`w-full px-3 py-2 rounded-lg border text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                                entry.domain && !entry.validation.domain.valid
                                  ? "border-red-500 focus:ring-red-500/30"
                                  : entry.domain && entry.validation.domain.valid
                                  ? "border-emerald-500 focus:ring-emerald-500/30"
                                  : "border-gray-300 focus:ring-violet-500/30 focus:border-violet-500"
                              }`}
                              disabled={isSubmitting || isViewOnly}
                            />
                            {entry.domain && !entry.validation.domain.valid && (
                              <p className="text-xs text-red-500 mt-1">{entry.validation.domain.message}</p>
                            )}
                            {entry.domain && entry.validation.domain.valid && (
                              <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Compact Preview */}
                        {entry.brandName && entry.domain && entry.validation.brandName.valid && entry.validation.domain.valid && (
                          <div className="mt-2 p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xs">
                              {entry.brandName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-foreground">
                              <strong>{entry.brandName}</strong> • {extractDomain(entry.domain)}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Add More button - Compact */}
                  {!isViewOnly && entries.length < MAX_ADDONS_PER_PURCHASE && mode === "multiple" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEntry}
                      className="w-full rounded-lg border-dashed border-primary/30 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Domain ({entries.length}/{MAX_ADDONS_PER_PURCHASE})
                    </Button>
                  )}

                  {/* Compact Confirmation */}
                  {!isViewOnly && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <Checkbox
                        id="confirm-non-editable"
                        checked={confirmedNonEditable}
                        onCheckedChange={(checked) => setConfirmedNonEditable(checked === true)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="confirm-non-editable" className="text-xs text-foreground cursor-pointer">
                        I confirm the configuration is correct and cannot be changed after purchase.
                      </label>
                    </div>
                  )}

                  {/* Error message - Compact */}
                  {submitError && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      {submitError}
                    </div>
                  )}

                  {/* Price Summary - Compact */}
                  {entries.length > 1 && (
                    <div className="flex justify-between items-center p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                      <span className="text-xs font-medium">{entries.length} domains</span>
                      <span className="text-sm font-bold text-violet-600">{formatPrice(totalPrice)}/mo</span>
                    </div>
                  )}

                  {/* Actions - Compact */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onClose}
                      className="flex-1 rounded-lg"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    {!isViewOnly && (
                      <Button
                        type="submit"
                        size="sm"
                        className="flex-1 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                        disabled={
                          isSubmitting ||
                          !confirmedNonEditable ||
                          entries.some((e) => !e.brandName || !e.domain || !e.validation.brandName.valid || !e.validation.domain.valid)
                        }
                      >
                        {isSubmitting ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</>
                        ) : (
                          <><CheckCircle2 className="w-3 h-3 mr-1" />Confirm</>
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WhiteLabelModal;
