export type NodeKind = 'command' | 'event' | 'aggregate' | 'query' | 'read-model' | 'actor';

export const NODE_COLORS: Record<
	NodeKind,
	{
		/** Full Tailwind gradient classes for node/sheet header backgrounds. */
		gradient: string;
		/** Tailwind bg-* class for legend dots and similar indicators. */
		dot: string;
	}
> = {
	command: {
		gradient: 'bg-linear-to-br from-blue-500 to-blue-600',
		dot: 'bg-blue-500'
	},
	event: {
		gradient: 'bg-linear-to-br from-orange-400 to-orange-500',
		dot: 'bg-orange-400'
	},
	aggregate: {
		gradient: 'bg-linear-to-br from-yellow-500 to-yellow-600',
		dot: 'bg-yellow-500'
	},
	query: {
		gradient: 'bg-linear-to-br from-emerald-500 to-emerald-600',
		dot: 'bg-emerald-500'
	},
	'read-model': {
		gradient: 'bg-linear-to-br from-violet-500 to-violet-600',
		dot: 'bg-violet-500'
	},
	actor: {
		gradient: 'bg-linear-to-br from-teal-500 to-cyan-600',
		dot: 'bg-teal-500'
	}
};
