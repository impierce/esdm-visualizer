<script lang="ts">
	import {
		Sheet,
		SheetContent,
		SheetClose,
		SheetTitle,
		SheetDescription
	} from '$lib/components/ui/sheet/index.js';
	import type { EsdmNode, FieldSchema } from '$lib/types.js';
	import { NODE_COLORS } from '$lib/node-colors.js';
	import Bot from '@lucide/svelte/icons/bot';
	import Bolt from '@lucide/svelte/icons/bolt';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import Layers from '@lucide/svelte/icons/layers';
	import Tag from '@lucide/svelte/icons/tag';
	import UserRound from '@lucide/svelte/icons/user-round';
	import X from '@lucide/svelte/icons/x';

	let {
		node,
		open = $bindable(false)
	}: {
		node: EsdmNode | null;
		open: boolean;
	} = $props();

	const ICONS: Record<EsdmNode['kind'], typeof Bolt> = {
		command: Bolt,
		event: CircleDot,
		aggregate: Layers,
		query: Tag,
		'read-model': Tag,
		actor: UserRound
	};

	function iconForNode(node: EsdmNode) {
		if (node.kind === 'actor' && node.actorType === 'system') return Bot;
		return ICONS[node.kind];
	}

	function typeLabel(f: FieldSchema): string {
		if (f.enum && f.enum.length > 0) return 'enum';
		return f.type;
	}
</script>

