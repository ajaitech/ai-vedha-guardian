import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  CreditCard,
  Percent,
  Package,
  Save,
  Sparkles,
  Crown,
  Check,
  X,
  ArrowUpDown
} from 'lucide-react';

const API_URL = import.meta.env.PROD
  ? 'https://api.aivedha.ai/api'
  : '/api';

interface Plan {
  plan_id: string;
  plan_code: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: string;
  billing_cycle_count: number;
  credits: number;
  features: string[];
  highlight: boolean;
  popular: boolean;
  display_order: number;
  status: string;
  trial_days: number;
  paypal_plan_id?: string;
  created_at: string;
}

interface Coupon {
  coupon_id: string;
  coupon_code: string;
  name: string;
  description: string;
  discount_type: string;
  discount_value: number;
  max_discount: number;
  min_order_value: number;
  max_uses: number;
  current_uses: number;
  max_uses_per_user: number;
  expiry_date: string;
  applicable_plans: string[];
  status: string;
  created_at: string;
}

interface Addon {
  addon_id: string;
  addon_code: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_type: string;
  unit: string;
  quantity: number;
  features: string[];
  applicable_plans: string[];
  display_order: number;
  status: string;
  created_at: string;
}

const BillingManagement = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('plans');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Data
  const [plans, setPlans] = useState<Plan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);

  // Dialog states
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

  // Form states
  const [planForm, setPlanForm] = useState<Partial<Plan>>({});
  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({});
  const [addonForm, setAddonForm] = useState<Partial<Addon>>({});
  const [featuresInput, setFeaturesInput] = useState('');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/billing/plans`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans || []);
      }
    } catch (error) {
      logger.error('Error fetching plans:', error);
    }
  }, [getAuthHeaders]);

  const fetchCoupons = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/billing/coupons`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setCoupons(data.coupons || []);
      }
    } catch (error) {
      logger.error('Error fetching coupons:', error);
    }
  }, [getAuthHeaders]);

  const fetchAddons = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/billing/addons`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setAddons(data.addons || []);
      }
    } catch (error) {
      logger.error('Error fetching addons:', error);
    }
  }, [getAuthHeaders]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPlans(), fetchCoupons(), fetchAddons()]);
    } finally {
      setLoading(false);
    }
  }, [fetchPlans, fetchCoupons, fetchAddons]);

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRefreshPlans = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${API_URL}/billing/refresh`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type: 'all' })
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Refresh Complete',
          description: `Refreshed ${data.results?.plans_count || 0} plans, ${data.results?.coupons_count || 0} coupons, ${data.results?.addons_count || 0} addons`
        });
        fetchAllData();
      } else {
        toast({
          title: 'Refresh Error',
          description: data.message || 'Failed to refresh billing data',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh billing data',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Plan CRUD
  const openPlanDialog = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm(plan);
      setFeaturesInput(plan.features?.join('\n') || '');
    } else {
      setEditingPlan(null);
      setPlanForm({
        plan_code: '',
        name: '',
        description: '',
        price: 0,
        currency: 'USD',
        billing_cycle: 'monthly',
        billing_cycle_count: 1,
        credits: 10,
        features: [],
        highlight: false,
        popular: false,
        display_order: 99,
        status: 'active',
        trial_days: 0
      });
      setFeaturesInput('');
    }
    setPlanDialogOpen(true);
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      const planData = {
        ...planForm,
        features: featuresInput.split('\n').filter(f => f.trim())
      };

      const method = editingPlan ? 'PUT' : 'POST';
      const response = await fetch(`${API_URL}/billing/plans`, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(editingPlan ? { ...planData, plan_id: editingPlan.plan_id } : planData)
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Plan ${editingPlan ? 'updated' : 'created'} successfully`
        });
        setPlanDialogOpen(false);
        fetchPlans();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to save plan',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save plan',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const response = await fetch(`${API_URL}/billing/plans`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan_id: planId })
      });
      const data = await response.json();

      if (data.success) {
        toast({ title: 'Success', description: 'Plan deleted successfully' });
        fetchPlans();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete plan', variant: 'destructive' });
    }
  };

  // Coupon CRUD
  const openCouponDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm(coupon);
    } else {
      setEditingCoupon(null);
      setCouponForm({
        coupon_code: '',
        name: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        max_discount: 0,
        min_order_value: 0,
        max_uses: 0,
        max_uses_per_user: 1,
        expiry_date: '',
        applicable_plans: [],
        status: 'active'
      });
    }
    setCouponDialogOpen(true);
  };

  const saveCoupon = async () => {
    setSaving(true);
    try {
      const method = editingCoupon ? 'PUT' : 'POST';
      const response = await fetch(`${API_URL}/billing/coupons`, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(editingCoupon ? { ...couponForm, coupon_id: editingCoupon.coupon_id } : couponForm)
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Coupon ${editingCoupon ? 'updated' : 'created'} successfully`
        });
        setCouponDialogOpen(false);
        fetchCoupons();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to save coupon',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save coupon',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const response = await fetch(`${API_URL}/billing/coupons`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ coupon_id: couponId })
      });
      const data = await response.json();

      if (data.success) {
        toast({ title: 'Success', description: 'Coupon deleted successfully' });
        fetchCoupons();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete coupon', variant: 'destructive' });
    }
  };

  // Addon CRUD
  const openAddonDialog = (addon?: Addon) => {
    if (addon) {
      setEditingAddon(addon);
      setAddonForm(addon);
      setFeaturesInput(addon.features?.join('\n') || '');
    } else {
      setEditingAddon(null);
      setAddonForm({
        addon_code: '',
        name: '',
        description: '',
        price: 0,
        currency: 'USD',
        billing_type: 'one_time',
        unit: 'credits',
        quantity: 10,
        features: [],
        applicable_plans: [],
        display_order: 99,
        status: 'active'
      });
      setFeaturesInput('');
    }
    setAddonDialogOpen(true);
  };

  const saveAddon = async () => {
    setSaving(true);
    try {
      const addonData = {
        ...addonForm,
        features: featuresInput.split('\n').filter(f => f.trim())
      };

      const method = editingAddon ? 'PUT' : 'POST';
      const response = await fetch(`${API_URL}/billing/addons`, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(editingAddon ? { ...addonData, addon_id: editingAddon.addon_id } : addonData)
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Addon ${editingAddon ? 'updated' : 'created'} successfully`
        });
        setAddonDialogOpen(false);
        fetchAddons();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to save addon',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save addon',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAddon = async (addonId: string) => {
    if (!confirm('Are you sure you want to delete this addon?')) return;

    try {
      const response = await fetch(`${API_URL}/billing/addons`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ addon_id: addonId })
      });
      const data = await response.json();

      if (data.success) {
        toast({ title: 'Success', description: 'Addon deleted successfully' });
        fetchAddons();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete addon', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing Management</h1>
          <p className="text-muted-foreground">
            Manage subscription plans, coupons, and addons - PayPal payments (USD)
          </p>
        </div>
        <button onClick={handleRefreshPlans} disabled={syncing} className="btn-secondary px-4 py-2">
          {syncing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Data
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Plans ({plans.length})
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Coupons ({coupons.length})
          </TabsTrigger>
          <TabsTrigger value="addons" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Addons ({addons.length})
          </TabsTrigger>
        </TabsList>

        {/* PLANS TAB */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openPlanDialog()} className="btn-primary px-4 py-2 rounded-xl inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.plan_id}>
                      <TableCell>{plan.display_order}</TableCell>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell className="font-mono text-sm">{plan.plan_code}</TableCell>
                      <TableCell>${plan.price} {plan.currency}</TableCell>
                      <TableCell>{plan.billing_cycle}</TableCell>
                      <TableCell>{plan.credits}</TableCell>
                      <TableCell>
                        <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                          {plan.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-1">
                        {plan.popular && <Badge variant="outline"><Crown className="h-3 w-3" /></Badge>}
                        {plan.highlight && <Badge variant="outline"><Sparkles className="h-3 w-3" /></Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button className="btn-ghost p-2" onClick={() => openPlanDialog(plan)}>
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="btn-ghost p-2" onClick={() => deletePlan(plan.plan_id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {plans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No plans found. Create your first plan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COUPONS TAB */}
        <TabsContent value="coupons" className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openCouponDialog()} className="btn-primary px-4 py-2 rounded-xl inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Coupon
            </button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.coupon_id}>
                      <TableCell className="font-mono font-medium">{coupon.coupon_code}</TableCell>
                      <TableCell>{coupon.name}</TableCell>
                      <TableCell>
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : `$${coupon.discount_value}`}
                      </TableCell>
                      <TableCell>
                        {coupon.current_uses} / {coupon.max_uses === 0 ? 'Unlimited' : coupon.max_uses}
                      </TableCell>
                      <TableCell>
                        {coupon.expiry_date
                          ? new Date(coupon.expiry_date).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={coupon.status === 'active' ? 'default' : 'secondary'}>
                          {coupon.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button className="btn-ghost p-2" onClick={() => openCouponDialog(coupon)}>
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="btn-ghost p-2" onClick={() => deleteCoupon(coupon.coupon_id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {coupons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No coupons found. Create your first coupon.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADDONS TAB */}
        <TabsContent value="addons" className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openAddonDialog()} className="btn-primary px-4 py-2 rounded-xl inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Addon
            </button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addons.map((addon) => (
                    <TableRow key={addon.addon_id}>
                      <TableCell>{addon.display_order}</TableCell>
                      <TableCell className="font-medium">{addon.name}</TableCell>
                      <TableCell className="font-mono text-sm">{addon.addon_code}</TableCell>
                      <TableCell>${addon.price} {addon.currency}</TableCell>
                      <TableCell>{addon.billing_type}</TableCell>
                      <TableCell>{addon.quantity} {addon.unit}</TableCell>
                      <TableCell>
                        <Badge variant={addon.status === 'active' ? 'default' : 'secondary'}>
                          {addon.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button className="btn-ghost p-2" onClick={() => openAddonDialog(addon)}>
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="btn-ghost p-2" onClick={() => deleteAddon(addon.addon_id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {addons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No addons found. Create your first addon.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Update plan details' : 'Add a new subscription plan'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan Code</Label>
                <Input
                  value={planForm.plan_code || ''}
                  onChange={(e) => setPlanForm({...planForm, plan_code: e.target.value})}
                  placeholder="starter-monthly"
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={planForm.name || ''}
                  onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                  placeholder="Starter Plan"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={planForm.description || ''}
                onChange={(e) => setPlanForm({...planForm, description: e.target.value})}
                placeholder="Plan description..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  value={planForm.price || 0}
                  onChange={(e) => setPlanForm({...planForm, price: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value="USD" disabled>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Cycle</Label>
                <Select value={planForm.billing_cycle || 'monthly'} onValueChange={(v) => setPlanForm({...planForm, billing_cycle: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Credits (-1 for unlimited)</Label>
                <Input
                  type="number"
                  value={planForm.credits ?? 10}
                  onChange={(e) => setPlanForm({...planForm, credits: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Trial Days</Label>
                <Input
                  type="number"
                  value={planForm.trial_days || 0}
                  onChange={(e) => setPlanForm({...planForm, trial_days: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={planForm.display_order || 99}
                  onChange={(e) => setPlanForm({...planForm, display_order: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <Label>Features (one per line)</Label>
              <Textarea
                value={featuresInput}
                onChange={(e) => setFeaturesInput(e.target.value)}
                placeholder="10 Security Audits per month&#10;PDF Reports&#10;Email Support"
                rows={4}
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={planForm.popular || false}
                  onCheckedChange={(v) => setPlanForm({...planForm, popular: v})}
                />
                <Label>Popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={planForm.highlight || false}
                  onCheckedChange={(v) => setPlanForm({...planForm, highlight: v})}
                />
                <Label>Highlight</Label>
              </div>
              <div className="flex items-center gap-2">
                <Select value={planForm.status || 'active'} onValueChange={(v) => setPlanForm({...planForm, status: v})}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button className="btn-secondary px-4 py-2" onClick={() => setPlanDialogOpen(false)}>Cancel</button>
            <button className="btn-primary px-4 py-2" onClick={savePlan} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Plan
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coupon Dialog */}
      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? 'Update coupon details' : 'Add a new discount coupon'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Coupon Code</Label>
                <Input
                  value={couponForm.coupon_code || ''}
                  onChange={(e) => setCouponForm({...couponForm, coupon_code: e.target.value.toUpperCase()})}
                  placeholder="SUMMER20"
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={couponForm.name || ''}
                  onChange={(e) => setCouponForm({...couponForm, name: e.target.value})}
                  placeholder="Summer Sale"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={couponForm.description || ''}
                onChange={(e) => setCouponForm({...couponForm, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select value={couponForm.discount_type || 'percentage'} onValueChange={(v) => setCouponForm({...couponForm, discount_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  value={couponForm.discount_value || 0}
                  onChange={(e) => setCouponForm({...couponForm, discount_value: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <Label>Max Discount (0 = no cap)</Label>
                <Input
                  type="number"
                  value={couponForm.max_discount || 0}
                  onChange={(e) => setCouponForm({...couponForm, max_discount: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Max Uses (0 = unlimited)</Label>
                <Input
                  type="number"
                  value={couponForm.max_uses || 0}
                  onChange={(e) => setCouponForm({...couponForm, max_uses: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Per User Limit</Label>
                <Input
                  type="number"
                  value={couponForm.max_uses_per_user || 1}
                  onChange={(e) => setCouponForm({...couponForm, max_uses_per_user: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={couponForm.expiry_date?.split('T')[0] || ''}
                  onChange={(e) => setCouponForm({...couponForm, expiry_date: e.target.value})}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select value={couponForm.status || 'active'} onValueChange={(v) => setCouponForm({...couponForm, status: v})}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <button className="btn-secondary px-4 py-2" onClick={() => setCouponDialogOpen(false)}>Cancel</button>
            <button className="btn-primary px-4 py-2" onClick={saveCoupon} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Coupon
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Addon Dialog */}
      <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAddon ? 'Edit Addon' : 'Create Addon'}</DialogTitle>
            <DialogDescription>
              {editingAddon ? 'Update addon details' : 'Add a new addon product'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Addon Code</Label>
                <Input
                  value={addonForm.addon_code || ''}
                  onChange={(e) => setAddonForm({...addonForm, addon_code: e.target.value})}
                  placeholder="extra-credits-10"
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={addonForm.name || ''}
                  onChange={(e) => setAddonForm({...addonForm, name: e.target.value})}
                  placeholder="Extra Credits Pack"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={addonForm.description || ''}
                onChange={(e) => setAddonForm({...addonForm, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  value={addonForm.price || 0}
                  onChange={(e) => setAddonForm({...addonForm, price: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value="USD" disabled>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Type</Label>
                <Select value={addonForm.billing_type || 'one_time'} onValueChange={(v) => setAddonForm({...addonForm, billing_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={addonForm.quantity || 1}
                  onChange={(e) => setAddonForm({...addonForm, quantity: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={addonForm.unit || 'credits'}
                  onChange={(e) => setAddonForm({...addonForm, unit: e.target.value})}
                  placeholder="credits, scans, etc."
                />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={addonForm.display_order || 99}
                  onChange={(e) => setAddonForm({...addonForm, display_order: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <Label>Features (one per line)</Label>
              <Textarea
                value={featuresInput}
                onChange={(e) => setFeaturesInput(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-4">
              <Select value={addonForm.status || 'active'} onValueChange={(v) => setAddonForm({...addonForm, status: v})}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <button className="btn-secondary px-4 py-2" onClick={() => setAddonDialogOpen(false)}>Cancel</button>
            <button className="btn-primary px-4 py-2" onClick={saveAddon} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Addon
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingManagement;
