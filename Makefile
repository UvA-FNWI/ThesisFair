ci:
	./scripts/runCmd.sh ./msa "npm ci"

install:
	./scripts/runCmd.sh ./msa "npm install"

pushProduction:
	./scripts/build-push.sh production .

pushDevelop:
	./scripts/build-push.sh .

dev:
	minikube start --mount --mount-string="$$(pwd):/home/docker/thesisfair"
	minikube addons enable ingress
	make pushDevelop
	helm install thesisfair chart --values dev-values.yaml --wait
	kubectl port-forward svc/database 27017:27017 &
	node test/test/db.js run
	xdg-open http://$$(minikube ip)

generateJWTSecret:
	openssl rand -base64 512

npmInstall:
	./scripts/npmInstall.sh ./msa
