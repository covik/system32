.PHONY: *

build:
	docker buildx bake local

progress:
	docker run -it --rm -v $$PWD:/src \
		-e HOST_PROJECT_ROOT=$$PWD \
		--env-file=.env \
		-v /var/run/docker.sock:/var/run/docker.sock:ro \
		--network host \
		fms-infrastructure:local \
		bash

lint-commit:
	docker run --rm -v $$PWD:/src --entrypoint yarn fms-infrastructure:local commitlint --edit .git/COMMIT_EDITMSG

check-format:
	docker run --rm -v $$PWD:/src --entrypoint yarn fms-infrastructure:local format:check

type-check:
	docker run --rm -v $$PWD:/src --entrypoint yarn fms-infrastructure:local type-check
