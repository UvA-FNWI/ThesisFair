start:
	minikube start --driver=kvm2 --memory=6g --disk-size=50g --cpus=8
	kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"

stop:
	minikube stop

delete:
	minikube delete

rabbitmqDashboard:
	kubectl port-forward "service/rabbitmq" 15672

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
# http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/#
