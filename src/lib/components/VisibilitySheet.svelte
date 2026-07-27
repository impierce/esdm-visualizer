<script lang="ts">
	import {
		Sheet,
		SheetContent,
		SheetTitle,
		SheetDescription
	} from '$lib/components/ui/sheet/index.js';
	import type { EsdmNode } from '$lib/types.js';
	import { NODE_COLORS } from '$lib/node-colors.js';
	import Eye from '@lucide/svelte/icons/eye';

	let {
		commands,
		hiddenCommandIds = $bindable(new Set<string>()),
		open = $bindable(false)
	}: {
		commands: EsdmNode[];
		hiddenCommandIds: Set<string>;
		open: boolean;
	} = $props();

	const visibleCount = $derived(commands.filter((c) => !hiddenCommandIds.has(c.id)).length);

	function toggle(id: string) {
		const next = new Set(hiddenCommandIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		hiddenCommandIds = next;
	}

	function showAll() {
		hiddenCommandIds = new Set();
	}

	function hideAll() {
		hiddenCommandIds = new Set(commands.map((c) => c.id));
	}
</script>

<Sheet bind:open>
	<SheetContent
		side="right"
		class="flex w-80 flex-col gap-0 p-0 sm:max-w-80"
		showCloseButton={false}
	>
		<!-- Header -->
		<div class="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
			<Eye size={18} class="shrink-0 text-slate-500" />
			<div class="min-w-0 flex-1">
				<SheetTitle class="text-sm font-semibold text-slate-800">Visibility</SheetTitle>
				<SheetDescription class="text-xs text-slate-400">
					{visibleCount} of {commands.length} commands visible
				</SheetDescription>
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={showAll}
					class="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
				>
					All
				</button>
				<button
					onclick={hideAll}
					class="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
				>
					None
				</button>
			</div>
		</div>

		<!-- Command list -->
		<div class="flex-1 overflow-y-auto py-2">
			{#if commands.length === 0}
				<p class="px-5 py-4 text-sm text-slate-400 italic">No commands on this page.</p>
			{:else}
				{#each commands as cmd (cmd.id)}
					{@const visible = !hiddenCommandIds.has(cmd.id)}
					<label
						class="flex cursor-pointer items-start gap-3 px-5 py-2.5 transition hover:bg-slate-50"
					>
						<input
							type="checkbox"
							class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-500"
							checked={visible}
							onchange={() => toggle(cmd.id)}
						/>
						<div class="min-w-0 flex-1">
							<p
								class="truncate text-sm font-medium {visible
									? 'text-slate-700'
									: 'text-slate-400 line-through'}"
							>
								{cmd.name}
							</p>
							{#if cmd.description}
								<p class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
									{cmd.description}
								</p>
							{/if}
							{#if cmd.publishes && cmd.publishes.length > 0}
								<div class="mt-1 flex flex-wrap gap-1">
									{#each cmd.publishes as ev (ev)}
										<span
											class="rounded-full px-1.5 py-0.5 text-[10px] {visible
												? 'bg-amber-50 text-amber-600'
												: 'bg-slate-100 text-slate-400'}"
										>
											{ev}
										</span>
									{/each}
								</div>
							{/if}
						</div>
						<span
							class="mt-0.5 h-2 w-2 shrink-0 rounded-full {visible
								? NODE_COLORS.command.dot
								: 'bg-slate-200'}"
						></span>
					</label>
				{/each}
			{/if}
		</div>
	</SheetContent>
</Sheet>
