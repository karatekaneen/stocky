module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testPathIgnorePatterns: ['/test/'],
	testMatch: ['**/__tests__/**/*.(spec|test).[t]s?(x)', '**/?(*.)+(spec|test).[t]s?(x)'],
}
