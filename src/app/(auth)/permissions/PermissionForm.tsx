"use client";

import {
	CalendarIcon,
	CheckIcon,
	ChevronLeftIcon,
	EyeIcon,
	InfoIcon,
	SaveIcon,
	XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useForm } from "react-hook-form";
import * as z from "zod";

const users = [
	{ id: "user1", name: "山田 太郎" },
	{ id: "user2", name: "佐藤 花子" },
	{ id: "user3", name: "鈴木 一郎" },
	{ id: "user4", name: "田中 次郎" },
];

const teams = [
	{ id: "team1", name: "開発チーム" },
	{ id: "team2", name: "マーケティングチーム" },
	{ id: "team3", name: "運用チーム" },
];

const toolScopes = {
	Slack: [
		{
			id: "chat:write",
			name: "メッセージ送信",
			description: "チャンネルにメッセージを送信できます",
		},
		{
			id: "channels:read",
			name: "チャンネル閲覧",
			description: "チャンネル情報を閲覧できます",
		},
		{
			id: "channels:manage",
			name: "チャンネル管理",
			description: "チャンネルの作成・編集・削除ができます",
		},
		{
			id: "users:read",
			name: "ユーザー閲覧",
			description: "ユーザー情報を閲覧できます",
		},
	],
	Notion: [
		{
			id: "page:read",
			name: "ページ閲覧",
			description: "ページを閲覧できます",
		},
		{
			id: "page:edit",
			name: "ページ編集",
			description: "ページを編集できます",
		},
		{
			id: "database:read",
			name: "データベース閲覧",
			description: "データベースを閲覧できます",
		},
		{
			id: "database:edit",
			name: "データベース編集",
			description: "データベースを編集できます",
		},
	],
	Playwright: [
		{
			id: "browser:launch",
			name: "ブラウザ起動",
			description: "ブラウザを起動できます",
		},
		{
			id: "page:navigate",
			name: "ページ遷移",
			description: "ページを遷移できます",
		},
		{
			id: "page:screenshot",
			name: "スクリーンショット",
			description: "スクリーンショットを取得できます",
		},
		{
			id: "page:interact",
			name: "ページ操作",
			description: "ページ上の要素を操作できます",
		},
	],
	GitHub: [
		{
			id: "repo:read",
			name: "リポジトリ閲覧",
			description: "リポジトリを閲覧できます",
		},
		{
			id: "repo:write",
			name: "リポジトリ編集",
			description: "リポジトリを編集できます",
		},
		{
			id: "pull:read",
			name: "プルリクエスト閲覧",
			description: "プルリクエストを閲覧できます",
		},
		{
			id: "pull:write",
			name: "プルリクエスト編集",
			description: "プルリクエストを編集できます",
		},
	],
};

const formSchema = z.object({
	name: z.string().min(1, "権限名は必須です"),
	description: z.string().min(1, "説明は必須です"),
	toolType: z.enum(["Slack", "Notion", "Playwright", "GitHub"]),
	expirationDate: z.date().optional(),
	status: z.boolean(),
	scopes: z
		.array(z.string())
		.min(1, "少なくとも1つのスコープを選択してください"),
	targets: z
		.object({
			users: z.array(z.string()).optional(),
			teams: z.array(z.string()).optional(),
		})
		.refine(
			(data) =>
				(data.users && data.users.length > 0) ||
				(data.teams && data.teams.length > 0),
			{
				message: "少なくとも1つのユーザーまたはチームを選択してください",
				path: ["users"],
			},
		),
});

type PermissionFormValues = z.infer<typeof formSchema>;

type PermissionFormProps = {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	initialData?: any;
};

