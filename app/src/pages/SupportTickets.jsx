import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  AlertCircle,
  RefreshCw,
  Eye,
  Save
} from 'lucide-react';

const StatsCard = ({ title, value, className }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className={`mt-2 text-3xl font-light ${className}`}>{value}</div>
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

const CreateTicketDialog = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    subject: '',
    category: 'technical',
    priority: 'low',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to create ticket');

      window.location.reload();
      onClose();
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={formData.subject}
              onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Enter ticket subject"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select 
              value={formData.category}
              onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technical">Technical Support</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="general">General Inquiry</SelectItem>
                <SelectItem value="abuse">Abuse Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <Select 
              value={formData.priority}
              onValueChange={value => setFormData(prev => ({ ...prev, priority: value }))}
            >
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your issue"
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ViewTicketDialog = ({ isOpen, onClose, ticketId }) => {
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: ticket, isLoading } = useQuery({
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
      const response = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent })
      });
      
      if (!response.ok) throw new Error('Failed to send reply');
      setReplyContent('');
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle>{ticket.subject}</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">#{ticket.id.slice(0, 8)}</p>
            </div>
            <PriorityBadge priority={ticket.priority} />
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {ticket.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`bg-gray-50 rounded-lg p-4 ${msg.isStaff ? 'ml-8' : 'mr-8'}`}
            >
              <div className="flex justify-between items-start">
                <Badge variant={msg.isStaff ? "secondary" : "outline"}>
                  {msg.isStaff ? 'Staff' : 'You'}
                </Badge>
                <span className="text-xs text-gray-400">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm">{msg.content}</p>
            </div>
          ))}
        </div>

        {ticket.status === 'open' && (
          <form onSubmit={handleSubmitReply} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reply</label>
              <Textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                required
              />
            </div>

            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => {/* Add close ticket handler */}}
                type="button"
              >
                Close Ticket
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Send Reply
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

const TicketTable = ({ tickets, onViewTicket }) => {
  if (!tickets?.length) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-sm font-medium">No tickets found</h3>
        <p className="mt-2 text-sm text-gray-500">Create a new ticket to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4">Subject</th>
            <th className="text-left py-3 px-4">Category</th>
            <th className="text-left py-3 px-4">Priority</th>
            <th className="text-left py-3 px-4">Last Update</th>
            <th className="text-center py-3 px-4">Status</th>
            <th className="text-center py-3 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => (
            <tr key={ticket.id} className="border-b">
              <td className="py-3 px-4">
                <div>
                  <div className="font-medium">{ticket.subject}</div>
                  <div className="text-sm text-gray-500">#{ticket.id.slice(0, 8)}</div>
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge variant="outline">{ticket.category}</Badge>
              </td>
              <td className="py-3 px-4">
                <PriorityBadge priority={ticket.priority} />
              </td>
              <td className="py-3 px-4 text-sm text-gray-500">
                {new Date(ticket.updated).toLocaleString()}
              </td>
              <td className="py-3 px-4 text-center">
                <Badge variant={ticket.status === 'open' ? 'success' : 'secondary'}>
                  {ticket.status}
                </Badge>
              </td>
              <td className="py-3 px-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewTicket(ticket.id)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function SupportDashboard() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState(null);
  
    const { data: stats, refetch: refetchStats } = useQuery({
      queryKey: ['ticket-stats'],
      queryFn: async () => {
        const response = await fetch('/api/tickets/count');
        return response.json();
      }
    });
  
    const { data: tickets, refetch: refetchTickets } = useQuery({
      queryKey: ['tickets'],
      queryFn: async () => {
        const response = await fetch('/api/tickets');
        return response.json();
      }
    });
  
    const activeTickets = tickets?.filter(t => t.status === 'open') || [];
    const closedTickets = tickets?.filter(t => t.status === 'closed') || [];
  
    const handleTicketCreated = async () => {
      await Promise.all([refetchStats(), refetchTickets()]);
      setIsCreateModalOpen(false);
    };
  
    const handleTicketDeleted = async () => {
      await Promise.all([refetchStats(), refetchTickets()]);
      setIsDeleteDialogOpen(false);
      setTicketToDelete(null);
    };
  
    const handleDelete = (ticket) => {
      setTicketToDelete(ticket);
      setIsDeleteDialogOpen(true);
    };
  
    const confirmDelete = async () => {
      if (!ticketToDelete) return;
      
      try {
        const response = await fetch(`/api/tickets/${ticketToDelete.id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete ticket');
        await handleTicketDeleted();
      } catch (error) {
        console.error('Error deleting ticket:', error);
      }
    };
  
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Support</h1>
            </div>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        </div>
  
        <Card>
          <CardHeader>
            <CardTitle>Active Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketTable 
              tickets={activeTickets}
              onViewTicket={setSelectedTicketId}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
  
        <Card>
          <CardHeader>
            <CardTitle>Closed Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketTable 
              tickets={closedTickets}
              onViewTicket={setSelectedTicketId}
            />
          </CardContent>
        </Card>
  
        <CreateTicketDialog 
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleTicketCreated}
        />
  
        <ViewTicketDialog
          isOpen={!!selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          ticketId={selectedTicketId}
        />
  
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this ticket? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTicketToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
                Delete Ticket
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }