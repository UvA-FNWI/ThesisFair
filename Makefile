ci:
	./scripts/run-cmd.sh ./msa "npm ci"

install:
	./scripts/run-cmd.sh ./msa "npm install"

buildProduction:
	./scripts/build-production.sh .

pushProduction:
	./scripts/push-production.sh .

buildDevelop:
	./scripts/build-development.sh .

pushDevelop:
	./scripts/push-development.sh .

dev:
	-helm uninstall thesisfair --wait || helm uninstall thesisfair
	minikube status | grep "host: Running" || minikube start --mount --mount-string="$$(pwd):/home/docker/thesisfair"
	minikube addons enable ingress
	-kubectl delete validatingwebhookconfigurations ingress-nginx-admission
	make buildDevelop
	make pushDevelop
	helm install thesisfair chart --values dev-values.yaml --wait
	kubectl port-forward svc/database 27017:27017 & node test/test/db.js run
	xdg-open http://$$(minikube ip) || open http://$$(minikube ip)

generateJWTSecret:
	openssl rand -base64 512

npmInstall:
	./scripts/npmInstall.sh ./msa
