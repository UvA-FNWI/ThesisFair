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

amqpPackageLine='"@amicopo/amqpmessaging": "^1.0.3"'
newPackageLine='"@amicopo/sidecarclient": "^1.0.17"'

# Update kubernetes configuration
cp -r ./kubernetes $targetDir

# Replace library
cp -r sidecarclient $targetDir/msa/libraries
cp -r sidecarserver $targetDir/msa

find $targetDir/msa -maxdepth 2 -type f -name package.json -exec sed -i "s/${amqpPackageLine//\//\\/}/${newPackageLine//\//\\/}/g" {} \;
find $targetDir/msa -type f -not -name package-lock.json -exec sed -i "s/amqpmessaging/sidecarclient/g" {} \;

# Rename docker images
find $targetDir/msa -name Makefile -exec sed -i -E "s/(imageName=ghcr.io\/quinten1333\/thesisfair-.+)/\1:sidecarmessaging/" {} \;
find $targetDir/kubernetes -type f -not -name dbInit.yaml -exec sed -i -E "s/(image: ghcr.io\/quinten1333\/thesisfair-.+)/\1:sidecarmessaging/" {} \;

# npm install in all directories
for service in $targetDir/msa/*; do
  if [[ -f $targetDir/msa/$service/package.json ]]; then
    (cd $targetDir/msa/$service/ && npm install > /dev/null) &
  fi
done

wait

# Rebuild kubernetes resources
(cd $targetDir/kubernetes && ./build.sh)
