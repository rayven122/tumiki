"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Copy, Database, Key } from "lucide-react";
import { useState } from "react";

interface ConnectModalProps {
  client: string;
  apiKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectModal({
  client: initialClient,
  apiKey: initialApiKey,
  open,
  onOpenChange,
}: ConnectModalProps) {
  const [client, setClient] = useState(initialClient);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [copied, setCopied] = useState(false);

  const getCommand = () => {
    if (!apiKey) return "";
    return `mcp connect --client ${client} --api-key ${apiKey}`;
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Connect to MCP
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="client">MCP Client</Label>
            <Select value={client} onValueChange={setClient}>
              <SelectTrigger id="client">
                <SelectValue placeholder="Select MCP client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude">Claude Desktop</SelectItem>
                <SelectItem value="cursor">Cursor</SelectItem>
                <SelectItem value="windsurf">Windsurf (Codeium)</SelectItem>
                <SelectItem value="cline">Cline (VS Code)</SelectItem>
                <SelectItem value="witsy">Witsy</SelectItem>
                <SelectItem value="enconvo">Enconvo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              You can find your API key in your account settings.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Generated Command</Label>
            <div className="relative">
              <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">
                {getCommand()}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(getCommand())}
                disabled={!apiKey}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="font-medium">Instructions:</h3>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Copy the command above</li>
              <li>Open your terminal and paste the command</li>
              <li>Restart your MCP client ({client})</li>
              <li>
                Test the connection by asking &quot;List my projects&quot;
              </li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
