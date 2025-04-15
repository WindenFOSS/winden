import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
  Server,
  MoreVertical,
  Plus,
  Cpu,
  MemoryStick,
  HardDrive,
  RefreshCw,
  AlertCircle,
  Terminal,
  Pencil,
  Trash,
  Save as SaveIcon,
  Users
} from 'lucide-react';
import axios from 'axios';

// Utility function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 MB';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function ResourceCard({ icon: Icon, title, used, total, unit }) {
  const percentage = total ? (used / total) * 100 : 0;
  const color = percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-zinc-800';
  
  return (
    <Card className="border-neutral-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-neutral-900 rounded-lg">
              <Icon className="w-4 h-4 text-neutral-400" />
            </div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <span className="text-sm text-neutral-400">
            {used}{unit} / {total}{unit}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={percentage} className={`h-2 ${color}`} />
        <p className="text-xs text-neutral-500 mt-2">
          {percentage.toFixed(1)}% utilized
        </p>
      </CardContent>
    </Card>
  );
}

function EditServerModal({ isOpen, onClose, server }) {
  const [ram, setRam] = useState('');
  const [disk, setDisk] = useState('');
  const [cpu, setCpu] = useState('');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (server?.attributes) {
      setRam(server.attributes.limits.memory.toString());
      setDisk(server.attributes.limits.disk.toString());
      setCpu(server.attributes.limits.cpu.toString());
    }
  }, [server]);

  const handleUpdate = async () => {
    try {
      setError('');
      setIsUpdating(true);

      if (!ram || !disk || !cpu) {
        throw new Error('All resource values are required');
      }

      await axios.patch(`/api/v5/servers/${server.attributes.id}`, {
        ram: parseInt(ram),
        disk: parseInt(disk),
        cpu: parseInt(cpu)
      });

      onClose();
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Server - {server?.attributes?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <label className="text-sm text-neutral-400">RAM (MB)</label>
              <Input 
                type="number"
                placeholder="2048"
                value={ram}
                onChange={e => setRam(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-neutral-400">Disk (MB)</label>
              <Input 
                type="number"
                placeholder="10240"
                value={disk}
                onChange={e => setDisk(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-neutral-400">CPU (%)</label>
              <Input 
                type="number"
                placeholder="100"
                value={cpu}
                onChange={e => setCpu(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <SaveIcon className="w-4 h-4 mr-2" />}
            Update Server
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateServerModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [egg, setEgg] = useState('');
  const [location, setLocation] = useState('');
  const [ram, setRam] = useState('');
  const [disk, setDisk] = useState('');
  const [cpu, setCpu] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: eggs } = useQuery({
    queryKey: ['eggs'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v5/eggs');
      return data;
    }
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v5/locations');
      return data;
    }
  });

  const selectedEgg = eggs?.find(e => e.id === egg);

  const handleCreate = async () => {
    try {
      setError('');
      setIsCreating(true);

      if (!name?.trim()) throw new Error('Server name is required');
      if (!egg) throw new Error('Server type is required');
      if (!location) throw new Error('Location is required');
      if (!ram || !disk || !cpu) throw new Error('Resource values are required');

      await axios.post('/api/v5/servers', {
        name: name.trim(),
        egg,
        location,
        ram: parseInt(ram),
        disk: parseInt(disk),
        cpu: parseInt(cpu)
      });

      onClose();
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Server</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm text-neutral-400">Server Name</label>
            <Input 
              placeholder="My Awesome Server" 
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <label className="text-sm text-neutral-400">Server Type</label>
            <Select value={egg} onValueChange={setEgg}>
              <SelectTrigger>
                <SelectValue placeholder="Select Server Type" />
              </SelectTrigger>
              <SelectContent>
                {eggs?.map(egg => (
                  <SelectItem key={egg.id} value={egg.id}>
                    {egg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-neutral-400">Location</label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                {locations?.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <label className="text-sm text-neutral-400">RAM (MB)</label>
              <Input 
                type="number"
                placeholder="2048"
                value={ram}
                onChange={e => setRam(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-neutral-400">Disk (MB)</label>
              <Input 
                type="number"
                placeholder="10240"
                value={disk}
                onChange={e => setDisk(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-neutral-400">CPU (%)</label>
              <Input 
                type="number"
                placeholder="100"
                value={cpu}
                onChange={e => setCpu(e.target.value)}
              />
            </div>
          </div>

          {selectedEgg && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Minimum requirements: {selectedEgg.minimum.ram}MB RAM, {selectedEgg.minimum.disk}MB Disk, {selectedEgg.minimum.cpu}% CPU
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Server
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ServerCard({ server, onDelete, onEdit, wsStatus, stats }) {
  const navigate = useNavigate();
  const statusColors = {
    running: 'bg-green-500/10 text-green-500 border-green-500/20',
    starting: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    stopping: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    offline: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
  };

  const {
    id,
    identifier,
    name,
    limits = {}
  } = server?.attributes || {};

  let globalIdentifier;
  let globalName;

  if (server?.attributes) {
    globalIdentifier = server.attributes.identifier;
  } else {
    globalIdentifier = server.id;
  }

  if (server?.attributes) {
    globalName = server.attributes.name;
  } else {
    globalName = server.name;
  }

  const status = wsStatus?.[globalIdentifier] || 'offline';
  const serverStats = stats?.[globalIdentifier] || { cpu: 0, memory: 0, disk: 0 };
  
  return (
    <Card className="border-neutral-800/50 hover:border-neutral-700/50 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-900 rounded-lg">
              <Server className="w-4 h-4 text-neutral-400" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{globalName || 'Unnamed Server'}</h3>
              <p className="text-xs text-neutral-500">{globalIdentifier || 'Unknown'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`/server/${globalIdentifier}/overview`)}
            >
              <Terminal className="w-4 h-4" />
            </Button>
            {onEdit && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onEdit(server)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-red-500" 
                onClick={() => onDelete(id, name)}
              >
                <Trash className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="grid gap-3">
          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-1">
              <span>Memory</span>
              <span>{serverStats.memory?.toFixed(0) || 0} / {limits.memory || 0} MB</span>
            </div>
            <Progress 
              value={limits.memory ? (serverStats.memory / limits.memory) * 100 : 0} 
              className="h-1.5"
            />
          </div>
          
          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-1">
              <span>CPU</span>
              <span>{serverStats.cpu?.toFixed(1) || 0} / {limits.cpu || 0}%</span>
            </div>
            <Progress 
              value={limits.cpu ? (serverStats.cpu / limits.cpu) * 100 : 0} 
              className="h-1.5"
            />
          </div>
          
          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-1">
              <span>Disk</span>
              <span>{formatBytes(serverStats.disk || 0)} / {formatBytes((limits.disk || 0) * 1024 * 1024)}</span>
            </div>
            <Progress 
              value={limits.disk ? (serverStats.disk / (limits.disk * 1024 * 1024)) * 100 : 0} 
              className="h-1.5"
            />
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Badge variant="outline" className={`w-full justify-center ${statusColors[status]}`}>
          {status.toUpperCase()}
        </Badge>
      </CardFooter>
    </Card>
  );
}

export default function Dashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [serverToDelete, setServerToDelete] = useState(null);
  const [serverStatus, setServerStatus] = useState({});
  const [serverStats, setServerStats] = useState({});
  const socketsRef = useRef({});
  
  const { data: resources, isLoading: loadingResources } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v5/resources');
      return data;
    }
  });

  const { data: servers, isLoading: loadingServers } = useQuery({
    queryKey: ['servers'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v5/servers');
      return data;
    }
  });

  // Add new query for subuser servers
  const { data: subuserServers, isLoading: loadingSubuserServers } = useQuery({
    queryKey: ['subuser-servers'],
    queryFn: async () => {
      const { data } = await axios.get('/api/subuser-servers');
      return data;
    }
  });

  useEffect(() => {
    if (!servers && !subuserServers) return;

    // Connect WebSockets for owned servers
    servers?.forEach(server => {
      if (!socketsRef.current[server.attributes.identifier]) {
        connectWebSocket(server);
      }
    });

    // Connect WebSockets for subuser servers
    subuserServers?.forEach(server => {
      if (!socketsRef.current[server.id]) {
        connectWebSocket(server);
      }
    });

    return () => {
      Object.values(socketsRef.current).forEach(ws => ws.close());
      socketsRef.current = {};
    };
  }, [servers, subuserServers]);

  const connectWebSocket = async (server) => {
    try {
      const { data: wsData } = await axios.get(`/api/server/${server.attributes.identifier}/websocket`);
      const ws = new WebSocket(wsData.data.socket);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          event: "auth",
          args: [wsData.data.token]
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message, server.attributes.identifier);
      };

      ws.onclose = () => {
        delete socketsRef.current[server.attributes.identifier];
        setTimeout(() => connectWebSocket(server), 5000); // Reconnect after 5 seconds
      };

      socketsRef.current[server.attributes.identifier] = ws;
    } catch (error) {
      console.error(`WebSocket connection error for ${server.attributes.identifier}:`, error);
    }
  };

  const handleWebSocketMessage = (message, serverId) => {
    switch (message.event) {
      case 'auth success':
        socketsRef.current[serverId].send(JSON.stringify({ 
          event: 'send stats', 
          args: [null] 
        }));
        break;

      case 'stats':
        const statsData = JSON.parse(message.args[0]);
        if (!statsData) return;

        setServerStats(prev => ({
          ...prev,
          [serverId]: {
            cpu: statsData.cpu_absolute || 0,
            memory: statsData.memory_bytes / 1024 / 1024 || 0,
            disk: statsData.disk_bytes || 0
          }
        }));
        break;

      case 'status':
        setServerStatus(prev => ({
          ...prev,
          [serverId]: message.args[0]
        }));
        break;
    }
  };

  const handleDeleteServer = async (id, name) => {
    setServerToDelete({ id, name });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!serverToDelete) return;
    
    try {
      await axios.delete(`/api/v5/servers/${serverToDelete.id}`);
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete server:', error);
      alert('Failed to delete server. Please try again.');
    } finally {
      setIsDeleteDialogOpen(false);
      setServerToDelete(null);
    }
  };

  const handleEditServer = (server) => {
    setSelectedServer(server);
    setIsEditModalOpen(true);
  };

  if (loadingResources || loadingServers || loadingSubuserServers) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-neutral-800/50">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[200px]" />
          ))}
        </div>
      </div>
    );
  }

  const hasSubuserServers = subuserServers?.length > 0;
  const hasOwnedServers = servers?.length > 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Server
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ResourceCard 
          icon={MemoryStick}
          title="Memory"
          used={resources?.current?.ram || 0}
          total={resources?.limits?.ram || 0}
          unit="MB"
        />
        <ResourceCard 
          icon={Cpu}
          title="CPU"
          used={resources?.current?.cpu || 0}
          total={resources?.limits?.cpu || 0}
          unit="%"
        />
        <ResourceCard 
          icon={HardDrive}
          title="Storage"
          used={resources?.current?.disk/1024 || 0}
          total={resources?.limits?.disk/1024 || 0}
          unit="GB"
        />
        <ResourceCard 
          icon={Server}
          title="Servers"
          used={resources?.current?.servers || 0}
          total={resources?.limits?.servers || 0}
          unit=""
        />
      </div>

      {/* Owned Servers Section */}
      <div className="space-y-4">
      <h2 className="text-lg font-medium flex items-center gap-2">
          Your servers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers?.map(server => (
            <ServerCard
              key={server.attributes.id}
              server={server}
              onDelete={handleDeleteServer}
              onEdit={handleEditServer}
              wsStatus={serverStatus}
              stats={serverStats}
            />
          ))}

          {!hasOwnedServers && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border border-dashed border-neutral-800 rounded-lg">
              <Server className="w-12 h-12 text-neutral-600 mb-4" />
              <h3 className="text-lg font-medium text-neutral-400 mb-2">No servers yet</h3>
              <p className="text-sm text-neutral-500 mb-4">Create your first server to get started</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Server
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Subuser Servers Section */}
      {hasSubuserServers && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium flex items-center gap-2">
            Servers you can access
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subuserServers.map(server => (
              <ServerCard
                key={server.id}
                server={server}
                onDelete={null} // Disable delete for subuser servers
                onEdit={null} // Disable edit for subuser servers
                wsStatus={serverStatus}
                stats={serverStats}
              />
            ))}
          </div>
        </div>
      )}

      <CreateServerModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <EditServerModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedServer(null);
        }}
        server={selectedServer}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Server</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {serverToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setServerToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete Server
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}