# This script finds the name of the frontend-service pod, takes its Docker ID, and runs
# docker exec DockerID echo " " > src/tmp/restart.txt, which restarts the frontend

DOCKER_ID=$(docker ps | grep frontend-service | awk '{print $1}')

DOCKER_ID=${DOCKER_ID:0:12}

echo "Restarting frontend-service with Docker ID $DOCKER_ID"

docker exec $DOCKER_ID touch /app/src/index.js
