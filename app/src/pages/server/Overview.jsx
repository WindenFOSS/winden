import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Terminal, Power, RotateCw, Square, Cpu, MemoryStick, 
  HardDrive, Network, Server, Upload, Database, RefreshCw,
  Clock, Shield, Download
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";

const RETRY_COUNT = 5;
const RETRY_DELAY = 5000;
const MAX_HISTORY_POINTS = 50;
const CHART_COLORS = {
  cpu: '#3B82F6',
  memory: '#3B82F6',
  disk: '#A855F7',
  network: '#F59E0B'
};

const ResourceChart = ({ data, dataKey, color, label, unit = "", domain }) => (
  <div className="h-36">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 10, fill: '#6B7280' }}
          stroke="#374151"
          interval="preserveStart"
        />
        <YAxis 
          domain={domain || [0, 'auto']}
          tick={{ fontSize: 10, fill: '#6B7280' }}
          stroke="#374151"
          width={40}
        />
        <RechartsTooltip
          content={({ active, payload }) => {
            if (active && payload?.[0]) {
              return (
                <div className="bg-neutral-900 border border-neutral-800 p-2 rounded-lg shadow-lg">
                  <p className="text-sm text-neutral-300">
                    {`${label}: ${payload[0].value.toFixed(1)}${unit}`}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {payload[0].payload.time}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={`url(#gradient-${dataKey})`}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const ResourceStat = ({ icon: Icon, title, value, secondaryValue, chartData, dataKey, color, unit, domain }) => (
  <Card className="border-neutral-800/50 overflow-hidden">
    <CardHeader className="p-4 pb-0">
      <div className="flex items-center gap-3">
        <div className="bg-neutral-900 p-2.5 rounded-lg">
          <Icon className="w-5 h-5 text-neutral-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-400">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-semibold text-white truncate">{value}</p>
            {secondaryValue && (
              <p className="text-sm text-neutral-500 truncate">{secondaryValue}</p>
            )}
          </div>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-4 pt-2">
      {chartData?.length > 0 && (
        <ResourceChart 
          data={chartData} 
          dataKey={dataKey} 
          color={color} 
          label={title}
          unit={unit}
          domain={domain}
        />
      )}
    </CardContent>
  </Card>
);

const NetworkChart = ({ data }) => (
  <div className="h-36">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 10, fill: '#6B7280' }}
          stroke="#374151"
          interval="preserveStart"
        />
        <YAxis 
          tick={{ fontSize: 10, fill: '#6B7280' }}
          stroke="#374151"
          width={40}
        />
        <RechartsTooltip
          content={({ active, payload }) => {
            if (active && payload?.length) {
              return (
                <div className="bg-neutral-900 border border-neutral-800 p-2 rounded-lg shadow-lg">
                  <p className="text-sm text-neutral-300">
                    {`Upload: ${payload[0].value.toFixed(1)} KB/s`}
                  </p>
                  <p className="text-sm text-neutral-300">
                    {`Download: ${payload[1].value.toFixed(1)} KB/s`}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {payload[0].payload.time}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Line
          type="monotone"
          dataKey="up"
          stroke={CHART_COLORS.network}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="down"
          stroke="#60A5FA"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const formatConsoleOutput = (line) => {
  // Convert ANSI color codes to CSS classes
  return line
    .replace(/\u001b\[(\d+)m/g, (match, code) => {
      const colors = {
        31: 'text-red-500',
        32: 'text-green-500',
        33: 'text-yellow-500',
        34: 'text-blue-500',
        35: 'text-purple-500',
        36: 'text-cyan-500',
        37: 'text-white'
      };
      return `<span class="${colors[code] || ''}"">`;
    })
    .replace(/\u001b\[0m/g, '</span>')
    .replace(/\n/g, '<br>');
};

export default function ConsolePage() {
  const { id } = useParams();
  const socketRef = useRef(null);
  const [serverState, setServerState] = useState("offline");
  const [consoleLines, setConsoleLines] = useState([]);
  const [command, setCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [retryCount, setRetryCount] = useState(0);
  const [resourceHistory, setResourceHistory] = useState({
    cpu: [],
    memory: [],
    disk: [],
    network: []
  });
  const [stats, setStats] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: { up: 0, down: 0 },
    uptime: "0h 0m 0s"
  });
  const consoleRef = useRef(null);
  const mounted = useRef(true);

  const { data: server, error: serverError } = useQuery({
    queryKey: ['server', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/server/${id}`);
      return data.attributes;
    }
  });

  const handleWebSocketMessage = useCallback((event) => {
    if (!mounted.current) return;

    try {
      const message = JSON.parse(event.data);

      switch (message.event) {
        case 'auth success':
          socketRef.current?.send(JSON.stringify({ event: 'send logs', args: [null] }));
          socketRef.current?.send(JSON.stringify({ event: 'send stats', args: [null] }));
          break;

        case 'console output':
          setConsoleLines(prev => [...prev.slice(-1000), message.args[0]]);
          break;

          case 'stats':
            const statsData = JSON.parse(message.args[0]);
            if (!statsData || !mounted.current) return;
          
            setStats(prev => ({
              ...prev, // Keep previous values as fallback
              cpu: (statsData.cpu_absolute || 0).toFixed(1),
              memory: (statsData.memory_bytes / 1024 / 1024 || 0).toFixed(0),
              disk: (statsData.disk_bytes / 1024 / 1024 || 0).toFixed(0),
              network: {
                up: (statsData.network?.tx_bytes / 1024 || 0).toFixed(2),
                down: (statsData.network?.rx_bytes / 1024 || 0).toFixed(2)
              }
            }));
            break;

        case 'status':
          setServerState(message.args[0]);
          break;
      }
    } catch (error) {
      console.error('WebSocket message handling error:', error);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    const connectWebSocket = async () => {
      try {
        if (!mounted.current) return;

        const { data } = await axios.get(`/api/server/${id}/websocket`);
        const ws = new WebSocket(data.data.socket);

        ws.onopen = () => {
          if (!mounted.current) {
            ws.close();
            return;
          }

          console.log('WebSocket connected');
          setRetryCount(0);
          ws.send(JSON.stringify({
            event: "auth",
            args: [data.data.token]
          }));
        };

        ws.onmessage = handleWebSocketMessage;

        ws.onclose = () => {
          if (!mounted.current) return;

          console.log('WebSocket disconnected');
          if (retryCount < RETRY_COUNT) {
            setTimeout(() => {
              if (mounted.current) {
                setRetryCount(prev => prev + 1);
                connectWebSocket();
              }
            }, RETRY_DELAY);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        socketRef.current = ws;
      } catch (error) {
        console.error('WebSocket connection error:', error);
      }
    };

    connectWebSocket();

    return () => {
      mounted.current = false;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [id, retryCount, handleWebSocketMessage]);

  useEffect(() => {
    if (!mounted.current) return;

    const timestamp = new Date().toLocaleTimeString();
    setResourceHistory(prev => ({
      cpu: [...prev.cpu.slice(-MAX_HISTORY_POINTS), { time: timestamp, value: parseFloat(stats.cpu) }],
      memory: [...prev.memory.slice(-MAX_HISTORY_POINTS), { time: timestamp, value: parseFloat(stats.memory) }],
      disk: [...prev.disk.slice(-MAX_HISTORY_POINTS), { time: timestamp, value: parseFloat(stats.disk) }],
      network: [...prev.network.slice(-MAX_HISTORY_POINTS), { 
        time: timestamp, 
        up: parseFloat(stats.network.up) || 0,
        down: parseFloat(stats.network.down) || 0
      }]
    }));
  }, [stats]);

  const scrollAreaRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Modified scroll effect
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'instant'
          });
        }, 0);
      }
    }
  }, [consoleLines, autoScroll]);

  // Add scroll detection to disable auto-scroll when user manually scrolls up
  const handleScroll = useCallback((event) => {
    const container = event.currentTarget;
    const isAtBottom = Math.abs(
      (container.scrollHeight - container.clientHeight) - container.scrollTop
    ) < 50;
    
    setAutoScroll(isAtBottom);
  }, []);

  const sendCommand = (e) => {
    e?.preventDefault();
    if (!command.trim() || !socketRef.current) return;

    socketRef.current.send(JSON.stringify({
      event: "send command",
      args: [command]
    }));
    setCommandHistory(prev => [command, ...prev.slice(0, 99)]);
    setCommand("");
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistoryIndex(prev => {
        if (prev < commandHistory.length - 1) {
          const newIndex = prev + 1;
          setCommand(commandHistory[newIndex]);
          return newIndex;
        }
        return prev;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistoryIndex(prev => {
        if (prev > -1) {
          const newIndex = prev - 1;
          setCommand(newIndex === -1 ? '' : commandHistory[newIndex]);
          return newIndex;
        }
        return prev;
      });
    }
  };

  const sendPowerAction = (action) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        event: "set state",
        args: [action]
      }));
    }
  };

  if (!server) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
      </div>
    );
  }

  if (serverError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-400">
        Failed to load server data
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-neutral-950">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">{server?.name}</h1>
          <Badge 
            variant={
              serverState === 'running' 
                ? 'success' 
                : serverState === 'starting' 
                  ? 'warning' 
                  : 'secondary'
            }
            className="rounded-md"
          >
            {serverState.toUpperCase()}
          </Badge>
        </div>
        
        <TooltipProvider>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => sendPowerAction('start')}
                  disabled={['starting', 'running'].includes(serverState)}
                >
                  <Power className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start Server</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => sendPowerAction('restart')}
                  disabled={!['running'].includes(serverState)}
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restart Server</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => sendPowerAction('stop')}
                  disabled={!['running'].includes(serverState)}
                >
                  <Square className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop Server</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
      <ResourceStat 
  icon={Cpu}
  title="CPU Usage"
  value={`${stats?.cpu ?? 0}%`}
  secondaryValue={`${server?.limits?.cpu ?? 0}% Limit`}
  chartData={resourceHistory.cpu}
  dataKey="value"
  color={CHART_COLORS.cpu}
  unit="%"
  domain={[0, 100]}
/>
        <ResourceStat 
          icon={MemoryStick}
          title="Memory Usage"
          value={`${stats.memory} MB`}
          secondaryValue={`${server?.limits.memory} MB Limit`}
          chartData={resourceHistory.memory}
          dataKey="value"
          color={CHART_COLORS.memory}
          unit=" MB"
          domain={[0, server?.limits.memory]}
        />
        <ResourceStat 
          icon={HardDrive}
          title="Storage Usage"
          value={`${stats.disk} MB`}
          secondaryValue={`${server?.limits.disk === 0 ? '∞' : server?.limits.disk + ' MB'} Limit`}
          chartData={resourceHistory.disk}
          dataKey="value"
          color={CHART_COLORS.disk}
          unit=" MB"
          domain={server?.limits.disk ? [0, server.limits.disk] : undefined}
        />
        <ResourceStat 
          icon={Network}
          title="Network Traffic"
          value={`↑${stats.network.up} KB/s`}
          secondaryValue={`↓${stats.network.down} KB/s`}
          chartData={resourceHistory.network}
          dataKey="up"
          color={CHART_COLORS.network}
          unit=" KB/s"
          Chart={NetworkChart}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-9">
          <Card className="border-neutral-800/50">
            <Tabs defaultValue="console" className="w-full">
              <CardHeader className="border-b border-neutral-800/50">
                <div className="flex items-center justify-between">
                  <TabsList className="bg-neutral-900">
                    <TabsTrigger value="console" className="gap-2">
                      <Terminal className="w-4 h-4" />
                      Console
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="gap-2">
                      <Database className="w-4 h-4" />
                      Statistics
                    </TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              
              <TabsContent value="console" className="m-0">
    <CardContent className="p-0">
      <ScrollArea 
        ref={scrollAreaRef}
        className="h-[600px] p-4 font-['JetBrains_Mono'] text-sm bg-neutral-950/50"
        onScroll={handleScroll}
      >
        {consoleLines.map((line, i) => (
          <div 
            key={i} 
            className="py-0.5 font-['JetBrains_Mono']"
            dangerouslySetInnerHTML={{ __html: formatConsoleOutput(line) }} 
          />
        ))}
      </ScrollArea>
      <div className="p-4 border-t border-neutral-800/50">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 hidden"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoScroll ? 'text-green-500' : 'text-neutral-500'}`} />
            Auto-scroll {autoScroll ? 'enabled' : 'disabled'}
          </Button>
        </div>
        <form onSubmit={sendCommand} className="flex gap-2">
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-neutral-950/50 border-neutral-800/50"
          />
          <Button type="submit">Send</Button>
        </form>
      </div>
    </CardContent>
  </TabsContent>

              <TabsContent value="stats" className="m-0">
                <CardContent className="p-4">
                  <div className="space-y-6">
                    <div className="grid gap-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-xs text-neutral-500">Uptime</p>
                          <p className="text-sm text-white font-medium">{stats.uptime || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-xs text-neutral-500">Status</p>
                          <p className="text-sm text-white font-medium">{serverState}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <Card className="border-neutral-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Server information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <Server className="w-4 h-4 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">Node</p>
                    <p className="text-sm text-white font-medium">{server?.node}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Network className="w-4 h-4 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">IP Address</p>
                    <p className="text-sm text-white font-medium">
                      {server?.relationships?.allocations?.data?.[0]?.attributes?.ip_alias}:
                      {server?.relationships?.allocations?.data?.[0]?.attributes?.port}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Upload className="w-4 h-4 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">SFTP</p>
                    <p className="text-sm text-white font-medium">
                      {server?.sftp_details?.ip || "-"}:{server?.sftp_details?.port || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}