imageName=ghcr.io/quinten1333/thesisfair-project_service:cqrs-write

.phony: build push dev

build:
	docker build -t ${imageName} .

push:
	docker push ${imageName}

dev:
	docker compose up
