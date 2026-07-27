export type NodeKind = 'command' | 'event' | 'query' | 'aggregate' | 'read-model' | 'actor';

export interface FieldSchema {
	name: string;
	type: string;
	description?: string;
	enum?: string[];
	required: boolean;
}

export interface Invariant {
	name: string;
	rule: string;
}

export type Rule = Invariant;
export type ActorType = 'human' | 'system';

export interface EsdmNode {
	id: string;
	kind: NodeKind;
	name: string;
	description?: string;
	aggregate?: string;
	boundedContext: string;
	/** For commands/events/queries: parsed data/result fields */
	fields: FieldSchema[];
	/** For queries: parsed parameter fields */
	parameters?: FieldSchema[];
	/** For aggregates: state fields */
	stateFields: FieldSchema[];
	/** For aggregates: domain invariants */
	invariants: Invariant[];
	/** For commands/queries: natural-language constraints */
	constraints?: Rule[];
	/** For commands/queries: actor names allowed to invoke them */
	actors?: string[];
	/** For commands: list of event names it publishes */
	publishes?: string[];
	/** For queries: read-model name */
	readModel?: string;
	/** For read-models: projection count */
	projectionCount?: number;
	/** For read-models: paradigm (tabular, etc.) */
	paradigm?: string;
	/** For actors: human or system */
	actorType?: ActorType;
	/** For actors: descriptive responsibilities */
	responsibilities?: string[];
	/** For system actors: backing external systems */
	backedBy?: string[];
}

export interface EsdmEdge {
	id: string;
	source: string;
	target: string;
	label: string;
}

export interface EsdmGraph {
	nodes: EsdmNode[];
	edges: EsdmEdge[];
}

// ── Domain Storytelling ──────────────────────────────────────────────────────

export interface DomainStoryNodeRef {
	actor?: string;
	workObject?: string;
}

export interface DomainStoryEdge {
	from: DomainStoryNodeRef;
	to: DomainStoryNodeRef;
	label?: string;
	annotation?: string;
}

export interface DomainStorySentence {
	sequenceNumber: number;
	workObjects?: { name: string; annotation?: string }[];
	edges: DomainStoryEdge[];
}

export interface DomainStoryActor {
	name: string;
	annotation?: string;
}

export interface DomainStory {
	name: string;
	description?: string;
	pointInTime?: 'as-is' | 'to-be';
	granularity?: 'coarse-grained' | 'fine-grained';
	domainPurity?: 'pure' | 'digitalized';
	actors?: DomainStoryActor[];
	sentences: DomainStorySentence[];
}

// ── Given-When-Then ──────────────────────────────────────────────────────────

export interface GwtEventRef {
	event: string;
	data?: Record<string, unknown>;
}

export interface GwtWhen {
	command?: string;
	event?: string;
	timer?: string;
	query?: string;
	actor?: string;
	data?: Record<string, unknown>;
	parameters?: Record<string, unknown>;
}

export interface GwtThen {
	events?: GwtEventRef[];
	rejection?: { invariant: string; message?: string };
}

export interface GwtScenario {
	name: string;
	description?: string;
	given: GwtEventRef[];
	when: GwtWhen;
	then: GwtThen;
}

export interface GwtFeature {
	name: string;
	description?: string;
	scope: {
		domain: string;
		boundedContext: string;
		aggregate?: string;
	};
	scenarios: GwtScenario[];
}
