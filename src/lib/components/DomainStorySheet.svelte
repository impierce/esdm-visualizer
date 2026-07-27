<script lang="ts">
	import {
		Sheet,
		SheetContent,
		SheetClose,
		SheetTitle,
		SheetDescription
	} from '$lib/components/ui/sheet/index.js';
	import type { DomainStory, DomainStoryNodeRef } from '$lib/types.js';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import X from '@lucide/svelte/icons/x';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Box from '@lucide/svelte/icons/box';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	let {
		stories,
		open = $bindable(false)
	}: {
		stories: DomainStory[];
		open: boolean;
	} = $props();

	let selectedIndex = $state(0);
	const story = $derived(stories[selectedIndex] ?? null);

	function nodeLabel(ref: DomainStoryNodeRef): string {
		return (ref.actor ?? ref.workObject ?? '?').replaceAll('-', ' ');
	}

	function isActor(ref: DomainStoryNodeRef): boolean {
		return ref.actor !== undefined;
	}

	function workObjectAnnotation(
		ref: DomainStoryNodeRef,
		sentence: import('$lib/types.js').DomainStorySentence
	): string | undefined {
		if (!ref.workObject) return undefined;
		return sentence.workObjects?.find((w) => w.name === ref.workObject)?.annotation;
	}

	function nodeRefKey(ref: DomainStoryNodeRef): string {
		return ref.actor ?? ref.workObject ?? '';
	}

	/** Collapse edges into a single path by joining consecutive edge[i].to === edge[i+1].from. */
	function buildChain(
		sentence: import('$lib/types.js').DomainStorySentence
	): Array<{ ref: DomainStoryNodeRef; annotation?: string; label?: string }> {
		const edges = sentence.edges;
		if (edges.length === 0) return [];
		const chain: Array<{ ref: DomainStoryNodeRef; annotation?: string; label?: string }> = [
			{ ref: edges[0].from, annotation: workObjectAnnotation(edges[0].from, sentence) }
		];
		for (const edge of edges) {
			const prev = chain[chain.length - 1];
			// If the previous tail is the same node as this edge's from, reuse it (add the label there)
			if (nodeRefKey(prev.ref) === nodeRefKey(edge.from)) {
				prev.label = edge.label;
			} else {
				// Non-contiguous — start a new segment with from
				chain[chain.length - 1].label = undefined;
				chain.push({
					ref: edge.from,
					annotation: workObjectAnnotation(edge.from, sentence),
					label: edge.label
				});
			}
			chain.push({ ref: edge.to, annotation: workObjectAnnotation(edge.to, sentence) });
		}
		return chain;
	}

	const BADGE: Record<DomainStory['pointInTime'] & string, string> = {
		'as-is': 'bg-slate-100 text-slate-500',
		'to-be': 'bg-emerald-50 text-emerald-600'
	};
	const GRANULARITY: Record<DomainStory['granularity'] & string, string> = {
		'coarse-grained': 'bg-amber-50 text-amber-600',
		'fine-grained': 'bg-sky-50 text-sky-600'
	};
	const PURITY: Record<DomainStory['domainPurity'] & string, string> = {
		pure: 'bg-violet-50 text-violet-600',
		digitalized: 'bg-indigo-50 text-indigo-600'
	};
</script>

