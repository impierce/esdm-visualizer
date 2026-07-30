<script lang="ts">
	import {
		Sheet,
		SheetContent,
		SheetClose,
		SheetTitle,
		SheetDescription
	} from '$lib/components/ui/sheet/index.js';
	import type { GwtFeature, GwtScenario } from '$lib/types.js';
	import Workflow from '@lucide/svelte/icons/workflow';
	import X from '@lucide/svelte/icons/x';
	import Zap from '@lucide/svelte/icons/zap';

	let {
		features,
		open = $bindable(false)
	}: {
		features: GwtFeature[];
		open: boolean;
	} = $props();

	let selectedIndex = $state(0);
	const feature = $derived(features[selectedIndex] ?? null);

	function fmt(name: string) {
		return name.replaceAll('-', ' ');
	}

	function outcomeKind(scenario: GwtScenario): 'events' | 'rejection' {
		return scenario.then.rejection ? 'rejection' : 'events';
	}
</script>

<Sheet bind:open>
	<SheetContent
		side="right"
		class="flex h-full w-130 max-w-[90vw] min-w-112.5 flex-col gap-0 overflow-hidden p-0 sm:max-w-130"
		showCloseButton={false}
	>
		<!-- Header -->
		<div class="sticky top-0 z-10 flex items-center gap-3 bg-violet-900 px-6 py-5 shadow-sm">
			<Workflow size={20} class="shrink-0 text-white/80" />
			<div class="min-w-0 flex-1">
				<SheetTitle class="text-sm font-bold tracking-widest text-white uppercase">
					Scenarios
				</SheetTitle>
				<SheetDescription class="text-xs text-white/60">
					{features.length}
					{features.length === 1 ? 'feature' : 'features'} in this context
				</SheetDescription>
			</div>
			<SheetClose
				class="ml-1 shrink-0 rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
			>
				<X size={16} />
				<span class="sr-only">Close</span>
			</SheetClose>
		</div>

		{#if features.length === 0}
			<div class="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
				<Workflow size={36} class="opacity-30" />
				<p class="text-sm">No feature specs in this context.</p>
			</div>
		{:else}
			<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
				<!-- Feature tabs (if >1) -->
				{#if features.length > 1}
					<div
						class="flex gap-1 border-b border-slate-100 bg-white px-4 pt-3 pb-0 dark:border-slate-800 dark:bg-slate-900"
					>
						{#each features as f, i (f.name)}
							<button
								onclick={() => (selectedIndex = i)}
								class="rounded-t-md px-3 py-2 text-xs font-medium transition-colors
									{i === selectedIndex
									? 'border-b-2 border-violet-500 text-violet-600 dark:text-violet-300'
									: 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}"
							>
								{fmt(f.name)}
							</button>
						{/each}
					</div>
				{/if}

				{#if feature}
					<div class="min-h-0 flex-1 overflow-y-auto">
						<!-- Feature meta -->
						<div class="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
							<h2 class="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
								{fmt(feature.name)}
							</h2>
							{#if feature.description}
								<p class="mb-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
									{feature.description}
								</p>
							{/if}
							<div class="flex flex-wrap gap-1.5">
								{#if feature.scope.boundedContext}
									<span
										class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
									>
										{feature.scope.boundedContext}
									</span>
								{/if}
								{#if feature.scope.aggregate}
									<span
										class="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-950 dark:text-violet-300"
									>
										{feature.scope.aggregate}
									</span>
								{/if}
								<span
									class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400 dark:bg-slate-800"
								>
									{feature.scenarios.length}
									{feature.scenarios.length === 1 ? 'scenario' : 'scenarios'}
								</span>
							</div>
						</div>

						<!-- Scenarios -->
						<div class="px-6 py-4">
							<p class="mb-3 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
								Scenarios
							</p>
							<ol class="flex flex-col gap-5">
								{#each feature.scenarios as scenario, si (scenario.name)}
									<li class="flex gap-3">
										<!-- Step number -->
										<div
											class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600 dark:bg-violet-900 dark:text-violet-300"
										>
											{si + 1}
										</div>
										<div class="min-w-0 flex-1">
											<!-- Scenario name -->
											<p class="mb-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
												{fmt(scenario.name)}
											</p>
											{#if scenario.description}
												<p class="mb-2 text-[10px] leading-relaxed text-slate-400">
													{scenario.description}
												</p>
											{/if}

											<!-- Given -->
											{#if scenario.given.length > 0}
												<div class="mb-2 flex flex-wrap items-start gap-1.5">
													<span
														class="mt-0.5 w-10 shrink-0 text-[10px] font-bold tracking-wide text-slate-400 uppercase"
														>Given</span
													>
													<div class="flex flex-wrap gap-1">
														{#each scenario.given as ev (ev.event)}
															<span
																class="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
															>
																{fmt(ev.event)}
															</span>
														{/each}
													</div>
												</div>
											{:else}
												<div class="mb-2 flex items-center gap-1.5">
													<span
														class="w-10 shrink-0 text-[10px] font-bold tracking-wide text-slate-400 uppercase"
														>Given</span
													>
													<span class="text-[10px] text-slate-300 italic dark:text-slate-500"
														>no prior events</span
													>
												</div>
											{/if}

											<!-- When -->
											<div class="mb-2 flex flex-wrap items-start gap-1.5">
												<span
													class="mt-0.5 w-10 shrink-0 text-[10px] font-bold tracking-wide text-slate-400 uppercase"
													>When</span
												>
												<div class="flex flex-wrap gap-1">
													{#if scenario.when.command}
														<span
															class="flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300"
														>
															<Zap size={9} class="shrink-0" />
															{fmt(scenario.when.command)}
														</span>
													{:else if scenario.when.event}
														<span
															class="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
														>
															{fmt(scenario.when.event)}
														</span>
													{:else if scenario.when.query}
														<span
															class="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300"
														>
															{fmt(scenario.when.query)}
														</span>
													{:else if scenario.when.timer}
														<span
															class="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
														>
															{fmt(scenario.when.timer)}
														</span>
													{/if}
													{#if scenario.when.actor}
														<span
															class="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
														>
															by {fmt(scenario.when.actor)}
														</span>
													{/if}
												</div>
											</div>

											<!-- Then -->
											<div class="flex flex-wrap items-start gap-1.5">
												<span
													class="mt-0.5 w-10 shrink-0 text-[10px] font-bold tracking-wide text-slate-400 uppercase"
													>Then</span
												>
												<div class="flex flex-wrap gap-1">
													{#if outcomeKind(scenario) === 'rejection'}
														<span
															class="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
														>
															rejected: {fmt(scenario.then.rejection!.invariant)}
														</span>
													{:else}
														{#each scenario.then.events ?? [] as ev (ev.event)}
															<span
																class="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
															>
																{fmt(ev.event)}
															</span>
														{/each}
													{/if}
												</div>
											</div>
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
