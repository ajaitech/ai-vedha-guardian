import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  User, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Mail,
  Phone,
  Send,
  Eye,
  MoreHorizontal
} from 'lucide-react';

interface SupportTicket {
  ticket_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  subject: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'pending_user' | 'resolved' | 'closed';
  category: 'technical' | 'billing' | 'general' | 'feature_request';
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  sla_deadline: string;
  responses: TicketResponse[];
}

interface TicketResponse {
  response_id: string;
  ticket_id: string;
  responder_type: 'admin' | 'user';
  responder_name: string;
  message: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'internal';
  created_at: string;
}

const SupportTickets = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [newResponse, setNewResponse] = useState('');
  const [responseChannel, setResponseChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, debouncedSearchTerm, statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    try {
      // NOTE: Support tickets are stored in DynamoDB: aivedha-guardian-support-tickets
      // User-facing APIs exist: POST /support/create-ticket, GET /support/check-ticket
      // Admin API endpoint needed: GET /admin/support-tickets (requires Lambda: admin-support-tickets.py)
      // For now, tickets can be managed directly in DynamoDB or via AWS Console
      setTickets([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch support tickets",
        variant: "destructive",
      });
    }
  };

  const filterTickets = () => {
    let filtered = tickets;

    if (debouncedSearchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.subject.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        ticket.user_email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        ticket.ticket_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    setFilteredTickets(filtered);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'pending_user': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟡';
      case 'medium': return '🟢';
      case 'low': return '⚪';
      default: return '⚪';
    }
  };

  const getSLAStatus = (deadline: string) => {
    const now = new Date();
    const slaDeadline = new Date(deadline);
    const hoursLeft = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return { status: 'breached', color: 'text-red-600', text: 'SLA Breached' };
    if (hoursLeft < 1) return { status: 'urgent', color: 'text-orange-600', text: `${Math.round(hoursLeft * 60)}m left` };
    if (hoursLeft < 24) return { status: 'due', color: 'text-yellow-600', text: `${Math.round(hoursLeft)}h left` };
    return { status: 'ok', color: 'text-green-600', text: `${Math.round(hoursLeft)}h left` };
  };

  const sendResponse = async () => {
    if (!selectedTicket || !newResponse.trim()) return;

    try {
      // Mock API call - replace with actual implementation
      const response: TicketResponse = {
        response_id: `resp_${Date.now()}`,
        ticket_id: selectedTicket.ticket_id,
        responder_type: 'admin',
        responder_name: 'Aravind Jayamohan',
        message: newResponse,
        channel: responseChannel,
        created_at: new Date().toISOString()
      };

      // Update ticket with new response
      const updatedTickets = tickets.map(ticket =>
        ticket.ticket_id === selectedTicket.ticket_id
          ? {
              ...ticket,
              responses: [...ticket.responses, response],
              status: 'in_progress' as const,
              updated_at: new Date().toISOString()
            }
          : ticket
      );

      setTickets(updatedTickets);
      setSelectedTicket({
        ...selectedTicket,
        responses: [...selectedTicket.responses, response],
        status: 'in_progress',
        updated_at: new Date().toISOString()
      });
      setNewResponse('');

      toast({
        title: "Success",
        description: `Response sent via ${responseChannel}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send response",
        variant: "destructive",
      });
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const updatedTickets = tickets.map(ticket =>
        ticket.ticket_id === ticketId
          ? { ...ticket, status: newStatus as SupportTicket['status'], updated_at: new Date().toISOString() }
          : ticket
      );
      setTickets(updatedTickets);

      toast({
        title: "Success",
        description: `Ticket status updated to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground">
            SLA-based customer support management system
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <button className="btn-primary px-4 py-2 rounded-xl inline-flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>
                Create a new support ticket for internal tracking
              </DialogDescription>
            </DialogHeader>
            {/* New ticket form would go here */}
          </DialogContent>
        </Dialog>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending_user">Pending User</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">🔴 Critical</SelectItem>
                <SelectItem value="high">🟡 High</SelectItem>
                <SelectItem value="medium">🟢 Medium</SelectItem>
                <SelectItem value="low">⚪ Low</SelectItem>
              </SelectContent>
            </Select>
            <button className="btn-secondary px-4 py-2" onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setPriorityFilter('all');
            }}>
              Clear Filters
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Support Queue ({filteredTickets.length})</CardTitle>
          <CardDescription>
            Manage customer support requests with SLA tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No support tickets</p>
              <p className="text-sm">Tickets submitted via the support page will appear here.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => {
                const slaStatus = getSLAStatus(ticket.sla_deadline);
                return (
                  <TableRow key={ticket.ticket_id}>
                    <TableCell className="font-mono text-sm">
                      {ticket.ticket_id}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{ticket.user_name}</div>
                        <div className="text-sm text-muted-foreground">{ticket.user_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{ticket.subject}</div>
                      <Badge variant="outline" className="mt-1">
                        {ticket.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {getPriorityIcon(ticket.priority)} {ticket.priority.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={slaStatus.color}>
                        {slaStatus.text}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatDate(ticket.updated_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTicket(ticket)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Ticket Details - {selectedTicket?.ticket_id}</DialogTitle>
                              <DialogDescription>
                                {selectedTicket?.subject}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedTicket && (
                              <div className="space-y-6">
                                {/* Ticket Info */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Customer</Label>
                                    <p>{selectedTicket.user_name} ({selectedTicket.user_email})</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Priority</Label>
                                    <Badge className={getPriorityColor(selectedTicket.priority)}>
                                      {getPriorityIcon(selectedTicket.priority)} {selectedTicket.priority.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Status</Label>
                                    <Select 
                                      value={selectedTicket.status} 
                                      onValueChange={(value) => updateTicketStatus(selectedTicket.ticket_id, value)}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="open">Open</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="pending_user">Pending User</SelectItem>
                                        <SelectItem value="resolved">Resolved</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">SLA Deadline</Label>
                                    <p className={getSLAStatus(selectedTicket.sla_deadline).color}>
                                      {formatDate(selectedTicket.sla_deadline)}
                                    </p>
                                  </div>
                                </div>

                                {/* Original Message */}
                                <div>
                                  <Label className="text-sm font-medium">Original Message</Label>
                                  <div className="p-3 bg-muted rounded-lg mt-2">
                                    <p>{selectedTicket.description}</p>
                                  </div>
                                </div>

                                {/* Conversation */}
                                <div>
                                  <Label className="text-sm font-medium">Conversation</Label>
                                  <div className="space-y-3 mt-2 max-h-60 overflow-y-auto">
                                    {selectedTicket.responses.map((response) => (
                                      <div
                                        key={response.response_id}
                                        className={`p-3 rounded-lg ${
                                          response.responder_type === 'admin'
                                            ? 'bg-blue-50 border-l-4 border-blue-500'
                                            : 'bg-gray-50 border-l-4 border-gray-300'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium">{response.responder_name}</span>
                                          <div className="flex items-center space-x-2">
                                            <Badge variant="outline">{response.channel}</Badge>
                                            <span className="text-xs text-muted-foreground">
                                              {formatDate(response.created_at)}
                                            </span>
                                          </div>
                                        </div>
                                        <p className="text-sm">{response.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Response Form */}
                                <div className="space-y-4">
                                  <Label className="text-sm font-medium">Send Response</Label>
                                  <div className="grid grid-cols-4 gap-2">
                                    <Button
                                      variant={responseChannel === 'email' ? 'default' : 'outline'}
                                      onClick={() => setResponseChannel('email')}
                                      className="flex items-center"
                                    >
                                      <Mail className="mr-2 h-4 w-4" />
                                      Email
                                    </Button>
                                    <Button
                                      variant={responseChannel === 'sms' ? 'default' : 'outline'}
                                      onClick={() => setResponseChannel('sms')}
                                      className="flex items-center"
                                    >
                                      <Phone className="mr-2 h-4 w-4" />
                                      SMS
                                    </Button>
                                    <Button
                                      variant={responseChannel === 'whatsapp' ? 'default' : 'outline'}
                                      onClick={() => setResponseChannel('whatsapp')}
                                      className="flex items-center"
                                    >
                                      <MessageSquare className="mr-2 h-4 w-4" />
                                      WhatsApp
                                    </Button>
                                  </div>
                                  <Textarea
                                    value={newResponse}
                                    onChange={(e) => setNewResponse(e.target.value)}
                                    rows={4}
                                  />
                                  <button onClick={sendResponse} disabled={!newResponse.trim()} className="btn-primary px-4 py-2 rounded-xl inline-flex items-center">
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Response
                                  </button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Select onValueChange={(value) => updateTicketStatus(ticket.ticket_id, value)}>
                          <SelectTrigger className="w-24">
                            <MoreHorizontal className="h-4 w-4" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in_progress">Start Work</SelectItem>
                            <SelectItem value="pending_user">Pending User</SelectItem>
                            <SelectItem value="resolved">Resolve</SelectItem>
                            <SelectItem value="closed">Close</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportTickets;