import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Terminal, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";

const RETRY_COUNT = 5;
const RETRY_DELAY = 5000;

const formatConsoleOutput = (line) => {
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
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef(null);
  const mounted = useRef(true);

  const handleWebSocketMessage = useCallback((event) => {
    if (!mounted.current) return;

    try {
      const message = JSON.parse(event.data);

      switch (message.event) {
        case 'auth success':
          socketRef.current?.send(JSON.stringify({ event: 'send logs', args: [null] }));
          break;

        case 'console output':
          setConsoleLines(prev => [...prev.slice(-1000), message.args[0]]);
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

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
          <ScrollArea 
            ref={scrollAreaRef}
            className="h-[600px] p-4 font-mono text-sm bg-neutral-950/50"
            onScroll={handleScroll}
          >
            {consoleLines.map((line, i) => (
              <div 
                key={i} 
                className="py-0.5"
                dangerouslySetInnerHTML={{ __html: formatConsoleOutput(line) }} 
              />
            ))}
          </ScrollArea>
          <div className="border-t border-neutral-800/50">
            <div className="hidden flex items-center gap-2 mb-2 pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => setAutoScroll(!autoScroll)}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoScroll ? 'text-green-500' : 'text-neutral-500'}`} />
                Auto-scroll {autoScroll ? 'enabled' : 'disabled'}
              </Button>
            </div>
            <form onSubmit={sendCommand} className="flex gap-2 pt-4">
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
    </div>
  );
}