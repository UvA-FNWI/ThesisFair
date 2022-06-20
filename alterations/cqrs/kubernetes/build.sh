services=("entity_service" "event_service" "project_service" "vote_service")

if [[ -e build ]]; then
  rm -r build
fi

mkdir -p build

cp static/*.yaml build

for service in "${services[@]}"; do
  cp "./template.yaml" "build/$service.yaml"

  name=${service//\_/\-}
  queueName="api-${service//\_service/}"
  sed -i "s/\$serviceName/$name/g" "build/$service.yaml"
  sed -i "s/\$imagePostFix/$service/g" "build/$service.yaml"
  sed -i "s/\$queueName/$queueName/g" "build/$service.yaml"
done