<Sheet bind:open>
	<SheetContent
		side="right"
		class="flex h-full w-130 max-w-[90vw] min-w-112.5 flex-col gap-0 overflow-hidden p-0 sm:max-w-130"
		showCloseButton={false}
	>
		<!-- Header -->
		<div class="sticky top-0 z-10 flex items-center gap-3 bg-slate-800 px-6 py-5 shadow-sm">
			<MessageCircle size={20} class="shrink-0 text-white/80" />
			<div class="min-w-0 flex-1">
				<SheetTitle class="text-sm font-bold tracking-widest text-white uppercase">
					Domain Stories
				</SheetTitle>
				<SheetDescription class="text-xs text-white/60">
					{stories.length}
					{stories.length === 1 ? 'story' : 'stories'} in this context
				</SheetDescription>
			</div>
			<SheetClose
				class="ml-1 shrink-0 rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
			>
				<X size={16} />
				<span class="sr-only">Close</span>
			</SheetClose>
		</div>

		{#if stories.length === 0}
			<div class="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
				<MessageCircle size={36} class="opacity-30" />
				<p class="text-sm">No domain stories in this context.</p>
			</div>
		{:else}
			<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
				<!-- Story tabs (if >1) -->
				{#if stories.length > 1}
					<div class="flex gap-1 border-b border-slate-100 bg-white px-4 pt-3 pb-0">
						{#each stories as s, i (s.name)}
							<button
								onclick={() => (selectedIndex = i)}
								class="rounded-t-md px-3 py-2 text-xs font-medium transition-colors
									{i === selectedIndex
									? 'border-b-2 border-indigo-500 text-indigo-600'
									: 'text-slate-400 hover:text-slate-600'}"
							>
								{s.name.replaceAll('-', ' ')}
							</button>
						{/each}
					</div>
				{/if}

				{#if story}
					<div class="min-h-0 flex-1 overflow-y-auto">
						<!-- Story meta -->
						<div class="border-b border-slate-100 px-6 py-4">
							<h2 class="mb-1 text-sm font-semibold text-slate-700">
								{story.name.replaceAll('-', ' ')}
							</h2>
							{#if story.description}
								<p class="mb-3 text-xs leading-relaxed text-slate-500">{story.description}</p>
							{/if}
							<div class="flex flex-wrap gap-1.5">
								{#if story.pointInTime}
									<span
										class="rounded-full px-2 py-0.5 text-[10px] font-medium {BADGE[
											story.pointInTime
										] ?? 'bg-slate-100 text-slate-500'}"
									>
										{story.pointInTime}
									</span>
								{/if}
								{#if story.granularity}
									<span
										class="rounded-full px-2 py-0.5 text-[10px] font-medium {GRANULARITY[
											story.granularity
										] ?? 'bg-slate-100 text-slate-500'}"
									>
										{story.granularity}
									</span>
								{/if}
								{#if story.domainPurity}
									<span
										class="rounded-full px-2 py-0.5 text-[10px] font-medium {PURITY[
											story.domainPurity
										] ?? 'bg-slate-100 text-slate-500'}"
									>
										{story.domainPurity}
									</span>
								{/if}
							</div>
						</div>

						<!-- Actors legend -->
						{#if story.actors && story.actors.length > 0}
							<div class="border-b border-slate-100 px-6 py-4">
								<p class="mb-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
									Actors
								</p>
								<div class="flex flex-wrap gap-2">
									{#each story.actors as actor (actor.name)}
										<div
											class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
										>
											<UserRound size={12} class="shrink-0 text-slate-400" />
											<span class="text-xs font-medium text-slate-600"
												>{actor.name.replaceAll('-', ' ')}</span
											>
											{#if actor.annotation}
												<span class="text-[10px] text-slate-400" title={actor.annotation}>·</span>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Sentences -->
						<div class="px-6 py-4">
							<p class="mb-3 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
								Flow
							</p>
							<ol class="flex flex-col gap-5">
								{#each [...story.sentences].sort((a, b) => a.sequenceNumber - b.sequenceNumber) as sentence (sentence.sequenceNumber)}
									<li class="flex gap-3">
										<!-- Step number -->
										<div
											class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500"
										>
											{sentence.sequenceNumber}
										</div>
										<!-- Edge chain -->
										<div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
											{#each buildChain(sentence) as segment, si (si)}
												<!-- Node pill -->
												<div
													class="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium
														{isActor(segment.ref)
														? 'border-slate-300 bg-slate-50 text-slate-700'
														: 'border-amber-200 bg-amber-50 text-amber-700'}"
													title={segment.annotation}
												>
													{#if isActor(segment.ref)}
														<UserRound size={11} class="shrink-0 text-slate-400" />
													{:else}
														<Box size={11} class="shrink-0 text-amber-400" />
													{/if}
													<span>{nodeLabel(segment.ref)}</span>
													{#if segment.annotation}
														<span class="translate-y-px text-[10px] font-normal opacity-60"
															>{segment.annotation}</span
														>
													{/if}
												</div>
												<!-- Arrow to next node -->
												{#if segment.label !== undefined}
													<div class="flex shrink-0 items-center gap-1 text-[10px] text-slate-400">
														<span class="italic">{segment.label}</span>
														<ArrowRight size={12} class="text-slate-300" />
													</div>
												{/if}
											{/each}
										</div>
									</li>
								{/each}
							</ol>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</SheetContent>
</Sheet>
