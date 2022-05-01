start:
	minikube start --driver=kvm2
	minikube addons enable registry-creds
	minikube addons configure registry-creds

stop:
	minikube stop

delete:
	minikube delete

rabbitmqDashboard:
	kubectl port-forward "service/rabbitmq" 15672

traefikDashboard:
	kubectl port-forward $$(kubectl get pods --selector "app.kubernetes.io/name=traefik" --output=name) 9000:9000
