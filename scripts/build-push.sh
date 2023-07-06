#!/bin/bash

registryPort=5000
registryUrl=localhost
registry=localhost:5000

# All subsequent actions will be performed in the minikube VM
source <(minikube docker-env)

# Guarantee that a container registry is running in minikube if the script
# expects a local container registry
if [[ $registryUrl == localhost ]]; then
  docker run -d -p $registryPort:5000 --name registry registry:latest &&
    echo "Started internal container registry" ||
    echo "Internal container registry already running"
fi

# Build docker containers - use tar to dereference symlinks, so frontend_service
# will work
echo "Building docker containers"
for dir in $@/msa/*; do
  service=$(basename $dir)

  if [[ -e $dir/Dockerfile ]]; then
    echo "docker build -t \"$registry/${service,,}\" $dir"
    cd $dir
    tar -ch . | docker build -t "$registry/${service,,}" -
  fi &
done
wait

echo "Pushing docker containers to registry: $registry"
for dir in $@/msa/*; do
  service=$(basename $dir)

  if [[ -e $dir/Dockerfile ]]; then
    echo "docker push \"$registry/${service,,}\""
    docker push "$registry/${service,,}"
  fi &
done
wait
