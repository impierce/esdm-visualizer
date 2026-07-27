import {
	readDomainModel,
	findDomainStoryDocs,
	extractFields,
	extractInvariants,
	type EsdmDocument
} from '$lib/server/esdm-loader.js';
import type { EsdmGraph, EsdmNode, EsdmEdge, DomainStory, GwtFeature } from '$lib/types.js';
import { env } from '$env/dynamic/private';

type BoundedContextDocument = EsdmDocument & {
	scope: NonNullable<EsdmDocument['scope']> & { boundedContext: string };
};

function isInBoundedContext(
	doc: EsdmDocument,
	boundedContext: string
): doc is BoundedContextDocument {
	return doc.scope?.boundedContext === boundedContext;
}

function getBoundedContextOptions(allDocs: EsdmDocument[]) {
	const boundedContexts = allDocs.flatMap((doc) =>
		doc.kind === 'aggregate' && doc.scope?.boundedContext ? [doc.scope.boundedContext] : []
	);

	return [...new Set(boundedContexts)].sort((left, right) => left.localeCompare(right));
}

function getBoundedContextDisplayNames(
	allDocs: EsdmDocument[],
	names: string[]
): Record<string, string> {
	const result: Record<string, string> = {};
	for (const name of names) {
		const bcDoc = allDocs.find((doc) => doc.kind === 'bounded-context' && doc.name === name);
		const displayName = (
			bcDoc as unknown as { metadata?: { annotations?: { displayName?: string } } }
		)?.metadata?.annotations?.displayName;
		result[name] = displayName ?? name;
	}
	return result;
}

function getDomainName(allDocs: EsdmDocument[], boundedContext: string): string {
	const bcDoc = allDocs.find(
		(doc) => doc.kind === 'bounded-context' && doc.name === boundedContext
	);
	return bcDoc?.scope?.domain ?? '';
}

function getDomainDisplayName(allDocs: EsdmDocument[], domainName: string): string {
	if (!domainName) return '';
	const domainDoc = allDocs.find((doc) => doc.kind === 'domain' && doc.name === domainName);
	const displayName = (
		domainDoc as unknown as { metadata?: { annotations?: { displayName?: string } } }
	)?.metadata?.annotations?.displayName;
	return displayName ?? domainName;
}

