#!/bin/bash

if [[ $1 != production ]]; then
  codeRepository=$@
  registryPort=5000
  registry=localhost:$registryPort

  # All subsequent actions will be performed in the minikube VM
  source <(minikube docker-env)

  # Guarantee that a container registry is running in minikube if the script
  # expects a local container registry
  docker run -d -p $registryPort:5000 --name registry registry:latest &&
    echo "Got internal container registry" ||
    echo "Internal container registry already on system"

  docker start registry &&
    echo "Made sure internal container registry is running"
else
  codeRepository=$2
  registry="fnwicr.azurecr.io/thesisfair"
fi

# Build docker containers - use tar to dereference symlinks, so frontend_service
# will work
echo "Building docker containers"
for dir in $codeRepository/msa/*; do
  service=$(basename $dir)

  if [[ -e $dir/Dockerfile ]]; then
    echo "docker build -t \"$registry/${service,,}\" $dir"
    pushd $dir
    docker buildx build -t "$registry/${service,,}" \
      --build-arg NODE_ENV=development \
      --build-context libraries=../libraries \
      .
    popd
  fi # &
done
wait

echo "Pushing docker containers to registry: $registry"
for dir in $codeRepository/msa/*; do
  service=$(basename $dir)

  if [[ -e $dir/Dockerfile ]]; then
    echo "docker push \"$registry/${service,,}\""
    docker push "$registry/${service,,}"
  fi
done
wait
