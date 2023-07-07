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
    echo "Got internal container registry" ||
    echo "Internal container registry already on system"

  docker start registry &&
    echo "Made sure internal container registry is running"
fi

# Build docker containers - use tar to dereference symlinks, so frontend_service
# will work
echo "Building docker containers"
for dir in $@/msa/*; do
  service=$(basename $dir)

  if [[ -e $dir/Dockerfile ]]; then
    echo "docker build -t \"$registry/${service,,}\" $dir"
    cd $dir
    docker buildx build -t "$registry/${service,,}" \
      --progress plain \
      --build-arg NODE_ENV=development \
      --build-context libraries=../libraries \
      .
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