export function load({ url }: { url: URL }) {
	const { documents: allDocs, error: modelError } = readDomainModel(env.ESDM_ROOT);

	if (modelError) {
		return {
			graph: { nodes: [], edges: [] } satisfies EsdmGraph,
			domainDisplayName: '',
			boundedContextOptions: [],
			boundedContextDisplayNames: {} as Record<string, string>,
			selectedBoundedContext: '',
			aggregateOptions: [],
			aggregateDisplayNames: {} as Record<string, string>,
			selectedAggregate: '',
			domainStories: [],
			gwtFeatures: [],
			modelError
		};
	}

	const boundedContextOptions = getBoundedContextOptions(allDocs);
	const boundedContextDisplayNames = getBoundedContextDisplayNames(allDocs, boundedContextOptions);
	const defaultBoundedContext = boundedContextOptions.includes('kms')
		? 'kms'
		: (boundedContextOptions[0] ?? '');
	const requestedBoundedContext = url.searchParams.get('boundedContext');
	const selectedBoundedContext =
		requestedBoundedContext && boundedContextOptions.includes(requestedBoundedContext)
			? requestedBoundedContext
			: defaultBoundedContext;
	const selectedDomain = getDomainName(allDocs, selectedBoundedContext);
	const domainDisplayName = getDomainDisplayName(allDocs, selectedDomain);

	const docs: BoundedContextDocument[] = selectedBoundedContext
		? allDocs.filter((doc) => isInBoundedContext(doc, selectedBoundedContext))
		: [];
	const readModelAggregateByName: Record<string, string | undefined> = {};

	const nodes: EsdmNode[] = [];
	const edges: EsdmEdge[] = [];

	for (const doc of docs) {
		if (doc.kind !== 'read-model') continue;

		const projectionAggregates = [
			...new Set((doc.projections ?? []).map((p) => p.aggregate))
		].filter((aggregate): aggregate is string => aggregate !== undefined);

		readModelAggregateByName[doc.name] =
			projectionAggregates.length === 1 ? projectionAggregates[0] : undefined;
	}

	for (const doc of docs) {
		const kind = doc.kind;
		if (!['command', 'event', 'query', 'aggregate', 'read-model', 'actor'].includes(kind)) continue;

		const id =
			kind === 'actor'
				? `${doc.scope.boundedContext}__actor__${doc.name}`
				: doc.scope.aggregate
					? `${doc.scope.boundedContext}__${doc.scope.aggregate}__${doc.name}`
					: `${doc.scope.boundedContext}__${doc.name}`;

		// For read-models the items schema holds the fields
		const readModelFields =
			kind === 'read-model'
				? extractFields(doc.schema?.items as never, doc.schema?.items?.required)
				: [];

		// For queries, result may be array-of-items or object
		const queryFields =
			kind === 'query'
				? extractFields(
						(doc.result?.items ?? doc.result) as never,
						doc.result?.items?.required ?? doc.result?.required
					)
				: [];

		const queryParameters =
			kind === 'query' ? extractFields(doc.parameters as never, doc.parameters?.required) : [];

		nodes.push({
			id,
			kind: kind as EsdmNode['kind'],
			name: doc.name,
			description: doc.description?.trim(),
			aggregate:
				doc.scope.aggregate ??
				(kind === 'read-model'
					? readModelAggregateByName[doc.name]
					: kind === 'query' && doc.readModel
						? readModelAggregateByName[doc.readModel]
						: undefined),
			boundedContext: doc.scope.boundedContext,
			fields:
				kind === 'command' || kind === 'event'
					? extractFields(doc.data, doc.data?.required)
					: kind === 'read-model'
						? readModelFields
						: kind === 'query'
							? queryFields
							: [],
			parameters: kind === 'query' ? queryParameters : [],
			stateFields: kind === 'aggregate' ? extractFields(doc.state, doc.state?.required) : [],
			invariants: extractInvariants(doc.invariants),
			constraints: extractInvariants(doc.constraints),
			actors: doc.actors,
			publishes: doc.publishes,
			readModel: doc.readModel,
			projectionCount: doc.projections?.length,
			paradigm: doc.paradigm,
			actorType: kind === 'actor' ? doc.type : undefined,
			responsibilities: kind === 'actor' ? doc.responsibilities : undefined,
			backedBy: kind === 'actor' ? doc.backedBy : undefined
		});
	}

	const nodeIds = new Set(nodes.map((node) => node.id));

	// command --publishes--> event edges
	for (const node of nodes) {
		if (node.kind === 'command' && node.publishes) {
			for (const eventName of node.publishes) {
				const eventId = `${node.boundedContext}__${node.aggregate}__${eventName}`;
				if (nodes.find((n) => n.id === eventId)) {
					edges.push({
						id: `${node.id}__publishes__${eventId}`,
						source: node.id,
						target: eventId,
						label: 'publishes'
					});
				}
			}
		}
	}

	for (const doc of docs) {
		if ((doc.kind === 'command' || doc.kind === 'query') && doc.actors) {
			const targetId = doc.scope.aggregate
				? `${doc.scope.boundedContext}__${doc.scope.aggregate}__${doc.name}`
				: `${doc.scope.boundedContext}__${doc.name}`;

			if (!nodeIds.has(targetId)) continue;

			for (const actorName of doc.actors) {
				const actorId = `${doc.scope.boundedContext}__actor__${actorName}`;
				if (!nodeIds.has(actorId)) continue;

				edges.push({
					id: `${actorId}__${doc.kind === 'command' ? 'issues' : 'runs'}__${targetId}`,
					source: actorId,
					target: targetId,
					label: doc.kind === 'command' ? 'issues' : 'runs'
				});
			}
		}

		if (doc.kind === 'read-model') {
			const readModelId = `${doc.scope.boundedContext}__${doc.name}`;
			if (!nodeIds.has(readModelId)) continue;

			for (const projection of doc.projections ?? []) {
				if (!projection.aggregate) continue;

				const eventId = `${projection.boundedContext}__${projection.aggregate}__${projection.event}`;
				if (!nodeIds.has(eventId)) continue;

				edges.push({
					id: `${eventId}__updates__${readModelId}`,
					source: eventId,
					target: readModelId,
					label: 'updates'
				});
			}
		}

		if (doc.kind === 'query' && doc.readModel) {
			const readModelId = `${doc.scope.boundedContext}__${doc.readModel}`;
			const queryId = `${doc.scope.boundedContext}__${doc.name}`;

			if (!nodeIds.has(readModelId) || !nodeIds.has(queryId)) continue;

			edges.push({
				id: `${readModelId}__reads__${queryId}`,
				source: readModelId,
				target: queryId,
				label: 'reads'
			});
		}
	}

	const aggregateOptions = nodes
		.filter((node) => node.kind === 'aggregate')
		.map((node) => node.name)
		.sort((left, right) => left.localeCompare(right));

	const defaultAggregate =
		selectedBoundedContext === 'kms' && aggregateOptions.includes('key')
			? 'key'
			: (aggregateOptions[0] ?? '');
	const requestedAggregate = url.searchParams.get('aggregate');
	const selectedAggregate =
		requestedAggregate && aggregateOptions.includes(requestedAggregate)
			? requestedAggregate
			: defaultAggregate;

	const graph: EsdmGraph = { nodes, edges };

	const domainStories: DomainStory[] = findDomainStoryDocs(allDocs, selectedDomain).map((doc) => ({
		name: doc.name,
		description: doc.description?.trim(),
		pointInTime: (doc as unknown as { pointInTime?: DomainStory['pointInTime'] }).pointInTime,
		granularity: (doc as unknown as { granularity?: DomainStory['granularity'] }).granularity,
		domainPurity: (doc as unknown as { domainPurity?: DomainStory['domainPurity'] }).domainPurity,
		actors: (doc as unknown as { actors?: DomainStory['actors'] }).actors,
		sentences: (doc as unknown as { sentences: DomainStory['sentences'] }).sentences ?? []
	}));

	const gwtFeatures: GwtFeature[] = docs
		.filter(
			(doc) => doc.apiVersion === 'schema.esdm.io/given-when-then/v1' && doc.kind === 'feature'
		)
		.map((doc) => ({
			name: doc.name,
			description: doc.description?.trim(),
			scope: doc.scope,
			scenarios: (doc.scenarios ?? []).map((s: Record<string, unknown>) => ({
				name: s.name as string,
				description: (s.description as string | undefined)?.trim(),
				given: (s.given as GwtFeature['scenarios'][number]['given']) ?? [],
				when: s.when as GwtFeature['scenarios'][number]['when'],
				then: s.then as GwtFeature['scenarios'][number]['then']
			}))
		}));

	const aggregateDisplayNames: Record<string, string> = {};
	for (const doc of docs) {
		if (doc.kind !== 'aggregate') continue;
		const displayName = (
			doc as unknown as { metadata?: { annotations?: { displayName?: string } } }
		)?.metadata?.annotations?.displayName;
		if (displayName) aggregateDisplayNames[doc.name] = displayName;
	}

	return {
		graph,
		domainDisplayName,
		boundedContextOptions,
		boundedContextDisplayNames,
		selectedBoundedContext,
		aggregateOptions,
		aggregateDisplayNames,
		selectedAggregate,
		domainStories,
		gwtFeatures,
		modelError: null
	};
}
