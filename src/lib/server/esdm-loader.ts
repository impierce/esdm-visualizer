import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import yaml from 'js-yaml';
import type { ActorType, FieldSchema, Invariant } from '$lib/types.js';

interface PropertyDef {
	type?: string;
	description?: string;
	enum?: string[];
}

interface DataSchemaDef {
	type?: string;
	properties?: Record<string, PropertyDef>;
	required?: string[];
	items?: {
		type?: string;
		properties?: Record<string, PropertyDef>;
		required?: string[];
	};
}

interface InvariantDef {
	name: string;
	rule: string;
}

interface ParameterDef {
	type?: string;
	properties?: Record<string, PropertyDef>;
	required?: string[];
	items?: {
		type?: string;
		properties?: Record<string, PropertyDef>;
		required?: string[];
	};
}

interface ProjectionDef {
	boundedContext: string;
	aggregate?: string;
	event: string;
	rule: string;
}

export interface EsdmDocument {
	apiVersion: string;
	kind: string;
	name: string;
	description?: string;
	scope?: {
		domain: string;
		boundedContext?: string;
		aggregate?: string;
	};
	/** data schema for commands, events */
	data?: DataSchemaDef;
	publishes?: string[];
	readModel?: string;
	actors?: string[];
	constraints?: InvariantDef[];
	/** state schema for aggregates */
	state?: DataSchemaDef;
	invariants?: InvariantDef[];
	/** result schema for queries */
	result?: DataSchemaDef;
	parameters?: ParameterDef;
	/** schema for read-models */
	schema?: DataSchemaDef;
	paradigm?: string;
	projections?: ProjectionDef[];
	type?: ActorType;
	responsibilities?: string[];
	backedBy?: string[];
	scenarios?: Record<string, unknown>[];
}

export interface DomainModelLoadResult {
	documents: EsdmDocument[];
	error: string | null;
}

function extractFields(schema: DataSchemaDef | undefined, extraRequired?: string[]): FieldSchema[] {
	if (!schema?.properties) return [];
	const required = new Set([...(schema.required ?? []), ...(extraRequired ?? [])]);
	return Object.entries(schema.properties).map(([name, prop]) => ({
		name,
		type: prop.type ?? 'unknown',
		description: prop.description,
		enum: prop.enum,
		required: required.has(name)
	}));
}

function extractInvariants(defs: InvariantDef[] | undefined): Invariant[] {
	if (!defs) return [];
	return defs.map((d) => ({ name: d.name, rule: d.rule }));
}

function readYamlFile(filePath: string): EsdmDocument[] {
	try {
		const content = readFileSync(filePath, 'utf-8');
		return yaml
			.loadAll(content)
			.filter(
				(document): document is EsdmDocument => document !== null && typeof document === 'object'
			);
	} catch {
		return [];
	}
}

function walkDir(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			files.push(...walkDir(full));
		} else if (extname(entry) === '.yaml' && entry.endsWith('.esdm.yaml')) {
			files.push(full);
		}
	}
	return files;
}

export function loadEsdmDocs(dir: string): EsdmDocument[] {
	return walkDir(dir).flatMap(readYamlFile);
}

export function readDomainModel(configuredPath: string | undefined): DomainModelLoadResult {
	const modelPath = configuredPath?.trim();

	if (!modelPath) {
		return {
			documents: [],
			error: 'Please specify the path to the domain model.'
		};
	}

	try {
		const documents = loadEsdmDocs(resolve(modelPath));
		if (documents.length === 0) {
			return {
				documents,
				error: `Could not read domain model from ${modelPath}.`
			};
		}

		return { documents, error: null };
	} catch {
		return {
			documents: [],
			error: `Could not read domain model from ${modelPath}.`
		};
	}
}

export function findDomainStoryDocs(documents: EsdmDocument[], domain: string): EsdmDocument[] {
	return documents.filter(
		(doc) =>
			doc.apiVersion === 'schema.esdm.io/domain-storytelling/v1' &&
			doc.kind === 'domain-story' &&
			doc.scope?.domain === domain
	);
}

export { extractFields, extractInvariants };
