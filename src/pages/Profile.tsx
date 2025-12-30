import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { logger } from "@/lib/logger";
import {
  User,
  Mail,
  CreditCard,
  Calendar,
  Crown,
  Trash2,
  AlertTriangle,
  Bell,
  Lock,
  LogOut,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  MapPin,
  Building2,
  Briefcase,
  Save,
  Edit2,
  Phone,
  Globe
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AivedhaAPI from "@/lib/api";
import AccountDeletionDialog from "@/components/AccountDeletionDialog";
import APIKeyCard from "@/components/profile/APIKeyCard";
import { isValidUrl, isValidEmail, isValidPhone, sanitizePhoneInput } from "@/utils/validation";

interface UserProfile {
  email: string;
  fullName?: string;
  name?: string;
  picture?: string;
  plan: string;
  credits: number | string;
  joinDate?: string;
  phone?: string;
  // Address fields
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  // Employment fields
  employment?: {
    jobTitle?: string;
    company?: string;
    industry?: string;
  };
  // Organization fields
  organization?: {
    name?: string;
    size?: string;
    website?: string;
  };
  subscription?: {
    status: string;
    renewalDate?: string;
    autoRenew: boolean;
    subscriptionId?: string;
  };
}

// Industry options for dropdown
const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance & Banking",
  "Healthcare",
  "E-commerce & Retail",
  "Education",
  "Government",
  "Manufacturing",
  "Media & Entertainment",
  "Real Estate",
  "Consulting",
  "Non-profit",
  "Other"
];

