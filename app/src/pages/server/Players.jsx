import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Ban, Crown, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import axios from "axios";

const QUERY_INTERVAL = 60000; // 1 minute, matching mcsrvstat.us cache time

const PlayerActions = ({ player, onAction }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState(null);

  const handleAction = (type) => {
    setActionType(type);
    setConfirmOpen(true);
  };

  const confirmAction = () => {
    onAction(actionType, player.name);
    setConfirmOpen(false);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={() => handleAction('ban')}
        >
          <Ban className="w-4 h-4 mr-2" />
          Ban
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={() => handleAction('op')}
        >
          <Crown className="w-4 h-4 mr-2" />
          Make OP
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'ban' ? 'Ban Player' : 'Make Player OP'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'ban' 
                ? `Are you sure you want to ban ${player.name}? This action can be undone later.`
                : `Are you sure you want to give ${player.name} operator privileges?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              variant={actionType === 'ban' ? 'destructive' : 'default'}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default function PlayersPage() {
  const { id } = useParams();
  const socketRef = useRef(null);
  const [serverState, setServerState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const queryInterval = useRef(null);

  const queryServer = useCallback(async () => {
    try {
      // First get the server info from your API
      const { data: serverInfo } = await axios.get(`/api/server/${id}`);
      console.log('Server Info:', serverInfo);
      
      // Then query mcsrvstat.us API
      const { data: status } = await axios.get(`https://api.mcsrvstat.us/3/${serverInfo?.attributes.relationships?.allocations?.data?.[0]?.attributes?.ip_alias}:${serverInfo?.attributes.relationships?.allocations?.data?.[0]?.attributes?.port}`);
      
      if (mounted.current) {
        setServerState(status);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err.message);
      }
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    mounted.current = true;
    queryServer();

    // Set up periodic querying
    queryInterval.current = setInterval(queryServer, QUERY_INTERVAL);

    return () => {
      mounted.current = false;
      if (queryInterval.current) {
        clearInterval(queryInterval.current);
      }
    };
  }, [queryServer]);

  // WebSocket connection for sending commands
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        const { data } = await axios.get(`/api/server/${id}/websocket`);
        const ws = new WebSocket(data.data.socket);

        ws.onopen = () => {
          if (!mounted.current) {
            ws.close();
            return;
          }
          ws.send(JSON.stringify({
            event: "auth",
            args: [data.data.token]
          }));
        };

        socketRef.current = ws;
      } catch (error) {
        console.error('WebSocket connection error:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [id]);

  const handlePlayerAction = (actionType, playerName) => {
    if (!socketRef.current) return;

    const command = actionType === 'ban'
      ? `ban ${playerName}`
      : `op ${playerName}`;

    socketRef.current.send(JSON.stringify({
      event: "send command",
      args: [command]
    }));
  };

  const handleRefresh = () => {
    setIsLoading(true);
    queryServer();
  };

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Loading Server Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error || !serverState) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Server Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-500">
            Unable to query the Minecraft server. This might mean the server is offline or not running Minecraft: Java Edition.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!serverState.online) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Server Offline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-500">
            The Minecraft server is currently offline.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Online Players ({serverState.players.online}/{serverState.players.max})
          </CardTitle>
          <p className="text-sm text-neutral-500 mt-1">
            Minecraft version {serverState.version}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {!serverState.players.list?.length ? (
          <p className="text-neutral-500">No players are currently online.</p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {serverState.players.list.map((player) => (
                <Card key={player.uuid} className="bg-neutral-950/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={`https://minotar.net/avatar/${player.name}/64`}
                        alt={`${player.name}'s skin`}
                        className="w-10 h-10 rounded"
                      />
                      <div>
                        <h3 className="font-medium">{player.name}</h3>
                        <a 
                          href={`https://namemc.com/profile/${player.uuid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-neutral-500 hover:text-neutral-400 flex items-center gap-1"
                        >
                          View on NameMC
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <PlayerActions 
                      player={player} 
                      onAction={handlePlayerAction}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}