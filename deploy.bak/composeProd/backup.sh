source .env

cd $FS_ROOT/backup || exit 1
dir=$(date '+%Y-%m-%d:%H:%M')

mkdir -p db || exit 2
docker run --rm --entrypoint="mongodump" --volume="$FS_ROOT/backup/db:/dumpDir" --network="host" mongo --archive="/dumpDir/$dir.zip" --gzip

for service in "entityService" "userService" "eventService" "grafana" "prometheus"; do
  echo "Backing up $service"
  mkdir -p $service || exit 2
  tar -cJf ./$service/$dir.tar.xz $FS_ROOT/data/$service || exit 3
done
