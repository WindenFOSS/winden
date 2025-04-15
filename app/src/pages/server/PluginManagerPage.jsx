import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Import useParams
import axios from 'axios';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download, Search, RefreshCw, Star, Loader2, Gem } from 'lucide-react'; // Added Gem icon for premium
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const PluginsPage = () => {
  const { id } = useParams(); // Extract serverId from the URL
  const [plugins, setPlugins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [installStatus, setInstallStatus] = useState({ success: null, message: '' });
  const [isInstalling, setIsInstalling] = useState(false); // Track installation state

  // Fetch plugins from the backend
  const fetchPlugins = async (query = '') => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching plugins with query:', query); // Debugging
      const endpoint = query ? '/api/plugins/search' : '/api/plugins/list';
      const response = await axios.get(endpoint, {
        params: { query },
      });
      console.log('Plugins fetched:', response.data); // Debugging
      setPlugins(response.data);
    } catch (err) {
      setError('Failed to fetch plugins. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    fetchPlugins(searchQuery);
  };

  // Handle plugin installation
  const handleInstall = async (pluginId) => {
    setIsInstalling(true); // Start installation
    try {
      const response = await axios.post(`/api/plugins/install/${id}`, { pluginId });
      setInstallStatus({ success: true, message: response.data.message });
    } catch (err) {
      setInstallStatus({ success: false, message: err.response?.data?.message || 'Failed to install plugin.' });
      console.error(err);
    } finally {
      setIsInstalling(false); // End installation
      setIsModalOpen(true);
    }
  };

  // Handle plugin click to show details in modal
  const handlePluginClick = (plugin) => {
    setSelectedPlugin(plugin);
    setIsModalOpen(true);
  };

  // Fetch plugins on component mount
  useEffect(() => {
    fetchPlugins();
  }, []);

  return (
    <div className="space-y-6 p-6 bg-neutral-950">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Plugins</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plugins..."
            className="flex-1 bg-neutral-950/50 border-neutral-800/50"
          />
          <Button type="submit">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </form>
      </div>

      <Card className="border-neutral-800/50">
        <CardHeader>
          <CardTitle className="text-base">Available Plugins</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center min-h-[200px] text-red-400">
              {error}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plugins.map((plugin) => (
                    <TableRow
                      key={plugin.id}
                      onClick={() => handlePluginClick(plugin)}
                      className="cursor-pointer hover:bg-neutral-800/50"
                    >
                      <TableCell className="font-medium">{plugin.name}</TableCell>
                      <TableCell className="text-neutral-400">{plugin.tag}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {plugin.downloads.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <span>{plugin.rating?.average?.toFixed(1) || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {plugin.premium ? ( // Check if the plugin is premium
                          <Button
                            size="sm"
                            variant="premium" // Add a custom variant for premium
                            disabled
                          >
                            <Gem className="w-4 h-4 mr-2" />
                            Premium
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInstall(plugin.id);
                            }}
                            disabled={isInstalling} // Disable button during installation
                          >
                            {isInstalling ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 mr-2" />
                            )}
                            {isInstalling ? 'Installing...' : 'Install'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Plugin Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          {selectedPlugin ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPlugin.name}</DialogTitle>
                <DialogDescription>{selectedPlugin.tag}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Downloads: {selectedPlugin.downloads.toLocaleString()}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>{selectedPlugin.rating?.average?.toFixed(1) || 'N/A'}</span>
                  </div>
                </div>
                <p className="text-sm text-neutral-400">
                  Author: {selectedPlugin.author?.id || 'Unknown'}
                </p>
                <p className="text-sm text-neutral-400">
                  Version: {selectedPlugin.version?.id || 'N/A'}
                </p>
              </div>
              <DialogFooter>
                {selectedPlugin.premium ? ( // Check if the plugin is premium
                  <Button
                    variant="premium" // Add a custom variant for premium
                    disabled
                    className="w-full"
                  >
                    <Gem className="w-4 h-4 mr-2" />
                    Premium
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleInstall(selectedPlugin.id)}
                    className="w-full"
                    disabled={isInstalling} // Disable button during installation
                  >
                    {isInstalling ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {isInstalling ? 'Installing...' : 'Install Plugin'}
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{installStatus.success ? 'Success' : 'Error'}</DialogTitle>
              </DialogHeader>
              <DialogDescription>
                {installStatus.message}
              </DialogDescription>
              <DialogFooter>
                <Button onClick={() => setIsModalOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PluginsPage;