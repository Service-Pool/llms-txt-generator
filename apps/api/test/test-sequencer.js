import Sequencer from '@jest/test-sequencer';
import { basename } from 'path';

class CustomSequencer extends Sequencer {
	/**
	 * @param {Array<{path: string}>} tests
	 */
	sort(tests) {
		// Sort test files by their filename (not full path)
		const copyTests = Array.from(tests);
		return copyTests.sort((testA, testB) => {
			const nameA = basename(testA.path);
			const nameB = basename(testB.path);
			return nameA.localeCompare(nameB);
		});
	}
}

export default CustomSequencer;
