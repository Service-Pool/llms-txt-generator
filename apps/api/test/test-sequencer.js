import Sequencer from '@jest/test-sequencer';

class CustomSequencer extends Sequencer {
	/**
	 * @param {Array<{path: string}>} tests
	 */
	sort(tests) {
		// Sort test files by their path (alphanumeric)
		const copyTests = Array.from(tests);
		return copyTests.sort((testA, testB) => (testA.path > testB.path ? 1 : -1));
	}
}

export default CustomSequencer;
