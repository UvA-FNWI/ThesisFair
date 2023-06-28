imageName=ghcr.io/quinten1333/thesisfair-vote_service:base

.phony: build push

build:
	docker build -t ${imageName} .

push:
	docker push ${imageName}

npmInstall:
	npm ci
