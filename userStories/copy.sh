dependencies=("entity_service" "event_service" "project_service" "user_service" "vote_service")

mkdir -p ./src/dbs

for dep in "${dependencies[@]}"; do
  cp "../msa/$dep/src/database.js" "./src/dbs/$dep.js"
done
