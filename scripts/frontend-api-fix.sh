# Get the current environment values
OLD_DOCKER_TLS_VERIFY=$DOCKER_TLS_VERIFY
OLD_DOCKER_HOST=$DOCKER_HOST
OLD_DOCKER_CERT_PATH=$DOCKER_CERT_PATH
OLD_MINIKUBE_ACTIVE_DOCKERD=$MINIKUBE_ACTIVE_DOCKERD

# Set the new values
eval $(minikube docker-env)

DOCKER_ID=$(docker ps | grep frontend-service | awk '{print $1}')

DOCKER_ID=${DOCKER_ID:0:12}

echo "Copying api in frontend-service with Docker ID $DOCKER_ID"

docker exec $DOCKER_ID rm -rf src/api
docker exec $DOCKER_ID cp -r /libraries/thesisfair-api/ src/api/

# Set the old values back
DOCKER_TLS_VERIFY=$OLD_DOCKER_TLS_VERIFY
DOCKER_HOST=$OLD_DOCKER_HOST
DOCKER_CERT_PATH=$OLD_DOCKER_CERT_PATH
MINIKUBE_ACTIVE_DOCKERD=$OLD_MINIKUBE_ACTIVE_DOCKERD
