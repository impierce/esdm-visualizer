<script lang="ts">
	import { Handle, Position, NodeResizer } from '@xyflow/svelte';
	import Bot from '@lucide/svelte/icons/bot';
	import type { EsdmNode } from '$lib/types.js';
	import { NODE_COLORS } from '$lib/node-colors.js';
	import UserRound from '@lucide/svelte/icons/user-round';

	let { data, selected }: { data: EsdmNode; selected: boolean } = $props();
</script>

<NodeResizer isVisible={selected} minWidth={160} minHeight={72} />
<Handle
	type="source"
	position={Position.Bottom}
	style="background:#94a3b8;width:10px;height:10px;"
/>

<div
	class="flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl shadow-md transition-shadow hover:shadow-lg"
>
	<div class="flex items-center gap-2.5 {NODE_COLORS.actor.gradient} px-4 py-3">
		{#if data.actorType === 'system'}
			<Bot size={16} class="shrink-0 text-white/80" />
		{:else}
			<UserRound size={16} class="shrink-0 text-white/80" />
		{/if}
		<span class="flex-1 truncate text-xs font-bold tracking-widest text-white uppercase">
			{data.name.replaceAll('-', ' ')}
		</span>
	</div>
	<div class="flex-1 overflow-auto bg-white px-4 py-3">
		{#if data.responsibilities && data.responsibilities.length > 0}
			<p class="line-clamp-2 text-xs leading-relaxed text-slate-500">{data.responsibilities[0]}</p>
		{:else if data.description}
			<p class="line-clamp-2 text-xs leading-relaxed text-slate-500">{data.description}</p>
		{:else}
			<p class="text-[11px] text-slate-300 italic">No description</p>
		{/if}
	</div>
</div>
