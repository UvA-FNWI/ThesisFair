imageName=ghcr.io/quinten1333/thesisfair-frontend_service:base

.phony: build push

build:
	rm -r src/api
	cp -r ../libraries/thesisfair-api/ src/api/
	docker build -t ${imageName} .
	rm -r src/api
	ln -s ../../libraries/thesisfair-api/ src/api

push:
	docker push ${imageName}

