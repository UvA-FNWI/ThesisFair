storageVolumes=30

if [[ -e build ]]; then
  rm -r build
fi

mkdir -p build

cp static/* "./build"

for ((i = 0 ; i < $storageVolumes ; i++)); do
  ssh root@192.168.1.120 "mkdir -p /data/volumes/storage$i"
  cp "./storageTemplate.yaml" "build/storage$i.yaml"
  sed -i "s/\$i/$i/g" "build/storage$i.yaml"
done
