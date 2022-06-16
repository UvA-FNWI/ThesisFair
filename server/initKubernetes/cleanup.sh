storageVolumes=120

for ((i = 0 ; i < $storageVolumes ; i++)); do

  cp "./storageTemplate.yaml" "tmp.yaml"
  sed -i "s/\$i/$i/g" "tmp.yaml"

  namespace=($(kubectl get persistentvolume "local-storage$i" -o=custom-columns=CLAIM:spec.claimRef.namespace,BOUND:status.phase | tail -1))
  if [[ ${namespace[1]} == 'Available' || ${namespace[1]} == 'Bound' ]]; then
    continue
  fi
  if [[ ${namespace[0]} != 'default' ]]; then
    echo "local-storage$i is in state ${namespace[1]} used by namespace ${namespace[0]}. Not refreshing"
    continue
  fi

  ssh root@192.168.1.120 "rm -rf /data/volumes/storage$i/*"
  kubectl delete -f tmp.yaml
  kubectl apply -f tmp.yaml
done

rm tmp.yaml
