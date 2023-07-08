#!/bin/bash

code_repository=$@
registry_port=5001
registry=localhost:$registry_port

# All subsequent actions will be performed in the minikube VM
eval $(minikube docker-env)

# Guarantee that a container registry is running in minikube if the script
# expects a local container registry
docker run -d -p $registry_port:5000 --name registry registry:latest &&
  echo "Got internal container registry" ||
  echo "Internal container registry already on system"

docker start registry &&
  echo "Made sure internal container registry is running"

echo "Pushing docker containers to registry: $registry"
for dir in $code_repository/msa/*; do
  service=$(basename $dir)

  if [[ -e $dir/Dockerfile ]]; then
    echo "docker push \"$registry/$(echo $service | tr '[:upper:]' '[:lower:]')\""
    docker push "$registry/$(echo $service | tr '[:upper:]' '[:lower:]')"
  fi
done
