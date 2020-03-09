test:
	@npm test

lint:
	node_modules/.bin/eslint .

.PHONY: test lint

