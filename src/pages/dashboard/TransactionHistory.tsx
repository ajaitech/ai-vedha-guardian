import { useState, useEffect, useMemo } from "react";
import { logger } from "@/lib/logger";
import { isValidUrl } from "@/utils/validation";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import AivedhaAPI from "@/lib/api";
import SubscriptionAPI from "@/lib/subscription-api";
import { APP_CONFIG } from "@/config";
import {
  ArrowLeft,
  Loader2,
  Receipt,
  CreditCard,
  Download,
  FileText,
  Lock,
  LogIn,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Zap,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  DollarSign,
  Coins,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Transaction {
  transaction_id: string;
  type: 'subscription' | 'credits' | 'addon' | 'audit' | 'refund';
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  amount?: number;
  currency?: string;
  credits?: number;
  description: string;
  plan?: string;
  created_at: string;
  details?: Record<string, unknown>;
}

interface Invoice {
  id: string;
  invoiceId?: string;
  invoiceNumber?: string;
  date: string;
  amount: string | number;
  currency: string;
  status: string;
  pdfUrl?: string;
}

interface CreditTransaction {
  transaction_id: string;
  credits_added: number;
  addon_code: string;
  timestamp: string;
}

export default function TransactionHistory() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Sorting state
  const [sortField, setSortField] = useState<'date' | 'amount' | 'type'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load user data and transactions
  useEffect(() => {
    const abortController = new AbortController();

    const loadData = async () => {
      try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          const email = user.email;
          setUserEmail(email);

          // Load all data in parallel
          await Promise.all([
            loadTransactions(email),
            loadInvoices(email),
            loadCreditHistory(email),
          ]);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          logger.error('Error loading data:', err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      abortController.abort();
    };
  }, []);

  const loadTransactions = async (email: string) => {
    try {
      const response = await AivedhaAPI.getTransactionHistory(email);
      if (response.transactions) {
        setTransactions(response.transactions);
      }
    } catch (err) {
      logger.error('Error loading transactions:', err);
      // Transaction endpoint error - fail silently as it may not be implemented yet
      toast({
        variant: "destructive",
        title: "Transaction History Unavailable",
        description: "Unable to load transaction history. Please try again later.",
      });
    }
  };

  const loadInvoices = async (_email: string) => {
    try {
      const response = await SubscriptionAPI.getInvoices();
      if (response.invoices) {
        // Map invoiceId to id for compatibility
        setInvoices(response.invoices.map(inv => ({
          ...inv,
          id: inv.invoiceId,
          amount: inv.amount,
        })));
      }
    } catch (err) {
      logger.error('Error loading invoices:', err);
    }
  };

  const loadCreditHistory = async (email: string) => {
    try {
      const response = await AivedhaAPI.getCreditHistory(email);
      if (response.history) {
        setCreditHistory(response.history);
      }
    } catch (err) {
      logger.error('Error loading credit history:', err);
    }
  };

  const handleRefresh = async () => {
    if (!userEmail) return;
    setRefreshing(true);
    await Promise.all([
      loadTransactions(userEmail),
      loadInvoices(userEmail),
      loadCreditHistory(userEmail),
    ]);
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Transaction history has been updated.",
    });
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    if (invoice.pdfUrl) {
      // Validate URL before opening to prevent XSS attacks
      if (!isValidUrl(invoice.pdfUrl)) {
        toast({
          variant: "destructive",
          title: "Invalid Invoice URL",
          description: "The invoice URL is not valid. Please contact support.",
        });
        return;
      }

      window.open(invoice.pdfUrl, '_blank', 'noopener,noreferrer');
      toast({
        title: "Download Started",
        description: "Your invoice is being downloaded.",
      });
    } else {
      toast({
        title: "PDF Not Available",
        description: "Invoice PDF is not available for this transaction.",
        variant: "destructive",
      });
    }
  };

  // Combine all transactions into a unified list with efficient deduplication
  const getAllTransactions = useMemo((): Transaction[] => {
    const combined: Transaction[] = [...transactions];
    const seenIds = new Set(transactions.map(t => t.transaction_id));

    // Add invoices as transactions with efficient Set-based deduplication
    invoices.forEach(invoice => {
      const invoiceId = invoice.invoiceId || invoice.id;
      if (!seenIds.has(invoiceId)) {
        seenIds.add(invoiceId);
        combined.push({
          transaction_id: invoiceId,
          type: 'subscription',
          status: invoice.status === 'paid' ? 'completed' : 'pending',
          amount: typeof invoice.amount === 'string' ? parseFloat(invoice.amount) : invoice.amount,
          currency: invoice.currency || 'USD',
          description: `Subscription Payment - Invoice ${invoice.invoiceNumber || invoice.id}`,
          created_at: invoice.date,
          details: { pdfUrl: invoice.pdfUrl, invoiceNumber: invoice.invoiceNumber },
        });
      }
    });

    // Add credit history as transactions with efficient Set-based deduplication
    creditHistory.forEach(credit => {
      if (!seenIds.has(credit.transaction_id)) {
        seenIds.add(credit.transaction_id);
        combined.push({
          transaction_id: credit.transaction_id,
          type: 'credits',
          status: 'completed',
          credits: credit.credits_added,
          description: `Credit Pack Purchase - ${credit.addon_code}`,
          created_at: credit.timestamp,
        });
      }
    });

    // Sort by date descending
    return combined.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [transactions, invoices, creditHistory]);

  // Filter and sort transactions with memoization to prevent recreation on every render
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = getAllTransactions;

    // Apply filters
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'date':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'amount':
          compareValue = (a.amount || 0) - (b.amount || 0);
          break;
        case 'type':
          compareValue = a.type.localeCompare(b.type);
          break;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });
  }, [getAllTransactions, filterType, filterStatus, sortField, sortDirection]);

  // Paginate filtered transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, endIndex);
  }, [filteredAndSortedTransactions, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterStatus, sortField, sortDirection]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" /> Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" /> Failed
          </Badge>
        );
      case 'refunded':
        return (
          <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">
            <RefreshCw className="h-3 w-3 mr-1" /> Refunded
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'subscription':
        return <CreditCard className="h-5 w-5 text-blue-500" />;
      case 'credits':
        return <Coins className="h-5 w-5 text-amber-500" />;
      case 'addon':
        return <Zap className="h-5 w-5 text-purple-500" />;
      case 'audit':
        return <Shield className="h-5 w-5 text-cyan-500" />;
      case 'refund':
        return <ArrowDownRight className="h-5 w-5 text-red-500" />;
      default:
        return <Receipt className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeBgColor = (type: string) => {
    switch (type) {
      case 'subscription':
        return 'bg-blue-500/10';
      case 'credits':
        return 'bg-amber-500/10';
      case 'addon':
        return 'bg-purple-500/10';
      case 'audit':
        return 'bg-cyan-500/10';
      case 'refund':
        return 'bg-red-500/10';
      default:
        return 'bg-gray-500/10';
    }
  };

  const formatAmount = (amount?: number, currency?: string, credits?: number) => {
    if (credits !== undefined && credits > 0) {
      return `+${credits} Credits`;
    }
    if (amount !== undefined) {
      return `${currency || 'USD'} ${amount.toFixed(2)}`;
    }
    return '-';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate summary stats
  const totalSpent = filteredTransactions
    .filter(t => t.status === 'completed' && t.amount && t.type !== 'refund')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalCredits = filteredTransactions
    .filter(t => t.status === 'completed' && t.credits)
    .reduce((sum, t) => sum + (t.credits || 0), 0);

  return (
    <Layout>
      <div className="min-h-screen py-8 px-4 bg-gradient-to-b from-background to-primary/5">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="px-3 py-1.5">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground font-orbitron mb-2">
                  Transaction History
                </h1>
                <p className="text-muted-foreground">
                  View your payment history, invoices, and credit transactions
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </motion.div>

          {/* Loading State */}
          {loading && (
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading transaction history...</p>
              </CardContent>
            </Card>
          )}

          {/* Not Logged In State */}
          {!loading && !userEmail && (
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Sign In Required</h2>
                <p className="text-muted-foreground mb-6 text-center max-w-md">
                  Please sign in to view your transaction history.
                </p>
                <Link to="/login">
                  <Button className="bg-gradient-to-r from-primary to-accent text-white">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {!loading && userEmail && (
            <>
              {/* Summary Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
              >
                <Card className="bg-card/80 backdrop-blur-md border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Spent</p>
                        <p className="text-xl font-bold text-foreground">
                          ${totalSpent.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-md border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                        <Coins className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Credits Purchased</p>
                        <p className="text-xl font-bold text-foreground">
                          {totalCredits}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-md border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Transactions</p>
                        <p className="text-xl font-bold text-foreground">
                          {filteredAndSortedTransactions.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Filters */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex flex-wrap gap-4 mb-6"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Filters:</span>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="subscription">Subscriptions</SelectItem>
                    <SelectItem value="credits">Credits</SelectItem>
                    <SelectItem value="addon">Add-ons</SelectItem>
                    <SelectItem value="refund">Refunds</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sorting Controls */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <Select value={sortField} onValueChange={(value) => setSortField(value as 'date' | 'amount' | 'type')}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="h-9 w-9 p-0"
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </motion.div>

              {/* Transactions List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-card/80 backdrop-blur-md border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" />
                      Transactions
                    </CardTitle>
                    <CardDescription>
                      Your complete payment and credit transaction history
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredAndSortedTransactions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No transactions found</p>
                        <p className="text-sm mt-1">
                          {filterType !== 'all' || filterStatus !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Your transactions will appear here after your first purchase'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {paginatedTransactions.map((transaction, index) => (
                          <motion.div
                            key={transaction.transaction_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 ${getTypeBgColor(transaction.type)} rounded-xl flex items-center justify-center`}>
                                {getTypeIcon(transaction.type)}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {transaction.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(transaction.created_at)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {transaction.type}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className={`font-semibold ${
                                  transaction.type === 'refund'
                                    ? 'text-red-500'
                                    : transaction.credits
                                      ? 'text-amber-500'
                                      : 'text-foreground'
                                }`}>
                                  {transaction.type === 'refund' && transaction.amount
                                    ? `-$${transaction.amount.toFixed(2)}`
                                    : formatAmount(transaction.amount, transaction.currency, transaction.credits)
                                  }
                                </p>
                                <div className="mt-1">
                                  {getStatusBadge(transaction.status)}
                                </div>
                              </div>
                              {transaction.details?.pdfUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadInvoice({
                                    id: transaction.transaction_id,
                                    date: transaction.created_at,
                                    amount: transaction.amount?.toString() || '0',
                                    currency: transaction.currency || 'USD',
                                    status: transaction.status,
                                    pdfUrl: transaction.details?.pdfUrl as string,
                                  })}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Pagination Controls */}
                    {filteredAndSortedTransactions.length > itemsPerPage && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                        <div className="text-sm text-muted-foreground">
                          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)} of {filteredAndSortedTransactions.length} transactions
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className="w-9 h-9 p-0"
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 flex flex-wrap gap-4 justify-center"
              >
                <Link to="/pricing">
                  <Button variant="outline" className="gap-2">
                    <CreditCard className="h-4 w-4" />
                    Buy Credits
                  </Button>
                </Link>
                <Link to="/dashboard/subscription">
                  <Button variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Manage Subscription
                  </Button>
                </Link>
              </motion.div>

              {/* Help Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 text-center"
              >
                <p className="text-sm text-muted-foreground">
                  Questions about a transaction?{' '}
                  <a
                    href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`}
                    className="text-primary hover:underline"
                  >
                    Contact our support team
                  </a>
                </p>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
