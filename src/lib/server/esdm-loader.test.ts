import { describe, expect, it } from 'vitest';
import { findDomainStoryDocs, readDomainModel, type EsdmDocument } from './esdm-loader.js';

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
