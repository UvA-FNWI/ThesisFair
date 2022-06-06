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
newPackageLine='"@amicopo/httpmessaging": "^1.0.5"'

# Replace library
cp -r ./kubernetes $targetDir
cp -r httpmessaging $targetDir/msa/libraries
rm $targetDir/kubernetes/static/rabbitmq.yaml

find $targetDir/msa -maxdepth 2 -type f -name package.json -exec sed -i "s/${amqpPackageLine//\//\\/}/${newPackageLine//\//\\/}/g" {} \;
find $targetDir/msa -type f -not -name package-lock.json -exec sed -i "s/amqpmessaging/httpmessaging/g" {} \;

# Rename docker images
find $targetDir/msa -name Makefile -exec sed -i -E "s/(imageName=ghcr.io\/quinten1333\/thesisfair-.+)/\1:httpcommunication/" {} \;
find $targetDir/kubernetes/build -type f -exec sed -i -E "s/(image: ghcr.io\/quinten1333\/thesisfair-.+)/\1:httpcommunication/" {} \;

# npm install in all directories
for service in $targetDir/msa/*; do
  if [[ -f $targetDir/msa/$service/package.json ]]; then
    (cd $targetDir/msa/$service/ && npm install > /dev/null)
  fi
done

# Rebuild kubernetes resources
(cd $targetDir/kubernetes && ./build.sh)