export function PermissionForm({ initialData }: PermissionFormProps) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState("basic");
	const [previewMode, setPreviewMode] = useState(false);

	const form = useForm<PermissionFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: initialData
			? {
					name: initialData.name,
					description: initialData.description,
					toolType: initialData.toolType,
					expirationDate: initialData.expirationDate
						? new Date(initialData.expirationDate)
						: undefined,
					status: initialData.status === "active",
					scopes: initialData.scopes || [],
					targets: {
						users:
							initialData.targets?.filter((t: string) =>
								t.startsWith("user"),
							) || [],
						teams:
							initialData.targets?.filter((t: string) =>
								t.startsWith("team"),
							) || [],
					},
				}
			: {
					name: "",
					description: "",
					toolType: "Slack",
					status: true,
					scopes: [],
					targets: {
						users: [],
						teams: [],
					},
				},
	}) as ReturnType<typeof useForm<PermissionFormValues>>;

	const watchToolType = form.watch("toolType");

	const onSubmit = (values: PermissionFormValues) => {
		// In a real app, this would send data to an API
		console.log(values);

		// Navigate back to permissions list
		router.push("/permissions");
	};

	return (
		<div>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<div className="flex flex-col gap-6">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => router.push("/permissions")}
								>
									<ChevronLeftIcon className="mr-1 h-4 w-4" />
									戻る
								</Button>
							</div>
							<div className="flex items-center gap-2">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setPreviewMode(!previewMode)}
											>
												<EyeIcon className="mr-1 h-4 w-4" />
												{previewMode ? "編集モード" : "プレビュー"}
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>入力内容のプレビューを表示します</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<Button type="submit" size="sm">
									<SaveIcon className="mr-1 h-4 w-4" />
									保存
								</Button>
							</div>
						</div>

						{previewMode ? (
							<PermissionPreview formValues={form.getValues()} />
						) : (
							<Tabs
								value={activeTab}
								onValueChange={setActiveTab}
								className="w-full"
							>
								<TabsList className="grid w-full grid-cols-3">
									<TabsTrigger value="basic">基本情報</TabsTrigger>
									<TabsTrigger value="scopes">権限スコープ</TabsTrigger>
									<TabsTrigger value="targets">付与対象</TabsTrigger>
								</TabsList>

								<TabsContent value="basic" className="space-y-4 pt-4">
									<Card>
										<CardContent className="pt-6">
											<div className="grid gap-6">
												<FormField
													control={form.control}
													name="toolType"
													render={({ field }) => (
														<FormItem>
															<FormLabel>ツール種別</FormLabel>
															<Select
																onValueChange={field.onChange}
																defaultValue={field.value}
															>
																<FormControl>
																	<SelectTrigger>
																		<SelectValue placeholder="ツール種別を選択" />
																	</SelectTrigger>
																</FormControl>
																<SelectContent>
																	<SelectItem value="Slack">Slack</SelectItem>
																	<SelectItem value="Notion">Notion</SelectItem>
																	<SelectItem value="Playwright">
																		Playwright
																	</SelectItem>
																	<SelectItem value="GitHub">GitHub</SelectItem>
																</SelectContent>
															</Select>
															<FormDescription>
																権限を付与する外部サービスツールを選択してください
															</FormDescription>
															<FormMessage />
														</FormItem>
													)}
												/>

												<FormField
													control={form.control}
													name="name"
													render={({ field }) => (
														<FormItem>
															<FormLabel>権限名</FormLabel>
															<FormControl>
																<Input placeholder="権限名を入力" {...field} />
															</FormControl>
															<FormDescription>
																権限の用途がわかりやすい名前を設定してください
															</FormDescription>
															<FormMessage />
														</FormItem>
													)}
												/>

												<FormField
													control={form.control}
													name="description"
													render={({ field }) => (
														<FormItem>
															<FormLabel>説明</FormLabel>
															<FormControl>
																<Textarea
																	placeholder="権限の説明を入力"
																	className="min-h-[100px]"
																	{...field}
																/>
															</FormControl>
															<FormDescription>
																権限の目的や用途について詳細に記述してください
															</FormDescription>
															<FormMessage />
														</FormItem>
													)}
												/>

												<FormField
													control={form.control}
													name="expirationDate"
													render={({ field }) => (
														<FormItem className="flex flex-col">
															<FormLabel>有効期限</FormLabel>
															<Popover>
																<PopoverTrigger asChild>
																	<FormControl>
																		<Button
																			variant={"outline"}
																			className={cn(
																				"w-full pl-3 text-left font-normal",
																				!field.value && "text-muted-foreground",
																			)}
																		>
																			{field.value ? (
																				format(field.value, "yyyy年MM月dd日", {
																					locale: ja,
																				})
																			) : (
																				<span>有効期限を選択</span>
																			)}
																			<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
																		</Button>
																	</FormControl>
																</PopoverTrigger>
																<PopoverContent
																	className="w-auto p-0"
																	align="start"
																>
																	<Calendar
																		mode="single"
																		selected={field.value}
																		onSelect={field.onChange}
																		disabled={(date) =>
																			date <
																			new Date(new Date().setHours(0, 0, 0, 0))
																		}
																		initialFocus
																	/>
																</PopoverContent>
															</Popover>
															<FormDescription>
																権限の有効期限を設定します。設定しない場合は無期限となります。
															</FormDescription>
															<FormMessage />
														</FormItem>
													)}
												/>

												<FormField
													control={form.control}
													name="status"
													render={({ field }) => (
														<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
															<div className="space-y-0.5">
																<FormLabel className="text-base">
																	ステータス
																</FormLabel>
																<FormDescription>
																	権限を有効または無効にします
																</FormDescription>
															</div>
															<FormControl>
																<Switch
																	checked={field.value}
																	onCheckedChange={field.onChange}
																/>
															</FormControl>
														</FormItem>
													)}
												/>
											</div>
										</CardContent>
									</Card>
								</TabsContent>

								<TabsContent value="scopes" className="space-y-4 pt-4">
									<Card>
										<CardContent className="pt-6">
											<FormField
												control={form.control}
												name="scopes"
												render={() => (
													<FormItem>
														<div className="mb-4">
															<FormLabel className="text-base">
																権限スコープ
															</FormLabel>
															<FormDescription>
																{watchToolType}
																に対して付与する権限スコープを選択してください
															</FormDescription>
														</div>
														<div className="space-y-4">
															{toolScopes[
																watchToolType as keyof typeof toolScopes
															].map((scope) => (
																<FormField
																	key={scope.id}
																	control={form.control}
																	name="scopes"
																	render={({ field }) => {
																		return (
																			<FormItem
																				key={scope.id}
																				className="flex flex-row items-start space-x-3 space-y-0"
																			>
																				<FormControl>
																					<Checkbox
																						checked={field.value?.includes(
																							scope.id,
																						)}
																						onCheckedChange={(checked) => {
																							return checked
																								? field.onChange([
																										...field.value,
																										scope.id,
																									])
																								: field.onChange(
																										field.value?.filter(
																											(value) =>
																												value !== scope.id,
																										),
																									);
																						}}
																					/>
																				</FormControl>
																				<div className="space-y-1 leading-none">
																					<FormLabel className="font-medium">
																						{scope.name}
																					</FormLabel>
																					<FormDescription>
																						{scope.description}
																					</FormDescription>
																				</div>
																			</FormItem>
																		);
																	}}
																/>
															))}
														</div>
														<FormMessage className="mt-4" />
													</FormItem>
												)}
											/>
										</CardContent>
									</Card>
								</TabsContent>

								<TabsContent value="targets" className="space-y-4 pt-4">
									<Card>
										<CardContent className="pt-6">
											<div className="grid gap-6">
												<div>
													<h3 className="font-medium text-lg">付与対象</h3>
													<p className="text-muted-foreground text-sm">
														権限を付与するユーザーまたはチームを選択してください
													</p>
												</div>

												<FormField
													control={form.control}
													name="targets.users"
													render={() => (
														<FormItem>
															<FormLabel className="text-base">
																ユーザー
															</FormLabel>
															<div className="space-y-4">
																{users.map((user) => (
																	<FormField
																		key={user.id}
																		control={form.control}
																		name="targets.users"
																		render={({ field }) => {
																			return (
																				<FormItem
																					key={user.id}
																					className="flex flex-row items-start space-x-3 space-y-0"
																				>
																					<FormControl>
																						<Checkbox
																							checked={field.value?.includes(
																								user.id,
																							)}
																							onCheckedChange={(checked) => {
																								return checked
																									? field.onChange([
																											...(field.value || []),
																											user.id,
																										])
																									: field.onChange(
																											field.value?.filter(
																												(value) =>
																													value !== user.id,
																											),
																										);
																							}}
																						/>
																					</FormControl>
																					<FormLabel className="font-normal">
																						{user.name}
																					</FormLabel>
																				</FormItem>
																			);
																		}}
																	/>
																))}
															</div>
															<FormMessage />
														</FormItem>
													)}
												/>

												<FormField
													control={form.control}
													name="targets.teams"
													render={() => (
														<FormItem>
															<FormLabel className="text-base">
																チーム
															</FormLabel>
															<div className="space-y-4">
																{teams.map((team) => (
																	<FormField
																		key={team.id}
																		control={form.control}
																		name="targets.teams"
																		render={({ field }) => {
																			return (
																				<FormItem
																					key={team.id}
																					className="flex flex-row items-start space-x-3 space-y-0"
																				>
																					<FormControl>
																						<Checkbox
																							checked={field.value?.includes(
																								team.id,
																							)}
																							onCheckedChange={(checked) => {
																								return checked
																									? field.onChange([
																											...(field.value || []),
																											team.id,
																										])
																									: field.onChange(
																											field.value?.filter(
																												(value) =>
																													value !== team.id,
																											),
																										);
																							}}
																						/>
																					</FormControl>
																					<FormLabel className="font-normal">
																						{team.name}
																					</FormLabel>
																				</FormItem>
																			);
																		}}
																	/>
																))}
															</div>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>
										</CardContent>
									</Card>
								</TabsContent>
							</Tabs>
						)}
					</div>
				</form>
			</Form>
		</div>
	);
}

