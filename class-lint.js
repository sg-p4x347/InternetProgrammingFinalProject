'use strict';
module.exports = {
	env: {
		es6: true,
		node: true,
		browser: true
	},
	parserOptions: {
		ecmaVersion: 9
	},
	extends: 'eslint:recommended',
	rules: {
		indent: ['error', 'tab'],
		'linebreak-style': ['error', 'windows'],
		quotes: ['error', 'single'],
		semi: ['error', 'always'],
		eqeqeq: 2,
		curly: 2,
		'no-console': 0,
		strict: ['error', 'global'],
		'no-var': 2,
		'no-array-constructor': 2,
		'no-shadow-restricted-names': 2,
		'no-shadow': 2
	}
};
