import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Plus,
  Settings,
  AlertCircle,
  Trash,
  RefreshCw,
  Server,
  Webhook,
  Activity,
  Check,
  X,
  Shield,
  Info
} from 'lucide-react';
import axios from 'axios';

// Node Form Component
function NodeForm({ node, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    name: node?.name || '',
    fqdn: node?.fqdn || '',
    port: node?.port || '',
    webhookUrl: node?.webhookUrl || ''
  });

  return (
    <div className="grid gap-6 py-4">
      <div className="grid gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Node Name</label>
          <Input 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="Production Node 1"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">FQDN / IP Address</label>
          <Input 
            value={formData.fqdn}
            onChange={e => setFormData({...formData, fqdn: e.target.value})}
            placeholder="radar.example.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Port</label>
          <Input 
            type="number"
            value={formData.port}
            onChange={e => setFormData({...formData, port: e.target.value})}
            placeholder="8080"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook URL (Optional)</label>
          <Input 
            value={formData.webhookUrl}
            onChange={e => setFormData({...formData, webhookUrl: e.target.value})}
            placeholder="https://discord.com/api/webhooks/..."
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={() => onSubmit(null)}>
          Cancel
        </Button>
        <Button onClick={() => onSubmit(formData)} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>Save Changes</>
          )}
        </Button>
      </div>
    </div>
  );
}

// Node Details Component
function NodeDetails({ node, onClose }) {
  const { data: nodeDetails, isLoading } = useQuery({
    queryKey: ['node', node?.id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/radar/nodes/${node?.id}`);
      return data;
    },
    enabled: !!node?.id,
    refetchInterval: 5000
  });

  return (
    <Dialog open={!!node} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Node Details - {node?.name}
          </DialogTitle>
          <DialogDescription>
            View detailed information and statistics for this Radar node
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Node Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-neutral-500">Status</div>
                  <Badge variant={nodeDetails?.status === 'online' ? 'success' : 'destructive'}>
                    {nodeDetails?.status || 'Unknown'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-500">Address</div>
                  <div>{node?.fqdn}:{node?.port}</div>
                </div>
                {node?.webhookUrl && (
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-neutral-500">Webhook URL</div>
                    <div className="font-mono text-sm truncate">{node?.webhookUrl}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          {nodeDetails?.status === 'online' && nodeDetails?.stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detection Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium text-neutral-500">Total Detections</div>
                    <div className="text-2xl font-bold">
                      {nodeDetails.stats.total_detections?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-500">Recent Detections</div>
                    <div className="text-2xl font-bold">
                      {nodeDetails.stats.recent_detections?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-500">Detection Types</div>
                    <div className="text-2xl font-bold">
                      {Object.keys(nodeDetails.stats.detection_types || {}).length}
                    </div>
                  </div>
                </div>

                {nodeDetails.stats.detection_types && (
                  <div className="mt-6">
                    <div className="text-sm font-medium text-neutral-500 mb-2">Detection Breakdown</div>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {Object.entries(nodeDetails.stats.detection_types).map(([type, count]) => (
                          <div key={type} className="flex justify-between items-center">
                            <span className="font-mono text-sm">{type}</span>
                            <Badge variant="secondary">{count.toLocaleString()}</Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function RadarPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewingNode, setViewingNode] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: nodes, isLoading } = useQuery({
    queryKey: ['radar-nodes'],
    queryFn: async () => {
      const { data } = await axios.get('/api/radar/nodes');
      return data;
    },
    refetchInterval: 10000
  });

  const handleCreateNode = async (formData) => {
    if (!formData) {
      setIsCreateModalOpen(false);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      await axios.post('/api/radar/nodes', formData);
      
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries('radar-nodes');
      setError('success:Node created successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create node');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNode = async () => {
    try {
      await axios.delete(`/api/radar/nodes/${selectedNode.id}`);
      setIsDeleteDialogOpen(false);
      setSelectedNode(null);
      queryClient.invalidateQueries('radar-nodes');
      setError('success:Node deleted successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete node');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Radar</h1>
          <p className="text-sm text-neutral-500">Manage and monitor your Radar 6 nodes</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Node
        </Button>
      </div>

      {/* Error/Success Alert */}
      {error && (
        <Alert 
          variant={error.startsWith('success:') ? 'default' : 'destructive'}
          className="mb-6"
        >
          {error.startsWith('success:') ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {error.replace('success:', '')}
          </AlertDescription>
        </Alert>
      )}

      {/* Nodes List */}
      <Card>
        <CardHeader>
          <CardTitle>Radar Nodes</CardTitle>
          <CardDescription>
            Active detection nodes in your network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Detections</TableHead>
                <TableHead>Recent Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : nodes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-neutral-500 py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Shield className="w-8 h-8 text-neutral-400" />
                      <div>No Radar nodes found</div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        Add Your First Node
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                nodes?.map(node => (
                  <TableRow key={node.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{node.name}</div>
                        <div className="text-sm text-neutral-500">
                          {node.fqdn}:{node.port}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={node.status === 'online' ? 'success' : 'destructive'}
                        className="capitalize"
                      >
                        {node.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {node.status === 'online' ? (
                        node.stats?.total_detections?.toLocaleString() || '0'
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {node.status === 'online' ? (
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-green-500" />
                          {node.stats?.recent_detections || 0} recent
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingNode(node)}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedNode(node);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Node Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Radar Node</DialogTitle>
            <DialogDescription>
              Add a new Radar detection node to your network
            </DialogDescription>
          </DialogHeader>
          <NodeForm
            onSubmit={handleCreateNode}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Node</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedNode?.name}? This action cannot be undone,
              and all historical detection data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNode} className="bg-red-500 hover:bg-red-600">
              Delete Node
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Node Details Modal */}
      <NodeDetails
        node={viewingNode}
        onClose={() => setViewingNode(null)}
      />
    </div>
  );
}