type PermissionPreviewProps = {
	formValues: PermissionFormValues;
};

function PermissionPreview({ formValues }: PermissionPreviewProps) {
	const {
		name,
		description,
		toolType,
		expirationDate,
		status,
		scopes,
		targets,
	} = formValues;

	// Get selected scope names
	const selectedScopes = toolScopes[toolType as keyof typeof toolScopes]
		.filter((scope) => scopes.includes(scope.id))
		.map((scope) => scope.name);

	// Get selected user names
	const selectedUsers = users
		.filter((user) => targets.users?.includes(user.id))
		.map((user) => user.name);

	// Get selected team names
	const selectedTeams = teams
		.filter((team) => targets.teams?.includes(team.id))
		.map((team) => team.name);

	return (
		<Card>
			<CardContent className="pt-6">
				<div className="space-y-6">
					<div className="flex items-start justify-between">
						<div>
							<h2 className="font-bold text-2xl">{name}</h2>
							<p className="text-muted-foreground">{description}</p>
						</div>
						<div className="flex items-center gap-2">
							{status ? (
								<div className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-green-600 text-sm">
									<CheckIcon className="h-4 w-4" />
									<span>有効</span>
								</div>
							) : (
								<div className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-red-600 text-sm">
									<XIcon className="h-4 w-4" />
									<span>無効</span>
								</div>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div>
							<h3 className="mb-2 font-medium text-muted-foreground text-sm">
								基本情報
							</h3>
							<div className="space-y-4">
								<div>
									<div className="font-medium text-sm">ツール種別</div>
									<div className="mt-1">
										<span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700 text-sm ring-1 ring-blue-700/10 ring-inset">
											{toolType}
										</span>
									</div>
								</div>

								<div>
									<div className="font-medium text-sm">有効期限</div>
									<div className="mt-1">
										{expirationDate ? (
											format(expirationDate, "yyyy年MM月dd日", { locale: ja })
										) : (
											<span className="text-muted-foreground">無期限</span>
										)}
									</div>
								</div>
							</div>
						</div>

						<div>
							<h3 className="mb-2 font-medium text-muted-foreground text-sm">
								権限スコープ
							</h3>
							<div className="space-y-2">
								{selectedScopes.length > 0 ? (
									selectedScopes.map((scope) => (
										<div key={scope} className="flex items-center gap-2">
											<CheckIcon className="h-4 w-4 text-green-500" />
											<span>{scope}</span>
										</div>
									))
								) : (
									<div className="text-muted-foreground">
										権限スコープが選択されていません
									</div>
								)}
							</div>
						</div>
					</div>

					<div>
						<h3 className="mb-2 font-medium text-muted-foreground text-sm">
							付与対象
						</h3>
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
							<div>
								<div className="mb-2 font-medium text-sm">ユーザー</div>
								<div className="space-y-2">
									{selectedUsers.length > 0 ? (
										selectedUsers.map((user) => (
											<div key={user} className="flex items-center gap-2">
												<div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs">
													{user.charAt(0)}
												</div>
												<span>{user}</span>
											</div>
										))
									) : (
										<div className="text-muted-foreground">
											ユーザーが選択されていません
										</div>
									)}
								</div>
							</div>

							<div>
								<div className="mb-2 font-medium text-sm">チーム</div>
								<div className="space-y-2">
									{selectedTeams.length > 0 ? (
										selectedTeams.map((team) => (
											<div key={team} className="flex items-center gap-2">
												<div className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 text-blue-700 text-xs">
													{team.charAt(0)}
												</div>
												<span>{team}</span>
											</div>
										))
									) : (
										<div className="text-muted-foreground">
											チームが選択されていません
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					<div className="border-t pt-4">
						<div className="flex items-center gap-1 text-muted-foreground text-sm">
							<InfoIcon className="h-4 w-4" />
							<span>
								これはプレビューです。実際の権限を保存するには「編集モード」に戻って保存してください。
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
