SONARQUBE_URL="localhost:9000"
path="$(pwd)/../msa/"

docker run \
    --rm \
    -v "${path}:/usr/src" \
    --network=host \
    sonarsource/sonar-scanner-cli \
    -Dsonar.projectKey=thesisfair \
    -Dsonar.sources=. \
    -Dsonar.host.url=http://localhost:9000 \
    -Dsonar.login=8bbf729ee5c437235b778af977f33419babeed09 \
    -Dsonar.exclusions=**/node_modules/**
