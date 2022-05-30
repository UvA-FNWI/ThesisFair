# Dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.5.0/aio/deploy/recommended.yaml

# RabbitMQ Custom Resource Definisons
kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"

# Prometheus for monitoring
kubectl create namespace monitoring
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/prometheus --namespace monitoring

# Traefik for ingress routing
helm repo add traefik https://helm.traefik.io/traefik
helm install traefik traefik/traefik --set service.type=NodePort --set nodePort=true --set ports.web.nodePort=32080 --set ports.websecure.nodePort=32443 --set ports.traefik.expose=true

./build.sh
kubectl apply -f ./build/
