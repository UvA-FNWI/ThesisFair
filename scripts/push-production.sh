#!/bin/bash

code_repository=$@
registry="fnwicr.azurecr.io/thesisfair"

echo "Pushing docker containers to registry: $registry"
for dir in $code_repository/msa/*; do
  service=$(basename $dir)

  if [[ -e $dir/Dockerfile ]]; then
    echo "docker push \"$registry/$(echo $service | tr '[:upper:]' '[:lower:]')\""
    docker push "$registry/$(echo $service | tr '[:upper:]' '[:lower:]')"
  fi
done
