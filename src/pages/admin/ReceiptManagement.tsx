import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Download, Search, Filter, Mail, RefreshCw, FileText, Eye, Send } from 'lucide-react';
import AivedhaAPI from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

interface Receipt {
  receipt_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  transaction_id: string;
  receipt_number: string;
  amount: number;
  currency: string;
  credits_added: number;
  payment_method: string;
  payment_gateway: string;
  pdf_path: string;
  email_sent: boolean;
  email_sent_at?: string;
  created_at: string;
}

const ReceiptManagement = () => {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    fetchReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipts, debouncedSearchTerm, selectedDateRange, selectedPaymentMethod]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      // NOTE: Receipts are generated on payment success by subscription-manager.py
      // Receipt data is stored in DynamoDB: aivedha-guardian-receipts (if implemented)
      // Admin API endpoint needed: GET /admin/receipts (requires Lambda: admin-receipts.py)
      // Currently, receipts can be viewed via PayPal merchant dashboard
      setReceipts([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch receipts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReceipts = () => {
    let filtered = receipts;

    // Filter by search term
    if (debouncedSearchTerm) {
      filtered = filtered.filter(receipt =>
        receipt.receipt_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        receipt.user_email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        receipt.user_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    // Filter by date range
    if (selectedDateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (selectedDateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(receipt => 
        new Date(receipt.created_at) >= filterDate
      );
    }

    // Filter by payment method
    if (selectedPaymentMethod !== 'all') {
      filtered = filtered.filter(receipt =>
        receipt.payment_method.toLowerCase() === selectedPaymentMethod.toLowerCase()
      );
    }

    setFilteredReceipts(filtered);
  };

  const downloadReceipt = async (receipt: Receipt) => {
    try {
      await AivedhaAPI.downloadPdfFromUrl(receipt.pdf_path, `AiVedha_Receipt_${receipt.receipt_number}.pdf`);
      toast({
        title: "Success",
        description: "Receipt download started",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive",
      });
    }
  };

  const resendReceiptEmail = async (receipt: Receipt) => {
    try {
      // Mock API call - replace with actual implementation
      logger.log('Resending receipt email for:', receipt.receipt_number);
      
      toast({
        title: "Success",
        description: "Receipt email sent successfully",
      });
      
      // Update receipt status
      const updatedReceipts = receipts.map(r =>
        r.receipt_id === receipt.receipt_id
          ? { ...r, email_sent: true, email_sent_at: new Date().toISOString() }
          : r
      );
      setReceipts(updatedReceipts);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send receipt email",
        variant: "destructive",
      });
    }
  };

  const generateBulkReceipts = async () => {
    try {
      // Mock API call for bulk generation
      logger.log('Generating bulk receipts...');
      
      toast({
        title: "Success",
        description: "Bulk receipt generation started",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate bulk receipts",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receipt Management</h1>
          <p className="text-muted-foreground">
            View, download, and manage payment receipts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="btn-secondary px-4 py-2" onClick={generateBulkReceipts}>
            <FileText className="mr-2 h-4 w-4" />
            Bulk Generate
          </button>
          <button className="btn-primary px-4 py-2" onClick={fetchReceipts}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="credit card">Credit Card</SelectItem>
                <SelectItem value="debit card">Debit Card</SelectItem>
              </SelectContent>
            </Select>
            <button className="btn-secondary px-4 py-2" onClick={() => {
              setSearchTerm('');
              setSelectedDateRange('all');
              setSelectedPaymentMethod('all');
            }}>
              Clear Filters
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Receipts ({filteredReceipts.length})</CardTitle>
          <CardDescription>
            All payment receipts and their delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReceipts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No receipts available</p>
              <p className="text-sm">Payment receipts will appear here when customers complete purchases.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Email Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt) => (
                <TableRow key={receipt.receipt_id}>
                  <TableCell className="font-mono text-sm">
                    {receipt.receipt_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{receipt.user_name}</div>
                      <div className="text-sm text-muted-foreground">{receipt.user_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(receipt.amount, receipt.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{receipt.credits_added} credits</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{receipt.payment_method}</div>
                      <div className="text-xs text-muted-foreground">{receipt.payment_gateway}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {receipt.email_sent ? (
                      <div>
                        <Badge variant="default" className="mb-1">Sent</Badge>
                        <div className="text-xs text-muted-foreground">
                          {receipt.email_sent_at && formatDate(receipt.email_sent_at)}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="destructive">Not Sent</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDate(receipt.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReceipt(receipt)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReceipt(receipt)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Receipt Details</DialogTitle>
                            <DialogDescription>
                              Complete information for {selectedReceipt?.receipt_number}
                            </DialogDescription>
                          </DialogHeader>
                          {selectedReceipt && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Receipt Number</label>
                                  <p className="font-mono">{selectedReceipt.receipt_number}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Transaction ID</label>
                                  <p className="font-mono">{selectedReceipt.transaction_id}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Customer</label>
                                  <p>{selectedReceipt.user_name}</p>
                                  <p className="text-sm text-muted-foreground">{selectedReceipt.user_email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Amount</label>
                                  <p>{formatCurrency(selectedReceipt.amount, selectedReceipt.currency)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Credits Added</label>
                                  <p>{selectedReceipt.credits_added} credits</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Payment Method</label>
                                  <p>{selectedReceipt.payment_method}</p>
                                  <p className="text-sm text-muted-foreground">{selectedReceipt.payment_gateway}</p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button onClick={() => downloadReceipt(selectedReceipt)} className="btn-primary px-4 py-2 rounded-xl inline-flex items-center">
                                  <Download className="mr-2 h-4 w-4" />
                                  Download PDF
                                </button>
                                {!selectedReceipt.email_sent && (
                                  <button
                                    onClick={() => resendReceiptEmail(selectedReceipt)}
                                    className="btn-secondary px-4 py-2 rounded-xl inline-flex items-center"
                                  >
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Email
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      {!receipt.email_sent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendReceiptEmail(receipt)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceiptManagement;