services=("entity_service" "event_service" "project_service" "user_service" "vote_service")

if [[ -e build ]]; then
  rm -r build
fi

mkdir -p build

cp static/*.yaml build
# curl -L -o build/rabbitmq-cluster-operator.yml "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"

for service in "${services[@]}"; do
  cp "./template.yaml" "build/$service.yaml"

  name=${service//\_/\-}
  sed -i "s/\$serviceName/$name/g" "build/$service.yaml"
  sed -i "s/\$imagePostFix/$service/g" "build/$service.yaml"
done
