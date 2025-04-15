import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Terminal,
  Settings,
  AlertCircle,
  ChevronRight,
  Info
} from 'lucide-react';
import axios from 'axios';

// Node Status Badge Component
function NodeStatusBadge({ status }) {
  const statusStyles = {
    online: "bg-green-500/10 text-green-500 border-green-500/20",
    offline: "bg-red-500/10 text-red-500 border-red-500/20",
    maintenance: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    installing: "bg-blue-500/10 text-blue-500 border-blue-500/20"
  };

  return (
    <Badge variant="outline" className={statusStyles[status?.toLowerCase()] || statusStyles.offline}>
      {status || 'Unknown'}
    </Badge>
  );
}

// Node Details Modal Component
function NodeDetailsModal({ node, isOpen, onClose }) {
  const { data: nodeConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['nodeConfig', node?.attributes?.id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/nodes/${node?.attributes?.id}/configuration`);
      return data;
    },
    enabled: isOpen && !!node?.attributes?.id
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Node Details - {node?.attributes?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-neutral-400">Name</div>
                  <div>{node?.attributes?.name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-400">FQDN</div>
                  <div>{node?.attributes?.fqdn}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-400">Status</div>
                  <div><NodeStatusBadge status={node?.attributes?.status} /></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resource Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-400">
                    <MemoryStick className="w-4 h-4" />
                    Memory
                  </div>
                  <div>{node?.attributes?.memory/1024 || 0} GB</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-400">
                    <HardDrive className="w-4 h-4" />
                    Storage
                  </div>
                  <div>{node?.attributes?.disk/1024 || 0} GB</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Node Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Node Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingConfig ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <ScrollArea className="h-64 rounded-md border p-4">
                  <pre className="text-sm font-mono">
                    {JSON.stringify(nodeConfig, null, 2)}
                  </pre>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Nodes Page Component
export default function NodesPage() {
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);

  const { data: nodes, isLoading } = useQuery({
    queryKey: ['nodes'],
    queryFn: async () => {
      const { data } = await axios.get('/api/nodes');
      return data.data;
    }
  });

  const filteredNodes = nodes?.filter(node => 
    node.attributes.name.toLowerCase().includes(search.toLowerCase()) ||
    node.attributes.fqdn.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const paginatedNodes = filteredNodes.slice(
    (currentPage - 1) * parseInt(perPage),
    currentPage * parseInt(perPage)
  );

  const totalPages = Math.ceil(filteredNodes.length / parseInt(perPage));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Nodes</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Nodes</CardTitle>
            <div className="flex gap-4">
              <Input
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Select value={perPage} onValueChange={setPerPage}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : (
                paginatedNodes.map(node => (
                  <TableRow key={node.attributes.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{node.attributes.name}</div>
                        <div className="text-sm text-neutral-500">{node.attributes.fqdn}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {node.attributes.memory/1024 || 0} GB
                    </TableCell>
                    <TableCell>
                      {node.attributes.disk/1024 || 0} GB
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedNode(node)}
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-neutral-500">
              Showing {((currentPage - 1) * parseInt(perPage)) + 1} to {Math.min(currentPage * parseInt(perPage), filteredNodes.length)} of {filteredNodes.length} nodes
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Node Details Modal */}
      <NodeDetailsModal 
        node={selectedNode}
        isOpen={!!selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}