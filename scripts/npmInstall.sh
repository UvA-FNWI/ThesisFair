#!/bin/bash

root=$1

# If $root does not exist, exit
if [[ ! -d $root ]]; then
  echo "Error: $root does not exist"
  exit 1
fi

for dir in $root/*; do
  if [[ ! -e $dir/Makefile ]]; then
    continue
  fi

  make -C $dir npmInstall &
done

libraryRoot=$root/libraries

for dir in $libraryRoot/*; do
  if [[ ! -e $dir/Makefile ]]; then
    continue
  fi

  make -C $dir npmInstall &
done

wait
