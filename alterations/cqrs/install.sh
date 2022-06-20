#!/bin/bash

# Begin initializing build dir
cd $(dirname $0)
targetDir="../../build"

if [[ -e $targetDir ]]; then
  rm -r $targetDir
fi

mkdir -p $targetDir
# End initializing build dir

# Update kubernetes configuration
cp -r ./kubernetes $targetDir
cp -r ./msa $targetDir
cp -r ./Makefile $targetDir

# Rebuild kubernetes resources
(cd $targetDir/kubernetes && ./build.sh)
