.PHONY: *

build:
	docker buildx bake local

progress:
	docker run -it --rm -v $$PWD:/src \
		-e HOST_PROJECT_ROOT=$$PWD \
		--env-file=.env \
		-v /var/run/docker.sock:/var/run/docker.sock:ro \
		--network host \
		fms-local \
		bash