// Organization size options
const ORG_SIZE_OPTIONS = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees"
];

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { credits: contextCredits } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingEmployment, setIsEditingEmployment] = useState(false);
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Form data for editable fields
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
  });
  const [addressForm, setAddressForm] = useState({
    street: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  });
  const [employmentForm, setEmploymentForm] = useState({
    jobTitle: '',
    company: '',
    industry: '',
  });
  const [orgForm, setOrgForm] = useState({
    name: '',
    size: '',
    website: '',
  });

  // Cache localStorage access to avoid repeated parsing
  const cachedUserData = useMemo(() => {
    const userStr = localStorage.getItem("currentUser");
    return userStr ? JSON.parse(userStr) : null;
  }, []); // Only parse once on mount

  // Debounced form update handlers to reduce re-renders during typing
  const debouncedProfileUpdate = useDebouncedCallback((field: string, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  }, 300);

  const debouncedAddressUpdate = useDebouncedCallback((field: string, value: string) => {
    setAddressForm(prev => ({ ...prev, [field]: value }));
  }, 300);

  const debouncedEmploymentUpdate = useDebouncedCallback((field: string, value: string) => {
    setEmploymentForm(prev => ({ ...prev, [field]: value }));
  }, 300);

  const debouncedOrgUpdate = useDebouncedCallback((field: string, value: string) => {
    setOrgForm(prev => ({ ...prev, [field]: value }));
  }, 300);

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Disable exhaustive-deps for loadUserProfile since it references navigate
  // which could cause infinite loops. The function is only called on mount.

  // Helper function to initialize form data from user profile
  const initializeFormData = useCallback((userData: UserProfile) => {
    setProfileForm({
      fullName: userData.fullName || '',
      phone: userData.phone || '',
    });
    setAddressForm({
      street: userData.address?.street || '',
      city: userData.address?.city || '',
      state: userData.address?.state || '',
      country: userData.address?.country || '',
      postalCode: userData.address?.postalCode || '',
    });
    setEmploymentForm({
      jobTitle: userData.employment?.jobTitle || '',
      company: userData.employment?.company || '',
      industry: userData.employment?.industry || '',
    });
    setOrgForm({
      name: userData.organization?.name || '',
      size: userData.organization?.size || '',
      website: userData.organization?.website || '',
    });
  }, []);

  const loadUserProfile = async () => {
    // Support both email login (authToken) and social login (currentUser only)
    // Social login (Google/GitHub) may only set currentUser without authToken
    if (!cachedUserData) {
      navigate('/login');
      return;
    }

    try {
      const storedUser = cachedUserData;
      const userId = storedUser.identityId || storedUser.email;
      let userData: UserProfile;
      let apiData = null;

      // Try to fetch latest user data from API
      try {
        apiData = await AivedhaAPI.getUserProfile(userId);
      } catch (apiError) {
        logger.warn('Failed to fetch user profile from API, using localStorage:', apiError);
      }

      // Build user data from API response or fallback to localStorage
      if (apiData) {
        userData = {
          email: storedUser.email,
          fullName: apiData.fullName || storedUser.fullName || storedUser.name,
          picture: storedUser.picture,
          plan: apiData.plan || storedUser.plan || 'Aarambh',
          credits: apiData.credits !== undefined ? apiData.credits : (storedUser.credits || 0),
          joinDate: apiData.joinDate || storedUser.joinDate,
          phone: apiData.phone || storedUser.phone,
          address: apiData.address || storedUser.address,
          employment: apiData.employment || storedUser.employment,
          organization: apiData.organization || storedUser.organization,
          subscription: apiData.subscription
        };

        if (apiData.subscription) {
          setAutoRenew(apiData.subscription.autoRenew !== false);
        }
      } else {
        // Use localStorage data as fallback
        userData = {
          email: storedUser.email,
          fullName: storedUser.fullName || storedUser.name,
          picture: storedUser.picture,
          plan: storedUser.plan || 'Aarambh',
          credits: storedUser.credits || 0,
          joinDate: storedUser.joinDate,
          phone: storedUser.phone,
          address: storedUser.address,
          employment: storedUser.employment,
          organization: storedUser.organization,
        };
      }

      setUser(userData);
      initializeFormData(userData);
    } catch (error) {
      logger.error('Critical error loading user profile:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  // Save profile updates to backend and localStorage
  const saveProfileUpdates = async (section: 'profile' | 'address' | 'employment' | 'organization') => {
    if (!user) return;

    setSavingProfile(true);
    try {
      const userStr = localStorage.getItem("currentUser");
      const storedUser = userStr ? JSON.parse(userStr) : {};
      const userId = storedUser.identityId || storedUser.email || user.email;

      let updateData: Partial<UserProfile> = {};

      switch (section) {
        case 'profile':
          // Validate phone format if provided
          if (profileForm.phone && !isValidPhone(profileForm.phone)) {
            toast({
              variant: "destructive",
              title: "Invalid Phone Number",
              description: "Please enter a valid phone number (at least 6 digits).",
            });
            setSavingProfile(false);
            return;
          }
          updateData = { fullName: profileForm.fullName, phone: profileForm.phone };
          break;
        case 'address':
          updateData = { address: addressForm };
          break;
        case 'employment':
          updateData = { employment: employmentForm };
          break;
        case 'organization':
          // Validate organization website URL if provided
          if (orgForm.website && !isValidUrl(orgForm.website)) {
            toast({
              variant: "destructive",
              title: "Invalid Website URL",
              description: "Please enter a valid URL starting with http:// or https://",
            });
            setSavingProfile(false);
            return;
          }
          updateData = { organization: orgForm };
          break;
      }

      // Try to save to backend
      try {
        await AivedhaAPI.updateUserProfile(userId, updateData);
      } catch (apiError) {
        logger.warn('Backend profile update failed, saving locally:', apiError);
      }

      // Update localStorage
      const updatedUser = { ...storedUser, ...updateData };
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      // Update local state
      setUser(prev => prev ? { ...prev, ...updateData } : null);

      // Close edit mode
      switch (section) {
        case 'profile':
          setIsEditingProfile(false);
          break;
        case 'address':
          setIsEditingAddress(false);
          break;
        case 'employment':
          setIsEditingEmployment(false);
          break;
        case 'organization':
          setIsEditingOrg(false);
          break;
      }

      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully."
      });
    } catch (err) {
      logger.error('Profile update error:', err);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Could not save your changes. Please try again."
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Cancel editing and reset form
  const cancelEditing = (section: 'profile' | 'address' | 'employment' | 'organization') => {
    switch (section) {
      case 'profile':
        setProfileForm({
          fullName: user?.fullName || '',
          phone: user?.phone || '',
        });
        setIsEditingProfile(false);
        break;
      case 'address':
        setAddressForm({
          street: user?.address?.street || '',
          city: user?.address?.city || '',
          state: user?.address?.state || '',
          country: user?.address?.country || '',
          postalCode: user?.address?.postalCode || '',
        });
        setIsEditingAddress(false);
        break;
      case 'employment':
        setEmploymentForm({
          jobTitle: user?.employment?.jobTitle || '',
          company: user?.employment?.company || '',
          industry: user?.employment?.industry || '',
        });
        setIsEditingEmployment(false);
        break;
      case 'organization':
        setOrgForm({
          name: user?.organization?.name || '',
          size: user?.organization?.size || '',
          website: user?.organization?.website || '',
        });
        setIsEditingOrg(false);
        break;
    }
  };

  const handleAutoRenewToggle = async (enabled: boolean) => {
    if (!user?.subscription?.subscriptionId) return;

    setProcessing(true);
    try {
      await AivedhaAPI.setAutoRenew(user.subscription.subscriptionId, enabled);
      setAutoRenew(enabled);
      toast({
        title: enabled ? "Auto-renewal enabled" : "Auto-renewal disabled",
        description: enabled
          ? "Your subscription will automatically renew."
          : "Your subscription will expire at the end of the current period."
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Could not update auto-renewal setting. Please try again."
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user?.subscription?.subscriptionId) return;

    setProcessing(true);
    try {
      await AivedhaAPI.cancelSubscription(user.subscription.subscriptionId, true);
      // Update local state
      setUser(prev => prev ? {
        ...prev,
        subscription: {
          ...prev.subscription!,
          status: 'cancelled',
          autoRenew: false
        }
      } : null);
      setCancelDialogOpen(false);

      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled. You'll retain access until the current period ends."
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Cancellation failed",
        description: "Could not cancel subscription. Please contact support."
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const isPremium = user.plan !== 'Free' && user.plan !== 'Aarambh';

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground font-orbitron mb-2">Account Settings</h1>
            <p className="text-muted-foreground">Manage your profile and subscription</p>
          </div>

          {/* Profile Card */}
          <Card className="rounded-3xl border border-border/50 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-primary" />
                  <span>Profile Information</span>
                </div>
                {!isEditingProfile ? (
                  <Button variant="ghost" size="sm" className="px-3 py-1.5" onClick={() => setIsEditingProfile(true)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="px-3 py-1.5" onClick={() => cancelEditing('profile')} disabled={savingProfile}>
                      Cancel
                    </Button>
                    <Button variant="invertPrimary" size="sm" className="px-3 py-1.5" onClick={() => saveProfileUpdates('profile')} disabled={savingProfile}>
                      {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Save
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-6">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt="Profile"
                    className="w-20 h-20 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <User className="h-10 w-10 text-primary" />
                  </div>
                )}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Name</Label>
                      {isEditingProfile ? (
                        <Input
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                          placeholder="Your full name"
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-lg font-medium text-foreground">{user.fullName || 'User'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Phone</Label>
                      {isEditingProfile ? (
                        <Input
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, phone: sanitizePhoneInput(e.target.value) }))}
                          placeholder="+1 (555) 123-4567"
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-foreground flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {user.phone || 'Not provided'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Email</Label>
                    <p className="text-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {user.email}
                    </p>
                  </div>
                  {user.joinDate && (
                    <div>
                      <Label className="text-muted-foreground text-sm">Member Since</Label>
                      <p className="text-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(user.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Card */}
          <Card className="rounded-3xl border border-border/50 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>Address</span>
                </div>
                {!isEditingAddress ? (
                  <Button variant="ghost" size="sm" className="px-3 py-1.5" onClick={() => setIsEditingAddress(true)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="px-3 py-1.5" onClick={() => cancelEditing('address')} disabled={savingProfile}>
                      Cancel
                    </Button>
                    <Button variant="invertPrimary" size="sm" className="px-3 py-1.5" onClick={() => saveProfileUpdates('address')} disabled={savingProfile}>
                      {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Save
                    </Button>
                  </div>
                )}
              </CardTitle>
              <CardDescription>Your billing and contact address</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingAddress ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground text-sm">Street Address</Label>
                    <Input
                      value={addressForm.street}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                      placeholder="123 Main Street, Suite 100"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">City</Label>
                    <Input
                      value={addressForm.city}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="New York"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">State / Province</Label>
                    <Input
                      value={addressForm.state}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="NY"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Country</Label>
                    <Input
                      value={addressForm.country}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, country: e.target.value }))}
                      placeholder="United States"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Postal / ZIP Code</Label>
                    <Input
                      value={addressForm.postalCode}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="10001"
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {user.address?.street || user.address?.city || user.address?.country ? (
                    <>
                      {user.address?.street && <p className="text-foreground">{user.address.street}</p>}
                      <p className="text-foreground">
                        {[user.address?.city, user.address?.state, user.address?.postalCode].filter(Boolean).join(', ')}
                      </p>
                      {user.address?.country && <p className="text-foreground">{user.address.country}</p>}
                    </>
                  ) : (
                    <p className="text-muted-foreground italic">No address provided. Click Edit to add your address.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employment Card */}
          <Card className="rounded-3xl border border-border/50 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <span>Employment</span>
                </div>
                {!isEditingEmployment ? (
                  <Button variant="ghost" size="sm" className="px-3 py-1.5" onClick={() => setIsEditingEmployment(true)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="px-3 py-1.5" onClick={() => cancelEditing('employment')} disabled={savingProfile}>
                      Cancel
                    </Button>
                    <Button variant="invertPrimary" size="sm" className="px-3 py-1.5" onClick={() => saveProfileUpdates('employment')} disabled={savingProfile}>
                      {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Save
                    </Button>
                  </div>
                )}
              </CardTitle>
              <CardDescription>Your professional information</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingEmployment ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Job Title</Label>
                    <Input
                      value={employmentForm.jobTitle}
                      onChange={(e) => setEmploymentForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                      placeholder="Security Engineer"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Company</Label>
                    <Input
                      value={employmentForm.company}
                      onChange={(e) => setEmploymentForm(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Acme Corp"
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground text-sm">Industry</Label>
                    <Select
                      value={employmentForm.industry}
                      onValueChange={(value) => setEmploymentForm(prev => ({ ...prev, industry: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_OPTIONS.map((industry) => (
                          <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {user.employment?.jobTitle || user.employment?.company ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground font-medium">{user.employment?.jobTitle || 'Job title not set'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{user.employment?.company || 'Company not set'}</span>
                      </div>
                      {user.employment?.industry && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{user.employment.industry}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground italic">No employment details provided. Click Edit to add.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organization Card */}
          <Card className="rounded-3xl border border-border/50 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span>Organization</span>
                </div>
                {!isEditingOrg ? (
                  <Button variant="ghost" size="sm" className="px-3 py-1.5" onClick={() => setIsEditingOrg(true)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="px-3 py-1.5" onClick={() => cancelEditing('organization')} disabled={savingProfile}>
                      Cancel
                    </Button>
                    <Button variant="invertPrimary" size="sm" className="px-3 py-1.5" onClick={() => saveProfileUpdates('organization')} disabled={savingProfile}>
                      {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Save
                    </Button>
                  </div>
                )}
              </CardTitle>
              <CardDescription>Your organization details for enterprise features</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingOrg ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Organization Name</Label>
                    <Input
                      value={orgForm.name}
                      onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Acme Corporation"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Organization Size</Label>
                    <Select
                      value={orgForm.size}
                      onValueChange={(value) => setOrgForm(prev => ({ ...prev, size: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORG_SIZE_OPTIONS.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground text-sm">Website</Label>
                    <Input
                      value={orgForm.website}
                      onChange={(e) => setOrgForm(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://example.com"
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {user.organization?.name || user.organization?.size ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground font-medium">{user.organization?.name || 'Organization not set'}</span>
                      </div>
                      {user.organization?.size && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{user.organization.size}</span>
                        </div>
                      )}
                      {user.organization?.website && isValidUrl(user.organization.website) && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a href={user.organization.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {user.organization.website}
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground italic">No organization details provided. Click Edit to add.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Keys Card - For CI/CD Integration (FREE for all users) */}
          <APIKeyCard
            userId={(() => {
              const userStr = localStorage.getItem("currentUser");
              if (userStr) {
                const storedUser = JSON.parse(userStr);
                return storedUser.identityId || storedUser.email || user.email;
              }
              return user.email;
            })()}
          />

          {/* Subscription Card */}
          <Card className="rounded-3xl border border-border/50 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <span>Subscription</span>
                </div>
                <Badge className={isPremium ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white" : "bg-gray-500/10 text-gray-500"}>
                  {user.plan}
                </Badge>
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Credits - use SubscriptionContext as single source of truth */}
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Available Credits</p>
                    <p className="text-sm text-muted-foreground">
                      Credits used for security audits
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {contextCredits}
                </p>
              </div>

              {/* Subscription Status */}
              {user.subscription && (
                <>
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <RefreshCw className="h-6 w-6 text-green-500" />
                      <div>
                        <p className="font-medium text-foreground">Subscription Status</p>
                        <p className="text-sm text-muted-foreground">
                          {user.subscription.status === 'active' ? 'Your subscription is active' :
                           user.subscription.status === 'cancelled' ? 'Cancelled - ends at period end' :
                           'Subscription expired'}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      user.subscription.status === 'active' ? "bg-green-500/10 text-green-500" :
                      user.subscription.status === 'cancelled' ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-red-500/10 text-red-500"
                    }>
                      {user.subscription.status === 'active' ? <CheckCircle className="h-3 w-3 mr-1" /> :
                       <XCircle className="h-3 w-3 mr-1" />}
                      {user.subscription.status}
                    </Badge>
                  </div>

                  {user.subscription.renewalDate && user.subscription.status === 'active' && (
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-6 w-6 text-blue-500" />
                        <div>
                          <p className="font-medium text-foreground">Next Renewal</p>
                          <p className="text-sm text-muted-foreground">Your subscription renews automatically</p>
                        </div>
                      </div>
                      <p className="font-medium text-foreground">
                        {new Date(user.subscription.renewalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  )}

                  {/* Auto-renewal toggle */}
                  {user.subscription.status === 'active' && (
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                      <div className="flex items-center space-x-3">
                        <Bell className="h-6 w-6 text-purple-500" />
                        <div>
                          <p className="font-medium text-foreground">Auto-Renewal</p>
                          <p className="text-sm text-muted-foreground">
                            {autoRenew ? "Subscription will renew automatically" : "Subscription will expire at period end"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={autoRenew}
                        onCheckedChange={handleAutoRenewToggle}
                        disabled={processing}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                {!isPremium && (
                  <Button onClick={() => navigate('/pricing')} variant="invertPrimary" className="px-4 py-2">
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                )}
                {isPremium && user.subscription?.status === 'active' && (
                  <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-2 border-red-500/50 text-red-500 bg-transparent hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300 px-4 py-2">
                        Cancel Subscription
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancel Subscription</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to cancel your subscription? You'll retain access until the end of your current billing period.
                        </DialogDescription>
                      </DialogHeader>
                      <Alert className="border-yellow-500/20 bg-yellow-500/10">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <AlertDescription className="text-yellow-700">
                          After cancellation, you'll lose access to premium features and your plan will revert to Aarambh (free tier).
                        </AlertDescription>
                      </Alert>
                      <DialogFooter>
                        <Button variant="outline" className="px-4 py-2" onClick={() => setCancelDialogOpen(false)}>
                          Keep Subscription
                        </Button>
                        <Button variant="destructive" className="px-4 py-2" onClick={handleCancelSubscription} disabled={processing}>
                          {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Cancel Subscription
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card className="rounded-3xl border border-border/50 shadow-elegant relative z-10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-primary" />
                <span>Security & Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                onClick={handleLogout}
                variant="outline"
                className="w-full flex items-center justify-start gap-2 px-4 py-2.5 rounded-md text-sm font-medium"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>

              <AccountDeletionDialog
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full flex items-center justify-start gap-2 px-4 py-2.5 rounded-md text-sm font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
