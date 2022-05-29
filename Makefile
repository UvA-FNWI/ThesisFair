start:
	minikube start --driver=kvm2 --memory=6g --disk-size=50g --cpus=8
	minikube addons enable metrics-server
	kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"

stop:
	minikube stop

delete:
	minikube delete

rabbitmqDashboard:
	xdg-open "http://localhost:3000/login"
	kubectl port-forward "service/rabbitmq" 15672

grafanaDashboard:
	xdg-open "http://localhost:3000/login"
	kubectl port-forward -n monitoring service/grafana 3000:3000

traefikDashboard:
	kubectl port-forward $$(kubectl get pods --selector "app.kubernetes.io/name=traefik" --output=name) 9000:9000

open:
	minikube service service-api-gateway --url


update:
	./scripts/updateContainerRepo.sh .

up:
	cd kubernetes && ./build.sh
	kubectl apply -f ./kubernetes/build/

init:
	cd server/initKubernetes && ./build.sh
	kubectl apply -f ./server/initKubernetes/build

seed:
	kubectl apply -f kubernetes/dbInit.yaml

down:
	kubectl delete -f ./kubernetes/build/
	kubectl delete -f kubernetes/dbInit.yaml

azureCLI:
	docker start -ai ThesisFair_azureCLI || docker run -it --network host -v $$HOME/.kube:/root/.kube --name ThesisFair_azureCLI mcr.microsoft.com/azure-cli

dashboardToken:
	kubectl create token admin -n kubernetes-dashboard