<Sheet bind:open>
	<SheetContent
		side="right"
		class="flex h-full w-110 flex-col gap-0 overflow-hidden p-0 sm:max-w-110"
		showCloseButton={false}
	>
		{#if node}
			{@const Icon = iconForNode(node)}
			<!-- Coloured sheet header -->
			<div
				class="sticky top-0 z-10 flex items-center gap-3 px-6 py-5 shadow-sm {NODE_COLORS[node.kind]
					.gradient}"
			>
				<Icon size={20} class="shrink-0 text-white/80" />
				<div class="min-w-0 flex-1">
					<SheetTitle class="truncate text-sm font-bold tracking-widest text-white uppercase">
						{node.name.replaceAll('-', ' ')}
					</SheetTitle>
					<SheetDescription class="text-xs text-white/70">
						{node.kind}
					</SheetDescription>
				</div>
				<SheetClose
					class="ml-1 shrink-0 rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
				>
					<X size={16} />
					<span class="sr-only">Close</span>
				</SheetClose>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto">
				<div class="flex flex-col gap-0 divide-y divide-slate-100 dark:divide-slate-800">
					<!-- Scope section -->
					<section class="px-6 py-4">
						<p class="mb-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
							Scope
						</p>
						<p class="font-mono text-xs text-slate-600 dark:text-slate-300">
							{node.boundedContext}{node.aggregate ? ` / ${node.aggregate}` : ''}
						</p>
					</section>

					{#if node.kind === 'actor'}
						<section class="px-6 py-4">
							<p class="mb-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
								Actor Type
							</p>
							<div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
								{#if node.actorType === 'system'}
									<Bot size={14} class="text-slate-400" />
								{:else}
									<UserRound size={14} class="text-slate-400" />
								{/if}
								<span class="capitalize">{node.actorType ?? 'unknown'}</span>
							</div>
						</section>
					{/if}

					<!-- Description -->
					{#if node.description}
						<section class="px-6 py-4">
							<p class="mb-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
								Description
							</p>
							<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
								{node.description}
							</p>
						</section>
					{/if}

					{#if node.kind === 'actor' && node.responsibilities && node.responsibilities.length > 0}
						<section class="px-6 py-4">
							<p class="mb-3 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
								Responsibilities
							</p>
							<ul class="space-y-2">
								{#each node.responsibilities as responsibility (responsibility)}
									<li class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
										{responsibility}
									</li>
								{/each}
							</ul>
						</section>
					{/if}

					{#if node.kind === 'actor' && node.backedBy && node.backedBy.length > 0}
						<section class="px-6 py-4">
							<p class="mb-3 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
								Backed By
							</p>
							<div class="flex flex-wrap gap-2">
								{#each node.backedBy as system (system)}
									<span
										class="rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
									>
										{system}
									</span>
								{/each}
							</div>
						</section>
					{/if}

					{#if node.parameters && node.parameters.length > 0}
						<section class="px-6 py-4">
							<p class="mb-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
								Parameters
							</p>
							<p class="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
								Query Parameters
							</p>
							<ul class="space-y-3">
								{#each node.parameters as f (f.name)}
									<li class="flex flex-col gap-1">
										<div class="flex items-center gap-2">
											<Tag size={12} class="shrink-0 text-slate-400" />
											<span class="font-mono text-xs font-medium text-slate-700 dark:text-slate-200"
												>{f.name}</span
											>
											<span
												class="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
											>
												{typeLabel(f)}
											</span>
											{#if f.required}
												<span
													class="text-[10px] font-bold text-rose-500 dark:text-rose-400"
													title="required">*</span
												>
											{/if}
										</div>
										{#if f.enum && f.enum.length > 0}
											<div class="ml-5 flex flex-wrap gap-1">
												{#each f.enum as val (val)}
													<span
														class="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
													>
														{val}
													</span>
												{/each}
											</div>
										{:else if f.description}
											<p class="ml-5 text-[11px] leading-relaxed text-slate-400">{f.description}</p>
										{/if}
									</li>
								{/each}
							</ul>
						</section>
					{/if}

					<!-- Input / Payload / Result fields -->
					{#if node.fields.length > 0}
						<section class="px-6 py-4">
							<p class="mb-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
								{node.kind === 'command'
									? 'Input Data'
									: node.kind === 'event'
										? 'Payload Data'
										: node.kind === 'query'
											? 'Result Schema'
											: 'Schema'}
							</p>
							<p class="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
								{node.kind === 'command'
									? 'Input Parameters'
									: node.kind === 'event'
										? 'Payload'
										: node.kind === 'query'
											? 'Result Fields'
											: 'Fields'}
							</p>
							<ul class="space-y-3">
								{#each node.fields as f (f.name)}
									<li class="flex flex-col gap-1">
										<div class="flex items-center gap-2">
											<Tag size={12} class="shrink-0 text-slate-400" />
											<span class="font-mono text-xs font-medium text-slate-700 dark:text-slate-200"
												>{f.name}</span
											>
											<span
												class="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
											>
												{typeLabel(f)}
											</span>
											{#if f.required}
												<span
													class="text-[10px] font-bold text-rose-500 dark:text-rose-400"
													title="required">*</span
												>
											{/if}
										</div>
										{#if f.enum && f.enum.length > 0}
											<div class="ml-5 flex flex-wrap gap-1">
												{#each f.enum as val (val)}
													<span
														class="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
													>
														{val}
													</span>
												{/each}
											</div>
										{:else if f.description}
											<p class="ml-5 text-[11px] leading-relaxed text-slate-400">{f.description}</p>
										{/if}
									</li>
								{/each}
							</ul>
						</section>
					{/if}

					{#if node.actors && node.actors.length > 0}
						<section class="px-6 py-4">
							<p class="mb-3 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
								Actors
							</p>
							<div class="flex flex-wrap gap-2">
								{#each node.actors as actor (actor)}
									<span
										class="rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
									>
										{actor}
									</span>
								{/each}
							</div>
						</section>
					{/if}

					<!-- Publishes -->
					{#if node.publishes && node.publishes.length > 0}
						<section class="px-6 py-4">
							<p class="mb-2 text-[10px] font-semibold tracking-widest text-indigo-400 uppercase">
								Publishes
							</p>
							<p class="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
								Publishes Outcome
							</p>
							<ul class="space-y-1">
								{#each node.publishes as e (e)}
									<li class="flex items-center gap-2">
										<CircleDot size={12} class="text-orange-400" />
										<span class="font-mono text-sm font-medium text-slate-700 dark:text-slate-200"
											>{e}</span
										>
									</li>
								{/each}
							</ul>
						</section>
					{/if}

					<!-- Aggregate: state fields -->
					{#if node.stateFields && node.stateFields.length > 0}
						<section class="px-6 py-4">
							<p class="mb-3 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
								State
							</p>
							<ul class="space-y-3">
								{#each node.stateFields as f (f.name)}
									<li class="flex flex-col gap-1">
										<div class="flex items-center gap-2">
											<Tag size={12} class="shrink-0 text-slate-400" />
											<span class="font-mono text-xs font-medium text-slate-700 dark:text-slate-200"
												>{f.name}</span
											>
											<span
												class="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
											>
												{typeLabel(f)}
											</span>
											{#if f.required}
												<span class="text-[10px] font-bold text-rose-500 dark:text-rose-400">*</span
												>
											{/if}
										</div>
										{#if f.enum && f.enum.length > 0}
											<div class="ml-5 flex flex-wrap gap-1">
												{#each f.enum as val (val)}
													<span
														class="rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-600 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
													>
														{val}
													</span>
												{/each}
											</div>
										{:else if f.description}
											<p class="ml-5 text-[11px] leading-relaxed text-slate-400">{f.description}</p>
										{/if}
									</li>
								{/each}
							</ul>
						</section>
					{/if}

					<!-- Invariants -->
					{#if node.invariants && node.invariants.length > 0}
						<section class="px-6 py-4">
							<p class="mb-3 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
								Invariants
							</p>
							<ul class="space-y-3">
								{#each node.invariants as inv (inv.name)}
									<li
										class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
									>
										<p
											class="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300"
										>
											{inv.name}
										</p>
										<p class="mt-1 text-xs leading-relaxed text-slate-400 italic">{inv.rule}</p>
									</li>
								{/each}
							</ul>
						</section>
					{/if}

					{#if node.constraints && node.constraints.length > 0}
						<section class="px-6 py-4">
							<p class="mb-3 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
								Constraints
							</p>
							<ul class="space-y-3">
								{#each node.constraints as constraint (constraint.name)}
									<li
										class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
									>
										<p
											class="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300"
										>
											{constraint.name}
										</p>
										<p class="mt-1 text-xs leading-relaxed text-slate-400 italic">
											{constraint.rule}
										</p>
									</li>
								{/each}
							</ul>
						</section>
					{/if}
				</div>
			</div>
		{/if}
	</SheetContent>
</Sheet>
