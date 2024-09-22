module.exports = {
    env: {
        browser: true,
        es6: true,
        node: true,
        jquery: true,
    },
    globals: {
        chrome: true,
        Dexie: true,
    },
    parserOptions: {
        ecmaVersion: 2020,
    },
    plugins: [
        '@stylistic/js',
    ],
    extends: [
        'eslint:recommended',
    ],
    rules: {
        '@stylistic/js/comma-dangle': ['error', 'always-multiline'],
        '@stylistic/js/indent': ['error', 4],
        '@stylistic/js/quotes': ['error', 'single'],
        '@stylistic/js/semi': ['error', 'always'],
        '@stylistic/js/space-before-function-paren': ['error', {
            'anonymous': 'always',
            'named': 'never',
            'asyncArrow': 'always',
        }],
    },
    ignorePatterns: [
        'chrome/libs/**',
    ],
};
