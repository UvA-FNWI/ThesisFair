imageName=ghcr.io/quinten1333/thesisfair-schedule_service:base

.phony: build push

build:
	docker build -t ${imageName} .

push:
	docker push ${imageName}

dev:
	docker run -it --rm -v "$$(pwd)/tmp:/app/node/tmp" --entrypoint /bin/bash ${imageName}

npmInstall:
	npm ci
