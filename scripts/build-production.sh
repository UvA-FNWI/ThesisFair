#!/bin/bash

code_repository=$@
node_env=production
registry="fnwicr.azurecr.io/thesisfair"

echo "Building docker containers"
for dir in $code_repository/msa/*; do
  service=$(basename $dir)

  if [[ -e $dir/Dockerfile ]]; then
    echo "docker build -t \"$registry/$(echo $service | tr '[:upper:]' '[:lower:]')\" $dir"
    pushd $dir
    docker buildx build -t "$registry/$(echo $service | tr '[:upper:]' '[:lower:]')" \
      --load \
      --build-arg NODE_ENV=$node_env \
      --build-context libraries=../libraries \
      .
    popd
  fi
done
