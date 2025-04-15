import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AllocationsPage = () => {
  const { id } = useParams();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAllocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/server/${id}/allocations`);
      setAllocations(response.data);
    } catch (err) {
      setError('Failed to fetch allocations. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllocation = async () => {
    setCreateError(null);
    setCreateLoading(true);
    try {
      const response = await axios.post(`/api/server/${id}/allocations`, {});
      setAllocations([...allocations, response.data]);
      setIsAddModalOpen(false);
    } catch (err) {
      const errorDetail = err.response?.data?.details?.errors?.[0]?.detail;
      setCreateError(errorDetail || 'Failed to create allocation. Please try again later.');
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteAllocation = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await axios.delete(`/api/server/${id}/allocations/${selectedAllocation.id}`);
      setAllocations(allocations.filter(allocation => allocation.id !== selectedAllocation.id));
      setIsDeleteModalOpen(false);
    } catch (err) {
      const errorDetail = err.response?.data?.details?.errors?.[0]?.detail;
      setDeleteError(errorDetail || 'Failed to delete allocation. Please try again later.');
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [id]);

  // Clear errors when modals are closed
  useEffect(() => {
    if (!isDeleteModalOpen) {
      setDeleteError(null);
      setDeleteLoading(false);
    }
  }, [isDeleteModalOpen]);

  useEffect(() => {
    if (!isAddModalOpen) {
      setCreateError(null);
      setCreateLoading(false);
    }
  }, [isAddModalOpen]);

  return (
    <div className="space-y-6 p-6 bg-neutral-950">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Network</h1>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Allocation
        </Button>
      </div>

      <Card className="border-neutral-800/50">
        <CardHeader>
          <CardTitle className="text-base">IP allocations</CardTitle>
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
                    <TableHead>IP Address</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead>Alias</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell>{allocation.ip}</TableCell>
                      <TableCell>{allocation.port}</TableCell>
                      <TableCell>{allocation.is_primary ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{allocation.alias || 'N/A'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedAllocation(allocation);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allocation</DialogTitle>
            <DialogDescription>
              A new allocation with a random port will be added to the server.
            </DialogDescription>
          </DialogHeader>
          {createError && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAllocation} disabled={createLoading}>
              {createLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Allocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Allocation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this allocation?
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAllocation}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllocationsPage;