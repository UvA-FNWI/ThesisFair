#!/bin/bash

code_repository=$@
registry_port=5001
registry=localhost:$registry_port
node_env=development

# All subsequent actions will be performed in the minikube VM
eval $(minikube -p minikube docker-env)

# Guarantee that a container registry is running in minikube if the script
# expects a local container registry
docker run -d -p $registry_port:5000 --name registry registry:latest &&
  echo "Got internal container registry" ||
  echo "Internal container registry already on system"

docker start registry &&
  echo "Made sure internal container registry is running"

# Build docker containers - use tar to dereference symlinks, so frontend_service
# will work
echo "Building docker containers"
for dir in $code_repository/msa/*; do
  service=$(basename $dir)

  if [[ -e $dir/Dockerfile ]]; then
    echo "docker build -t \"$registry/$(echo $service | tr '[:upper:]' '[:lower:]')\" $dir"
    pushd $dir
    docker buildx build -t "$registry/$(echo $service | tr '[:upper:]' '[:lower:]')" \
      --build-arg NODE_ENV=$node_env \
      --build-context libraries=../libraries \
      .
    popd
  fi # &
done
