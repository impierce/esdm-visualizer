import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	findDomainStoryDocs,
	loadEsdmDocs,
	readDomainModel,
	type EsdmDocument
} from './esdm-loader.js';

const temporaryDirectories: string[] = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

describe('loadEsdmDocs', () => {
	it('loads every document from a multi-document YAML file', () => {
		const directory = mkdtempSync(join(tmpdir(), 'esdm-loader-'));
		temporaryDirectories.push(directory);
		writeFileSync(
			join(directory, 'adding-item.esdm.yaml'),
			`apiVersion: schema.esdm.io/core/v1
kind: command
name: add-item
---
apiVersion: schema.esdm.io/core/v1
kind: event
name: added
---
apiVersion: schema.esdm.io/given-when-then/v1
kind: feature
name: adding-item
`
		);

		expect(loadEsdmDocs(directory).map((document) => document.name)).toEqual([
			'add-item',
			'added',
			'adding-item'
		]);
	});
});

describe('readDomainModel', () => {
	it('asks for a path when none is configured', () => {
		expect(readDomainModel(undefined)).toEqual({
			documents: [],
			error: 'Please specify the path to the domain model.'
		});
	});

	it('reports an unreadable configured path', () => {
		const path = '/path/that/does/not/exist';

		expect(readDomainModel(path)).toEqual({
			documents: [],
			error: `Could not read domain model from ${path}.`
		});
	});
});

describe('findDomainStoryDocs', () => {
	it('finds domain-scoped stories without a bounded-context scope', () => {
		const story: EsdmDocument = {
			apiVersion: 'schema.esdm.io/domain-storytelling/v1',
			kind: 'domain-story',
			name: 'ordering-and-fulfillment',
			scope: { domain: 'shop' }
		};
		const otherDomainStory: EsdmDocument = {
			...story,
			name: 'library-lending',
			scope: { domain: 'library' }
		};

		expect(findDomainStoryDocs([story, otherDomainStory], 'shop')).toEqual([story]);
	});
});
