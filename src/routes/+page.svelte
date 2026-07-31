<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import {
		SvelteFlow,
		Background,
		BackgroundVariant,
		Controls,
		type Node,
		type Edge
	} from '@xyflow/svelte';
	import {
		ChevronDown,
		Settings,
		Eye,
		MessageCircle,
		Workflow,
		Hexagon,
		CircleAlert
	} from '@lucide/svelte';
	import '@xyflow/svelte/dist/style.css';
	import type { EsdmGraph, EsdmNode } from '$lib/types.js';
	import ActorNode from '$lib/components/ActorNode.svelte';
	import { NODE_COLORS } from '$lib/node-colors.js';
	import CommandNode from '$lib/components/CommandNode.svelte';
	import QueryNode from '$lib/components/QueryNode.svelte';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuLabel,
		DropdownMenuRadioGroup,
		DropdownMenuRadioItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import EventNode from '$lib/components/EventNode.svelte';
	import ReadModelNode from '$lib/components/ReadModelNode.svelte';
	import AggregateNode from '$lib/components/AggregateNode.svelte';
	import NodeDetailSheet from '$lib/components/NodeDetailSheet.svelte';
	import VisibilitySheet from '$lib/components/VisibilitySheet.svelte';
	import DomainStorySheet from '$lib/components/DomainStorySheet.svelte';
	import FeatureSheet from '$lib/components/FeatureSheet.svelte';

	let { data }: import('./$types').PageProps = $props();

	const nodeTypes = {
		actor: ActorNode,
		command: CommandNode,
		event: EventNode,
		aggregate: AggregateNode,
		query: QueryNode,
		'read-model': ReadModelNode
	};

	const SETTINGS_KEY = 'esdm-visualizer-settings';

	// Persisted settings
	let animateEdges = $state(true);
	let showLegend = $state(false);
	// Seeded from the pre-paint script in app.html so the toggle matches the rendered theme.
	let darkMode = $state(false);

	onMount(() => {
		try {
			const saved = localStorage.getItem(SETTINGS_KEY);
			if (saved) {
				const parsed = JSON.parse(saved) as {
					animateEdges?: boolean;
					showLegend?: boolean;
					darkMode?: boolean;
				};
				if (typeof parsed.animateEdges === 'boolean') {
					animateEdges = parsed.animateEdges;
				}
				if (typeof parsed.showLegend === 'boolean') {
					showLegend = parsed.showLegend;
				}
				if (typeof parsed.darkMode === 'boolean') {
					darkMode = parsed.darkMode;
				}
			}
		} catch {
			// ignore
		}
	});

	$effect(() => {
		document.documentElement.classList.toggle('dark', darkMode);
	});

	function saveSettings() {
		try {
			localStorage.setItem(SETTINGS_KEY, JSON.stringify({ animateEdges, showLegend, darkMode }));
		} catch {
			// ignore
		}
	}

	const NODE_HEIGHT = 110;
	const NODE_WIDTH = {
		actor: 240,
		command: 256,
		aggregate: 288,
		event: 224,
		query: 256,
		'read-model': 256
	};
	const LAYOUT_GAP = {
		actorToAggregate: 72,
		aggregateToCommands: 88,
		commandsToEvents: 68,
		eventsToReadModels: 68,
		readModelsToQueries: 56,
		actorX: 64,
		commandX: 88,
		eventY: 24,
		readModelY: 24,
		queryY: 20,
		aggregateX: 96
	};

	function spanWidth(count: number, width: number, gap: number) {
		if (count <= 0) return 0;
		return count * width + (count - 1) * gap;
	}

	function blockHeight(count: number, gap: number) {
		if (count <= 0) return 0;
		return count * NODE_HEIGHT + (count - 1) * gap;
	}

	function average(values: number[]) {
		if (values.length === 0) return 0;
		return values.reduce((sum, value) => sum + value, 0) / values.length;
	}

	function buildFlow(
		graph: EsdmGraph,
		focusAggregate: string,
		animate: boolean,
		hiddenCmds: Set<string>
	) {
		const actorNodeIds = new Set(
			graph.nodes.filter((node) => node.kind === 'actor').map((node) => node.id)
		);
		const commands = graph.nodes.filter(
			(n) => n.kind === 'command' && n.aggregate === focusAggregate && !hiddenCmds.has(n.id)
		);
		// Events are visible only if at least one of their producing commands is visible
		const allEvents = graph.nodes.filter(
			(n) => n.kind === 'event' && n.aggregate === focusAggregate
		);
		const visibleCommandIds = new Set(commands.map((c) => c.id));
		const commandToEventEdges = graph.edges.filter(
			(e) =>
				graph.nodes.some(
					(n) => n.id === e.source && n.kind === 'command' && n.aggregate === focusAggregate
				) &&
				graph.nodes.some(
					(n) => n.id === e.target && n.kind === 'event' && n.aggregate === focusAggregate
				)
		);
		const producingCommandsByEvent: Record<string, Set<string>> = {};
		for (const e of commandToEventEdges) {
			if (!producingCommandsByEvent[e.target]) producingCommandsByEvent[e.target] = new Set();
			producingCommandsByEvent[e.target].add(e.source);
		}
		const events = allEvents.filter((ev) => {
			const producers = producingCommandsByEvent[ev.id];
			// No recorded producers → keep visible; otherwise visible if ≥1 producer is visible
			if (!producers || producers.size === 0) return true;
			return [...producers].some((cid) => visibleCommandIds.has(cid));
		});
		const readModels = graph.nodes.filter(
			(n) => n.kind === 'read-model' && n.aggregate === focusAggregate
		);
		const queries = graph.nodes.filter((n) => n.kind === 'query' && n.aggregate === focusAggregate);
		const aggregates = graph.nodes.filter(
			(n) => n.kind === 'aggregate' && n.name === focusAggregate
		);
		const actorTargetIds = new Set([
			...commands.map((node) => node.id),
			...queries.map((node) => node.id)
		]);
		const incomingActorEdges = graph.edges.filter(
			(edge) => actorNodeIds.has(edge.source) && actorTargetIds.has(edge.target)
		);
		const inScopeActorIds = new Set(incomingActorEdges.map((edge) => edge.source));
		const actors = graph.nodes.filter(
			(node) => node.kind === 'actor' && inScopeActorIds.has(node.id)
		);

		const flowNodes: Node[] = [];
		const actorSpan = spanWidth(actors.length, NODE_WIDTH.actor, LAYOUT_GAP.actorX);
		const aggregateSpan = spanWidth(aggregates.length, NODE_WIDTH.aggregate, LAYOUT_GAP.aggregateX);
		const commandSpan = spanWidth(commands.length, NODE_WIDTH.command, LAYOUT_GAP.commandX);
		const canvasWidth = Math.max(actorSpan, aggregateSpan, commandSpan, NODE_WIDTH.aggregate);
		const actorStartX = (canvasWidth - actorSpan) / 2;
		const commandStartX = (canvasWidth - commandSpan) / 2;
		const actorY = 0;
		const aggregateY = actors.length > 0 ? NODE_HEIGHT + LAYOUT_GAP.actorToAggregate : 0;
		const commandsY =
			aggregates.length > 0 ? aggregateY + NODE_HEIGHT + LAYOUT_GAP.aggregateToCommands : 0;
		const eventsY = commandsY + NODE_HEIGHT + LAYOUT_GAP.commandsToEvents;
		const commandCenters: Record<string, number> = {};
		const queryCenters: Record<string, number> = {};
		const eventCenters: Record<string, number> = {};
		const readModelCenters: Record<string, number> = {};
		const commandEventCounts: Record<string, number> = {};
		const eventReadModelCounts: Record<string, number> = {};
		const readModelQueryCounts: Record<string, number> = {};
		const commandIds = new Set(commands.map((command) => command.id));
		const eventIds = new Set(events.map((event) => event.id));
		const readModelIds = new Set(readModels.map((readModel) => readModel.id));
		const queryIds = new Set(queries.map((query) => query.id));
		const incomingEventEdges = graph.edges.filter(
			(edge) => commandIds.has(edge.source) && eventIds.has(edge.target)
		);
		const incomingReadModelEdges = graph.edges.filter(
			(edge) => eventIds.has(edge.source) && readModelIds.has(edge.target)
		);
		const incomingQueryEdges = graph.edges.filter(
			(edge) => readModelIds.has(edge.source) && queryIds.has(edge.target)
		);
		const incomingCommandIdsByEvent: Record<string, string[]> = {};
		const incomingEventIdsByReadModel: Record<string, string[]> = {};
		const incomingReadModelIdsByQuery: Record<string, string[]> = {};

		for (const [index, n] of commands.entries()) {
			const commandX = commandStartX + index * (NODE_WIDTH.command + LAYOUT_GAP.commandX);
			commandCenters[n.id] = commandX + NODE_WIDTH.command / 2;
			commandEventCounts[n.id] = 0;

			flowNodes.push({
				id: n.id,
				type: 'command',
				width: NODE_WIDTH.command,
				height: NODE_HEIGHT,
				position: {
					x: commandX,
					y: commandsY
				},
				data: n as unknown as Record<string, unknown>
			});
		}

		for (const edge of incomingEventEdges) {
			const eventCommandIds = incomingCommandIdsByEvent[edge.target] ?? [];
			eventCommandIds.push(edge.source);
			incomingCommandIdsByEvent[edge.target] = eventCommandIds;
		}

		for (const edge of incomingReadModelEdges) {
			const readModelEventIds = incomingEventIdsByReadModel[edge.target] ?? [];
			readModelEventIds.push(edge.source);
			incomingEventIdsByReadModel[edge.target] = readModelEventIds;
		}

		for (const edge of incomingQueryEdges) {
			const queryReadModelIds = incomingReadModelIdsByQuery[edge.target] ?? [];
			queryReadModelIds.push(edge.source);
			incomingReadModelIdsByQuery[edge.target] = queryReadModelIds;
		}

		for (const [index, n] of aggregates.entries()) {
			flowNodes.push({
				id: n.id,
				type: 'aggregate',
				width: NODE_WIDTH.aggregate,
				height: NODE_HEIGHT,
				position: {
					x: index * (NODE_WIDTH.aggregate + LAYOUT_GAP.aggregateX),
					y: 0
				},
				data: n as unknown as Record<string, unknown>
			});
		}

		for (const n of events) {
			const incomingCommandIds = [...new Set(incomingCommandIdsByEvent[n.id] ?? [])];
			const anchorCommandIds =
				incomingCommandIds.length > 0
					? incomingCommandIds
					: commands.slice(0, 1).map((command) => command.id);
			const anchorCenters = anchorCommandIds
				.map((commandId) => commandCenters[commandId])
				.filter((center): center is number => center !== undefined);
			const anchorCenter = anchorCenters.length > 0 ? average(anchorCenters) : canvasWidth / 2;
			const anchorX = anchorCenter - NODE_WIDTH.event / 2;
			const stackIndex = Math.max(
				...anchorCommandIds.map((commandId) => commandEventCounts[commandId] ?? 0),
				0
			);

			for (const commandId of anchorCommandIds) {
				commandEventCounts[commandId] = stackIndex + 1;
			}

			eventCenters[n.id] = anchorCenter;

			flowNodes.push({
				id: n.id,
				type: 'event',
				width: NODE_WIDTH.event,
				height: NODE_HEIGHT,
				position: {
					x: anchorX,
					y: eventsY + stackIndex * (NODE_HEIGHT + LAYOUT_GAP.eventY)
				},
				data: n as unknown as Record<string, unknown>
			});
		}

		const eventStackDepth = Math.max(...Object.values(commandEventCounts), 0);
		const readModelsY =
			eventStackDepth > 0
				? eventsY + blockHeight(eventStackDepth, LAYOUT_GAP.eventY) + LAYOUT_GAP.eventsToReadModels
				: eventsY;

		for (const n of readModels) {
			const incomingEventIds = [...new Set(incomingEventIdsByReadModel[n.id] ?? [])];
			const anchorEventIds =
				incomingEventIds.length > 0
					? incomingEventIds
					: events.slice(0, 1).map((event) => event.id);
			const anchorCenters = anchorEventIds
				.map((eventId) => eventCenters[eventId])
				.filter((center): center is number => center !== undefined);
			const anchorCenter = anchorCenters.length > 0 ? average(anchorCenters) : canvasWidth / 2;
			const stackIndex = Math.max(
				...anchorEventIds.map((eventId) => eventReadModelCounts[eventId] ?? 0),
				0
			);

			for (const eventId of anchorEventIds) {
				eventReadModelCounts[eventId] = stackIndex + 1;
			}

			readModelCenters[n.id] = anchorCenter;

			flowNodes.push({
				id: n.id,
				type: 'read-model',
				width: NODE_WIDTH['read-model'],
				height: NODE_HEIGHT,
				position: {
					x: anchorCenter - NODE_WIDTH['read-model'] / 2,
					y: readModelsY + stackIndex * (NODE_HEIGHT + LAYOUT_GAP.readModelY)
				},
				data: n as unknown as Record<string, unknown>
			});
		}

		const readModelStackDepth = Math.max(...Object.values(eventReadModelCounts), 0);
		const queriesY =
			readModelStackDepth > 0
				? readModelsY +
					blockHeight(readModelStackDepth, LAYOUT_GAP.readModelY) +
					LAYOUT_GAP.readModelsToQueries
				: readModelsY;

		for (const n of queries) {
			const incomingReadModelIds = [...new Set(incomingReadModelIdsByQuery[n.id] ?? [])];
			const anchorReadModelIds =
				incomingReadModelIds.length > 0
					? incomingReadModelIds
					: readModels.slice(0, 1).map((readModel) => readModel.id);
			const anchorCenters = anchorReadModelIds
				.map((readModelId) => readModelCenters[readModelId])
				.filter((center): center is number => center !== undefined);
			const anchorCenter = anchorCenters.length > 0 ? average(anchorCenters) : canvasWidth / 2;
			const stackIndex = Math.max(
				...anchorReadModelIds.map((readModelId) => readModelQueryCounts[readModelId] ?? 0),
				0
			);

			for (const readModelId of anchorReadModelIds) {
				readModelQueryCounts[readModelId] = stackIndex + 1;
			}

			flowNodes.push({
				id: n.id,
				type: 'query',
				width: NODE_WIDTH.query,
				height: NODE_HEIGHT,
				position: {
					x: anchorCenter - NODE_WIDTH.query / 2,
					y: queriesY + stackIndex * (NODE_HEIGHT + LAYOUT_GAP.queryY)
				},
				data: n as unknown as Record<string, unknown>
			});

			queryCenters[n.id] = anchorCenter;
		}

		const actorTargetIdsByActor: Record<string, string[]> = {};

		for (const edge of incomingActorEdges) {
			const actorTargets = actorTargetIdsByActor[edge.source] ?? [];
			actorTargets.push(edge.target);
			actorTargetIdsByActor[edge.source] = actorTargets;
		}

		const sortedActors = [...actors].sort((left, right) => {
			const leftCenters = [...new Set(actorTargetIdsByActor[left.id] ?? [])]
				.map((targetId) => commandCenters[targetId] ?? queryCenters[targetId])
				.filter((center): center is number => center !== undefined);
			const rightCenters = [...new Set(actorTargetIdsByActor[right.id] ?? [])]
				.map((targetId) => commandCenters[targetId] ?? queryCenters[targetId])
				.filter((center): center is number => center !== undefined);

			return average(leftCenters) - average(rightCenters);
		});

		for (const [index, n] of sortedActors.entries()) {
			flowNodes.push({
				id: n.id,
				type: 'actor',
				width: NODE_WIDTH.actor,
				height: NODE_HEIGHT,
				position: {
					x: actorStartX + index * (NODE_WIDTH.actor + LAYOUT_GAP.actorX),
					y: actorY
				},
				data: n as unknown as Record<string, unknown>
			});
		}

		const inScope = new Set(flowNodes.map((n) => n.id));
		const flowEdges: Edge[] = graph.edges
			.filter((e) => inScope.has(e.source) && inScope.has(e.target))
			.map((e) => ({
				id: e.id,
				source: e.source,
				target: e.target,
				animated: animate,
				style: 'stroke:#94a3b8;stroke-width:1.5px;',
				markerEnd: { type: 'arrowclosed', color: '#94a3b8' }
			}));

		return { flowNodes, flowEdges };
	}

	let visibilitySheetOpen = $state(false);
	let storySheetOpen = $state(false);
	let featureSheetOpen = $state(false);
	let hiddenCommandIds = $state(new Set<string>());

	let { flowNodes, flowEdges } = $derived(
		buildFlow(data.graph, data.selectedAggregate, animateEdges, hiddenCommandIds)
	);

	const nodes = $derived(flowNodes);
	const edges = $derived(flowEdges);

	let sheetOpen = $state(false);
	let selectedNode = $state<EsdmNode | null>(null);

	// Expose the current aggregate's commands for the visibility sheet
	const currentCommands = $derived(
		data.graph.nodes.filter(
			(n: EsdmNode) => n.kind === 'command' && n.aggregate === data.selectedAggregate
		)
	);

	function onNodeClick({ node }: { event: MouseEvent | TouchEvent; node: Node }) {
		selectedNode = node.data as unknown as EsdmNode;
		sheetOpen = true;
	}

	function buildSelectionPath(boundedContext: string, aggregate?: string): `/?${string}` {
		const parts = [`boundedContext=${encodeURIComponent(boundedContext)}`];

		if (aggregate) {
			parts.push(`aggregate=${encodeURIComponent(aggregate)}`);
		}

		return `/?${parts.join('&')}`;
	}

	function selectBoundedContext(boundedContext: string) {
		if (boundedContext === data.selectedBoundedContext) return;

		hiddenCommandIds = new Set();
		const destination = resolve(buildSelectionPath(boundedContext));

		void goto(destination, {
			keepFocus: true,
			noScroll: true
		});
	}

	function selectAggregate(aggregate: string) {
		if (aggregate === data.selectedAggregate) return;

		hiddenCommandIds = new Set();
		const destination = resolve(buildSelectionPath(data.selectedBoundedContext, aggregate));

		void goto(destination, {
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<div class="flex h-screen w-screen flex-col">
	<header
		class="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
	>
		<!-- Left: scrollable breadcrumb + legend -->
		<div class="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto">
			<div class="flex shrink-0 items-center gap-2">
				<div class="relative flex h-7 w-7 items-center justify-center">
					<Hexagon
						size={28}
						class="absolute text-slate-800 dark:text-slate-200"
						strokeWidth={1.5}
					/>
					<Hexagon
						size={20}
						class="absolute text-indigo-500 dark:text-indigo-400"
						strokeWidth={2}
					/>
				</div>
				<h1 class="text-sm font-bold tracking-widest text-slate-800 uppercase dark:text-slate-100">
					ESDM
				</h1>
			</div>
			{#if !data.modelError}
				{#if data.domainDisplayName}
					<span class="h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700"></span>
					<span class="shrink-0 text-sm font-medium text-slate-700 dark:text-slate-200">
						{data.domainDisplayName}
					</span>
				{/if}
				<span class="h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700"></span>
				<DropdownMenu>
					<DropdownMenuTrigger
						class="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
					>
						{data.boundedContextDisplayNames[data.selectedBoundedContext] ??
							data.selectedBoundedContext}
						<ChevronDown size={14} class="text-slate-400 dark:text-slate-500" />
					</DropdownMenuTrigger>
					<DropdownMenuContent class="w-max">
						<DropdownMenuLabel>Bounded Context</DropdownMenuLabel>
						<DropdownMenuRadioGroup value={data.selectedBoundedContext}>
							{#each data.boundedContextOptions as boundedContext (boundedContext)}
								<DropdownMenuRadioItem
									value={boundedContext}
									onclick={() => selectBoundedContext(boundedContext)}
								>
									{data.boundedContextDisplayNames[boundedContext] ?? boundedContext}
								</DropdownMenuRadioItem>
							{/each}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
				<span class="shrink-0 text-slate-300 dark:text-slate-500">/</span>
				<DropdownMenu>
					<DropdownMenuTrigger
						class="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none dark:text-slate-200 dark:hover:bg-slate-800"
					>
						{data.aggregateDisplayNames[data.selectedAggregate] ?? data.selectedAggregate}
						<ChevronDown size={14} class="text-slate-400 dark:text-slate-500" />
					</DropdownMenuTrigger>
					<DropdownMenuContent class="w-max">
						<DropdownMenuLabel>Aggregate</DropdownMenuLabel>
						<DropdownMenuRadioGroup value={data.selectedAggregate}>
							{#each data.aggregateOptions as aggregate (aggregate)}
								<DropdownMenuRadioItem value={aggregate} onclick={() => selectAggregate(aggregate)}>
									{data.aggregateDisplayNames[aggregate] ?? aggregate}
								</DropdownMenuRadioItem>
							{/each}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			{/if}
			<!-- Legend (shown only when setting is on) -->
			{#if showLegend}
				<span class="h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700"></span>
				<div class="flex items-center gap-6 text-xs text-slate-400">
					<span class="flex shrink-0 items-center gap-1.5">
						<span class="h-2.5 w-2.5 rounded-full {NODE_COLORS.actor.dot}"></span>
						actors
					</span>
					<span class="flex shrink-0 items-center gap-1.5">
						<span class="h-2.5 w-2.5 rounded-full {NODE_COLORS.command.dot}"></span>
						commands
					</span>
					<span class="flex shrink-0 items-center gap-1.5">
						<span class="h-2.5 w-2.5 rounded-full {NODE_COLORS.aggregate.dot}"></span>
						aggregate
					</span>
					<span class="flex shrink-0 items-center gap-1.5">
						<span class="h-2.5 w-2.5 rounded-full {NODE_COLORS.event.dot}"></span>
						events
					</span>
					<span class="flex shrink-0 items-center gap-1.5">
						<span class="h-2.5 w-2.5 rounded-full {NODE_COLORS['read-model'].dot}"></span>
						views
					</span>
					<span class="flex shrink-0 items-center gap-1.5">
						<span class="h-2.5 w-2.5 rounded-full {NODE_COLORS.query.dot}"></span>
						queries
					</span>
				</div>
			{/if}
		</div>
		<!-- Right: fixed action buttons -->
		{#if !data.modelError}
			<div class="flex shrink-0 items-center gap-1">
				<!-- Stories -->
				<button
					onclick={() => (storySheetOpen = true)}
					class="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none dark:hover:bg-slate-800 dark:hover:text-slate-200"
					title="Domain Stories"
				>
					<MessageCircle size={14} />
					Stories
				</button>
				<!-- Scenarios -->
				<button
					onclick={() => (featureSheetOpen = true)}
					class="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none dark:hover:bg-slate-800 dark:hover:text-slate-200"
					title="Feature Scenarios"
				>
					<Workflow size={14} />
					Scenarios
				</button>
				<div class="h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700"></div>
				<button
					onclick={() => (visibilitySheetOpen = true)}
					class="flex cursor-pointer items-center gap-1.5 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none dark:hover:bg-slate-800 dark:hover:text-slate-200"
					title="Visibility"
				>
					<Eye size={16} />
					{#if hiddenCommandIds.size > 0}
						<span
							class="min-w-4 rounded-full bg-indigo-500 px-1 text-center text-[10px] font-semibold text-white dark:bg-indigo-400 dark:text-slate-900"
						>
							{hiddenCommandIds.size}
						</span>
					{/if}
				</button>
				<!-- Settings -->
				<DropdownMenu>
					<DropdownMenuTrigger
						class="flex cursor-pointer items-center gap-1.5 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none dark:hover:bg-slate-800 dark:hover:text-slate-200"
						title="Settings"
					>
						<Settings size={16} />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" class="w-64">
						<DropdownMenuLabel>Settings</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<div class="flex items-center justify-between px-2 py-2">
							<div>
								<p class="text-sm">Animate edges</p>
								<p class="text-xs text-slate-400">May increase CPU usage</p>
							</div>
							<Switch
								checked={animateEdges}
								onCheckedChange={(v) => {
									animateEdges = v;
									saveSettings();
								}}
							/>
						</div>
						<div class="flex items-center justify-between px-2 py-2">
							<div>
								<p class="text-sm">Show legend</p>
								<p class="text-xs text-slate-400">Display node kinds</p>
							</div>
							<Switch
								checked={showLegend}
								onCheckedChange={(v) => {
									showLegend = v;
									saveSettings();
								}}
							/>
						</div>
						<div class="flex items-center justify-between px-2 py-2">
							<div>
								<p class="text-sm">Dark mode</p>
								<p class="text-xs text-slate-400">For midnight modeling sessions</p>
							</div>
							<Switch
								checked={darkMode}
								onCheckedChange={(v) => {
									darkMode = v;
									saveSettings();
								}}
							/>
						</div>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		{/if}
	</header>
	<div class="flex-1">
		{#if data.modelError}
			<div
				class="flex h-full items-center justify-center bg-slate-50 px-6 dark:bg-slate-950"
				role="alert"
				aria-live="polite"
			>
				<div
					class="flex max-w-xl items-start gap-3 rounded-xl border border-red-200 bg-white px-5 py-4 shadow-sm dark:border-red-900 dark:bg-slate-900"
				>
					<CircleAlert size={20} class="mt-0.5 shrink-0 text-red-500 dark:text-red-400" />
					<p class="text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-200">
						{data.modelError}
					</p>
				</div>
			</div>
		{:else}
			<SvelteFlow
				{nodes}
				{edges}
				{nodeTypes}
				onnodeclick={onNodeClick}
				colorMode={darkMode ? 'dark' : 'light'}
				fitView
			>
				<Background
					variant={BackgroundVariant.Dots}
					bgColor={darkMode ? '#020617' : '#f8fafc'}
					patternColor={darkMode ? '#334155' : '#cbd5e1'}
					gap={24}
					size={2}
				/>
				<Controls />
			</SvelteFlow>
		{/if}
	</div>
</div>

{#if !data.modelError}
	<NodeDetailSheet node={selectedNode} bind:open={sheetOpen} />
	<VisibilitySheet
		commands={currentCommands}
		bind:hiddenCommandIds
		bind:open={visibilitySheetOpen}
	/>
	<DomainStorySheet stories={data.domainStories} bind:open={storySheetOpen} />
	<FeatureSheet features={data.gwtFeatures} bind:open={featureSheetOpen} />
{/if}
