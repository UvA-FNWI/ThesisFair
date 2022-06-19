#!/bin/bash

# Begin initializing build dir
cd $(dirname $0)
targetDir="../../build"

if [[ -e $targetDir ]]; then
  rm -r $targetDir
fi

mkdir -p $targetDir

cp -r ../Makefile $targetDir
cp -r ../../kubernetes $targetDir
cp -r ../../msa $targetDir
find $targetDir/msa -name node_modules -prune -execdir rm -r {} +
# End initializing build dir

# Update kubernetes configuration
cp -r ./kubernetes $targetDir
cp -r ./msa $targetDir

# Install new dependency
(cd $targetDir/msa/API_gateway && npm install redis@^4.1.0 )

# Rename docker images
find $targetDir/msa -name Makefile -exec sed -i -E "s/(imageName=ghcr.io\/quinten1333\/thesisfair-.+)/\1:server-side-caching/" {} \;
find $targetDir/kubernetes -type f -not -name dbInit.yaml -exec sed -i -E "s/(image: ghcr.io\/quinten1333\/thesisfair-.+)/\1:server-side-caching/" {} \;

# npm install in all directories
for service in $targetDir/msa/*; do
  if [[ -f $targetDir/msa/$service/package.json ]]; then
    (cd $targetDir/msa/$service/ && npm install > /dev/null) &
  fi
done

wait

# Rebuild kubernetes resources
(cd $targetDir/kubernetes && ./build.sh)
