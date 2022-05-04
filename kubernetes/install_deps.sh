# RabbitMQ Custom Resource Definitions
kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"
kubectl apply -f "rabbitmq.yml"

# MongoDB Custom Resource Definitions
# helm repo add mongodb https://mongodb.github.io/helm-charts
# helm repo update
# helm install community-operator mongodb/community-operator

# Traefik routing and Custom Resource Definitions
# helm repo add traefik https://helm.traefik.io/traefik
# helm repo update
# helm install traefik traefik/traefik
