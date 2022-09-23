imageName=ghcr.io/quinten1333/thesisfair-schedule_service:base

.phony: build push

build:
	docker build -t ${imageName} .

push:
	docker push ${imageName}

dev:
	docker run -it --rm ${imageName} /bin/bash
