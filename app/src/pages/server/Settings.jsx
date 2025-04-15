import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Settings, Save, RefreshCw, AlignLeft, Variable, PowerOff,
  Server, AlertTriangle, CheckCircle2, Terminal, Loader2
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SettingsPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showReinstallDialog, setShowReinstallDialog] = useState(false);
  const [serverName, setServerName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Fetch server details
  const { data: serverData, isLoading: isLoadingServer } = useQuery({
    queryKey: ['server', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/server/${id}`);
      setServerName(data.attributes.name);
      return data;
    }
  });

  // Fetch startup variables
  const { data: startupData, isLoading: isLoadingStartup } = useQuery({
    queryKey: ['server', id, 'startup'],
    queryFn: async () => {
      const { data } = await axios.get(`/api/server/${id}/variables`);
      return data;
    }
  });

  // Update variable mutation
  const updateVariable = useMutation({
    mutationFn: async ({ key, value }) => {
      await axios.put(`/api/server/${id}/variables`, { key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['server', id, 'startup']);
      toast.success("Variable updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to update variable");
    }
  });

  // Reinstall server mutation
  const reinstallServer = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/server/${id}/reinstall`);
    },
    onSuccess: () => {
      toast.success("Server reinstallation initiated");
      setShowReinstallDialog(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to reinstall server");
    }
  });

  // Rename server mutation
  const renameServer = useMutation({
    mutationFn: async (name) => {
      await axios.post(`/api/server/${id}/rename`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['server', id]);
      toast.success("Server renamed successfully");
      setIsRenaming(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to rename server");
    }
  });

  if (isLoadingServer || isLoadingStartup) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
      </div>
    );
  }

  const server = serverData?.attributes;
  const variables = startupData?.data || [];
  const dockerImages = startupData?.meta?.docker_images || {};
  const startupCommand = startupData?.meta?.startup_command || server?.invocation;
  const rawStartupCommand = startupData?.meta?.raw_startup_command;

  const handleVariableUpdate = async (key, value) => {
    updateVariable.mutate({ key, value });
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (serverName.trim() && serverName !== server.name) {
      renameServer.mutate(serverName);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-neutral-400">
            Manage your server configuration and variables
          </p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="startup" className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Startup
          </TabsTrigger>
          <TabsTrigger value="variables" className="flex items-center gap-2">
            <Variable className="w-4 h-4" />
            Variables
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Server Details</CardTitle>
              <CardDescription>
                View and modify basic server settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleRename} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Server Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="name"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                      placeholder="Enter server name"
                    />
                    <Button 
                      type="submit" 
                      disabled={!serverName.trim() || serverName === server.name || renameServer.isLoading}
                    >
                      {renameServer.isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              </form>

              <div className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Dangerous Zone</h3>
                    <p className="text-sm text-neutral-400">
                      These actions can cause data loss
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setShowReinstallDialog(true)}
                    disabled={reinstallServer.isLoading}
                  >
                    {reinstallServer.isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <PowerOff className="w-4 h-4 mr-2" />
                    )}
                    Reinstall Server
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="startup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Startup Configuration</CardTitle>
              <CardDescription>
                View and modify server startup parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Startup Command</Label>
                  <div className="relative">
                    <Input 
                      value={startupCommand || ''} 
                      disabled 
                    />
                    {rawStartupCommand && (
                      <div className="mt-2">
                        <Label className="text-xs text-neutral-400">Raw Command</Label>
                        <Input 
                          value={rawStartupCommand} 
                          disabled 
                          className="mt-1 font-mono text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Docker Image</Label>
                  <Select disabled defaultValue={server?.docker_image}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Docker image" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(dockerImages).map(([name, image]) => (
                        <SelectItem key={image} value={image}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>
                Configure environment-specific settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {variables.map((variable) => (
                    <div key={variable.attributes.env_variable} className="space-y-2">
                      <Label htmlFor={variable.attributes.env_variable}>
                        {variable.attributes.name}
                        {variable.attributes.description && (
                          <span className="block text-xs text-neutral-400 mt-1">
                            {variable.attributes.description}
                          </span>
                        )}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={variable.attributes.env_variable}
                          defaultValue={variable.attributes.server_value || variable.attributes.default_value}
                          disabled={!variable.attributes.is_editable}
                          onBlur={(e) => {
                            if (e.target.value !== (variable.attributes.server_value || variable.attributes.default_value)) {
                              handleVariableUpdate(
                                variable.attributes.env_variable,
                                e.target.value
                              );
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showReinstallDialog} onOpenChange={setShowReinstallDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will reinstall your server. All data will be lost and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reinstallServer.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Reinstall Server
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;