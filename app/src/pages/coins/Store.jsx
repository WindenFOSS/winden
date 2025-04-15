import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  AlertCircle, 
  Server, 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Plus, 
  RefreshCw, 
  Coins 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function StorePage() {
  const [loading, setLoading] = useState({});
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  const { data: storeConfig } = useQuery({
    queryKey: ['storeConfig'],
    queryFn: async () => {
      const response = await axios.get('/api/store/config');
      return response.data;
    },
    retry: false
  });

  const resourceLabels = {
    ram: 'MB RAM',
    disk: 'MB Storage',
    cpu: '% CPU',
    servers: 'Server Slots'
  };

  const buyResource = async (type, amount) => {
    try {
      setLoading(prev => ({ ...prev, [type]: true }));
      setError('');

      await axios.post('/api/store/buy', {
        resourceType: type,
        amount: parseInt(amount)
      });

      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to make purchase');
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
      setConfirmDialog(null);
    }
  };

  const ResourceCard = ({ title, icon: Icon, type, description, pricePerUnit }) => {
    const [amount, setAmount] = useState(1);
    const totalPrice = amount * pricePerUnit;
    const canAfford = storeConfig?.canAfford?.[type] && storeConfig.userBalance >= totalPrice;
    const resourceAmount = amount * (storeConfig?.multipliers?.[type] || 0);
    const maxAmount = storeConfig?.limits?.[type] || 10;

    const handlePurchaseClick = () => {
      setConfirmDialog({
        type,
        amount,
        resourceAmount,
        totalPrice,
        title,
        unit: resourceLabels[type]
      });
    };

    return (
      <Card className="border-neutral-800/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-neutral-900 rounded-lg">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-sm">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-400">{description}</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Math.min(maxAmount, parseInt(e.target.value) || 1)))}
              className="w-24"
            />
            <span className="text-sm text-neutral-400">units</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Amount:</span>
              <span className="text-white">{resourceAmount} {resourceLabels[type]}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Price:</span>
              <span className="text-white">{totalPrice} coins</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handlePurchaseClick}
            disabled={!canAfford || loading[type]}
          >
            {loading[type] ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              canAfford ? (
                <Plus className="w-4 h-4 mr-2" />
              ) : (
                <div></div>
              )
            )}
            {canAfford ? 'Purchase' : 'Insufficient balance'}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  if (!storeConfig) {
    return (
      <div className="p-6">
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>Loading store configuration...</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resources store</h1>
        <Badge variant="outline" className="px-4 py-1 flex items-center gap-2">
          <Coins className="w-4 h-4" />
          {storeConfig.userBalance} coins
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ResourceCard
          title="Memory"
          icon={MemoryStick}
          type="ram"
          description="Purchase additional RAM for your servers"
          pricePerUnit={storeConfig.prices.resources.ram}
        />
        <ResourceCard
          title="Storage"
          icon={HardDrive}
          type="disk"
          description="Purchase additional storage space"
          pricePerUnit={storeConfig.prices.resources.disk}
        />
        <ResourceCard
          title="CPU"
          icon={Cpu}
          type="cpu"
          description="Purchase additional CPU power"
          pricePerUnit={storeConfig.prices.resources.cpu}
        />
        <ResourceCard
          title="Server Slots"
          icon={Server}
          type="servers"
          description="Purchase additional server slots"
          pricePerUnit={storeConfig.prices.resources.servers}
        />
      </div>

      <Card className="border-neutral-800/50">
        <CardHeader>
          <CardTitle>More information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-neutral-400">
            Purchase additional resources for your servers using coins. Maximum limits per resource type: 
            {Object.entries(storeConfig.limits).map(([type, limit]) => (
              <span key={type} className="ml-1">
                {type}: {limit},
              </span>
            ))}
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription className="pt-4">
              Are you sure you want to purchase:
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Resource:</span>
                  <span className="font-medium">{confirmDialog?.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Amount:</span>
                  <span className="font-medium">{confirmDialog?.resourceAmount} {confirmDialog?.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cost:</span>
                  <span className="font-medium">{confirmDialog?.totalPrice} coins</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Balance after purchase:</span>
                  <span className="font-medium">{storeConfig.userBalance - (confirmDialog?.totalPrice || 0)} coins</span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button onClick={() => buyResource(confirmDialog.type, confirmDialog.amount)}>
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}