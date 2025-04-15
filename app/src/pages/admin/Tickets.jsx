import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare,
  Eye,
  RefreshCw,
  Save,
  X,
  RotateCcw,
  MoreHorizontal,
  Download
} from 'lucide-react';

const StatsCard = ({ title, value, className }) => (
  <Card>
    <CardContent className="p-6">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className={`mt-2 text-3xl font-semibold ${className}`}>{value}</p>
    </CardContent>
  </Card>
);

const PriorityBadge = ({ priority }) => {
  const variants = {
    low: "bg-blue-100 text-blue-800 border-blue-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    urgent: "bg-red-100 text-red-800 border-red-200"
  };

  return (
    <Badge variant="outline" className={variants[priority]}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

const StatusBadge = ({ status }) => (
  <Badge variant={status === 'open' ? 'success' : 'secondary'}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
);

const ViewTicketDialog = ({ isOpen, onClose, ticketId, onStatusChange }) => {
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: ticket, refetch } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const response = await fetch(`/api/tickets/${ticketId}`);
      return response.json();
    },
    enabled: !!ticketId
  });

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent })
      });
      
      setReplyContent('');
      refetch();
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>{ticket.subject}</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">#{ticket.id.slice(0, 8)}</p>
            </div>
            <div className="flex gap-2">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {ticket.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`bg-gray-50 rounded-lg p-4 ${msg.isStaff ? 'ml-8' : 'mr-8'}`}
            >
              <div className="flex justify-between items-start">
                <Badge variant={msg.isSystem ? "outline" : msg.isStaff ? "secondary" : "default"}>
                  {msg.isSystem ? 'System' : msg.isStaff ? 'Staff' : 'User'}
                </Badge>
                <span className="text-xs text-gray-400">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-700">{msg.content}</p>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <form onSubmit={handleSubmitReply} className="space-y-4">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              className="min-h-[100px]"
            />
            <div className="flex justify-between">
              <Button
                type="button"
                variant={ticket.status === 'open' ? 'destructive' : 'default'}
                onClick={() => onStatusChange(ticket.id, ticket.status === 'open' ? 'closed' : 'open')}
              >
                {ticket.status === 'open' ? (
                  <><X className="w-4 h-4 mr-2" /> Close Ticket</>
                ) : (
                  <><RotateCcw className="w-4 h-4 mr-2" /> Reopen Ticket</>
                )}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Send Reply
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const UpdatePriorityDialog = ({ isOpen, onClose, ticketId, onUpdate }) => {
  const [priority, setPriority] = useState('low');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Priority</DialogTitle>
        </DialogHeader>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onUpdate(ticketId, priority)}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function AdminSupportDashboard() {
  const [filters, setFilters] = useState({
    search: '',
    priority: 'all',
    category: 'all',
    status: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [priorityUpdateTicketId, setPriorityUpdateTicketId] = useState(null);
  const perPage = 10;

  const { data: stats } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: async () => {
      const response = await fetch('/api/tickets/stats');
      return response.json();
    }
  });

  const { data: tickets, refetch: refetchTickets } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const response = await fetch('/api/tickets/all');
      return response.json();
    }
  });

  const filteredTickets = tickets?.filter(ticket => {
    if (filters.search && !ticket.subject.toLowerCase().includes(filters.search.toLowerCase()) &&
        !ticket.user.username.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.priority !== 'all' && ticket.priority !== filters.priority) return false;
    if (filters.category !== 'all' && ticket.category !== filters.category) return false;
    if (filters.status !== 'all' && ticket.status !== filters.status) return false;
    return true;
  }) || [];

  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const handleStatusChange = async (ticketId, status) => {
    try {
      await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      refetchTickets();
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const handlePriorityUpdate = async (ticketId, priority) => {
    try {
      await fetch(`/api/tickets/${ticketId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      });
      refetchTickets();
      setPriorityUpdateTicketId(null);
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const exportTickets = async () => {
    try {
      const response = await fetch('/api/tickets/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting tickets:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Support Tickets</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={filters.priority}
            onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.category}
            onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="abuse">Abuse</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search tickets..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-[200px]"
          />

          <Button onClick={exportTickets}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatsCard 
          title="Total Tickets" 
          value={stats?.total || '-'} 
        />
        <StatsCard 
          title="Open Tickets" 
          value={stats?.open || '-'}
          className="text-emerald-600"
        />
        <StatsCard 
          title="Avg. Response Time" 
          value={stats?.averageResponseTime ? `${Math.round(stats.averageResponseTime / 60000)}m` : '-'}
          className="text-amber-600"
        />
        <StatsCard 
          title="Last 7 Days" 
          value={stats?.ticketsLastWeek || '-'}
          className="text-blue-600"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Ticket</th>
                <th className="text-left p-4">User</th>
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Priority</th>
                <th className="text-left p-4">Status</th>
                <th className="text-center p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
            {paginatedTickets.map(ticket => (
                <tr key={ticket.id} className="border-b">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{ticket.subject}</div>
                      <div className="text-sm text-gray-500">#{ticket.id.slice(0, 8)}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{ticket.user.username}</div>
                    <div className="text-xs text-gray-500">{ticket.user.email}</div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">
                      {ticket.category}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <PriorityBadge priority={ticket.priority} />
                  </td>
                  <td className="p-4">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPriorityUpdateTicketId(ticket.id)}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(
                          ticket.id,
                          ticket.status === 'open' ? 'closed' : 'open'
                        )}
                      >
                        {ticket.status === 'open' ? (
                          <X className="w-4 h-4 text-red-500" />
                        ) : (
                          <RotateCcw className="w-4 h-4 text-emerald-500" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-gray-500">
            Showing {(currentPage - 1) * perPage + 1} to{' '}
            {Math.min(currentPage * perPage, filteredTickets.length)} of{' '}
            {filteredTickets.length} tickets
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Previous
            </Button>
            {Array.from({ length: Math.ceil(filteredTickets.length / perPage) }).map((_, i) => {
              const pageNumber = i + 1;
              // Show first, last, and pages around current page
              if (
                pageNumber === 1 ||
                pageNumber === Math.ceil(filteredTickets.length / perPage) ||
                (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
              ) {
                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? 'default' : 'outline'}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                );
              } else if (
                (pageNumber === 2 && currentPage > 4) ||
                (pageNumber === Math.ceil(filteredTickets.length / perPage) - 1 &&
                  currentPage < Math.ceil(filteredTickets.length / perPage) - 3)
              ) {
                return <span key={pageNumber} className="px-2">...</span>;
              }
              return null;
            })}
            <Button
              variant="outline"
              disabled={currentPage === Math.ceil(filteredTickets.length / perPage)}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* View Ticket Dialog */}
      <ViewTicketDialog
        isOpen={!!selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
        ticketId={selectedTicketId}
        onStatusChange={handleStatusChange}
      />

      {/* Update Priority Dialog */}
      <UpdatePriorityDialog
        isOpen={!!priorityUpdateTicketId}
        onClose={() => setPriorityUpdateTicketId(null)}
        ticketId={priorityUpdateTicketId}
        onUpdate={handlePriorityUpdate}
      />
    </div>
  );
}