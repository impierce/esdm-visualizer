<script lang="ts">
	import { Handle, Position, NodeResizer } from '@xyflow/svelte';
	import type { EsdmNode } from '$lib/types.js';
	import { NODE_COLORS } from '$lib/node-colors.js';
	import Bolt from '@lucide/svelte/icons/bolt';

	let { data, selected }: { data: EsdmNode; selected: boolean } = $props();
</script>

<NodeResizer isVisible={selected} minWidth={160} minHeight={72} />
<Handle type="target" position={Position.Top} style="background:#94a3b8;width:10px;height:10px;" />
<Handle
	type="source"
	position={Position.Bottom}
	style="background:#94a3b8;width:10px;height:10px;"
/>

<div
	class="flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl shadow-md transition-shadow hover:shadow-lg"
>
	<div class="flex items-center gap-2.5 {NODE_COLORS.command.gradient} px-4 py-3">
		<Bolt size={16} class="shrink-0 text-white/80" />
		<span class="flex-1 truncate text-xs font-bold tracking-widest text-white uppercase">
			{data.name.replaceAll('-', ' ')}
		</span>
	</div>
	<div class="flex-1 overflow-auto bg-white px-4 py-3 dark:bg-slate-900">
		{#if data.description}
			<p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{data.description}</p>
		{:else}
			<p class="text-[11px] text-slate-400 italic dark:text-slate-500">No description</p>
		{/if}
	</div>
</div>
