#!/bin/bash

processes=4

workload=$1
name=$2
caching=$3
students=$(( 50 * $workload ))
companies=$(( 2 * $workload ))

caching=''
if [[ $3 == 'caching' ]]; then
  caching='--caching 60'
fi

# 50 students and 2 companies is 1 unit
for ((i = 0 ; i < processes ; i++)); do
  node src/subordinate/run.js 1 4 $students $companies 2 8 http://192.168.1.120:32080/ $processes $i --db mongodb://localhost/$name --run "$name|x$workload" $caching &
done

wait
