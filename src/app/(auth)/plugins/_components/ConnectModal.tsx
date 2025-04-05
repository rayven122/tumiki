"use client";

import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Database, Key, Copy, Check } from "lucide-react";

export function ConnectModal() {
	const [client, setClient] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [copied, setCopied] = useState(false);

	const getCommand = () => {
		if (!apiKey) return "";
		return `mcp connect --client ${client} --api-key ${apiKey}`;
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Database className="h-5 w-5" />
					Connect to MCP
				</CardTitle>
				<CardDescription>
					Generate a command to connect your MCP client to the server.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
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
					<p className="text-xs text-muted-foreground">
						You can find your API key in your account settings.
					</p>
				</div>

				<div className="space-y-2">
					<Label>Generated Command</Label>
					<div className="relative">
						<pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
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

				<div className="text-sm space-y-2">
					<h3 className="font-medium">Instructions:</h3>
					<ol className="list-decimal pl-5 space-y-1">
						<li>Copy the command above</li>
						<li>Open your terminal and paste the command</li>
						<li>Restart your MCP client ({client})</li>
						<li>Test the connection by asking "List my projects"</li>
					</ol>
				</div>
			</CardContent>
		</Card>
	);
}
