imageName=ghcr.io/quinten1333/thesisfair-user_stories

.phony: build push dev

build:
	./copy.sh
	docker build -t ${imageName} .
	rm -r src/dbs

push:
	docker push ${imageName}

dev:
	docker compose up

run:
	node src/subordinate/run.js 1 4 500 40 2 8

test:
	node src/subordinate/run.js 1 4 100 2 2 8
