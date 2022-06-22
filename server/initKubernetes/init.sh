# Dashboard
kubectl apply -f "https://raw.githubusercontent.com/kubernetes/dashboard/v2.5.0/aio/deploy/recommended.yaml"

# RabbitMQ Custom Resource Definisons
kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"

helmInstalled=$(helm list -A)

# Prometheus for monitoring
if [[ "$helmInstalled" == *"\nprometheus"* ]]; then
  kubectl create namespace monitoring
  helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
  helm install prometheus prometheus-community/prometheus --namespace monitoring --set server.global.scrape_interval=10s --set server.retention=365d
else
  echo "Prometheus already installed. Not re-installing"
fi

# Traefik for ingress routing
if [[ "$helmInstalled" == *"\ntraefik"* ]]; then
  helm repo add traefik https://helm.traefik.io/traefik # Source code: https://github.com/traefik/traefik-helm-chart/
  helm install traefik traefik/traefik --set service.type=NodePort --set nodePort=true --set ports.web.nodePort=32080 --set ports.websecure.nodePort=32443 --set ports.traefik.expose=true
else
  echo "Traefik already installed. Not re-installing"
fi

./build.sh
kubectl apply -f ./build/
