import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Coins, Clock, History, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AFKPage() {
  const [connected, setConnected] = useState(false);
  const [nextReward, setNextReward] = useState(60000);
  const [coinsPerMinute, setCoinsPerMinute] = useState(1.5);
  const [totalEarned, setTotalEarned] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const ws = new WebSocket('/ws');

    ws.onopen = () => {
      setConnected(true);
      setError('');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'afk_state') {
        setNextReward(data.nextRewardIn);
        setCoinsPerMinute(data.coinsPerMinute);
        setTotalEarned(prev => prev + (data.nextRewardIn === 0 ? data.coinsPerMinute : 0));
      }
    };

    ws.onclose = (event) => {
      setConnected(false);
      if (event.code === 4001) {
        setError('You must be logged in to earn AFK rewards');
      } else if (event.code === 4002) {
        setError('AFK rewards are already running in another tab');
      } else {
        setError('Connection lost. Please refresh the page.');
      }
    };

    // Track session time
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AFK page</h1>
        <Badge variant={connected ? "success" : "destructive"} className="px-4 py-1">
          {connected ? 'CONNECTED' : 'DISCONNECTED'}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <Card className="border-neutral-800/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-neutral-900 rounded-lg">
                <Coins className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-sm">Earnings Rate</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {coinsPerMinute.toFixed(1)} coins/min
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-neutral-900 rounded-lg">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-sm">Session Time</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatTime(sessionTime)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-neutral-800/50">
        <CardHeader>
          <CardTitle className="text-sm">Next Reward</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={((60000 - nextReward) / 60000) * 100} className="h-2" />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-neutral-400">
            Next reward in {Math.ceil(nextReward / 1000)} seconds
          </p>
        </CardFooter>
      </Card>

      <Card className="border-neutral-800/50">
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-neutral-400">
            Earn coins automatically just by keeping this page open! You'll receive {coinsPerMinute} coins every minute.
          </p>
          <p className="text-sm text-neutral-400">
            You can use these coins to purchase resources and upgrades in the store.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}