# Thesis Fair Platform
The Thesis Fair Platform is currently beign developed to be used for the Thesis Fairs of the UvA. **The version of the platform that was used for the Bachalor Thesis** can be found in the "thesis" branch.

# Development notes
## Docker compose
The docker-files in the different service folders should be executed from `/msa`.

The following environment variables should be used within the docker-compose files:
- `NODE_ENV` -> Set as `NODE_ENV` during building
- `NODE_CMD` -> Command to execute to start the container, either `start` for development with automatic restarting or `production` for production.

## Shared libraries
Are in the libraries folder. The folder name should match their package name on npm so that during build the code can be rewritten to make regex pattern `(\.\./)*libraries/amqpmessaging/index.js` -> `@amicopo/amqpmessaging/index.js`

## Shared databases
In production each service should have their own database. In the docker-compose.yml files every service has their own mongodb service. However, because these all have the same name only one will be created and all services will communicate with the same mongodb database.


## Cluster urls
- Dashboard http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
- Prometheus: http://localhost:8001/api/v1/namespaces/monitoring/services/prometheus-server:80/proxy/
- Grafana: `make grafanaDashboard` then http://localhost:3000/login
- RabbitMQ: `make rabbitmqDashboard` then http://localhost:15672/#/
- Traefik http: <server ip>:32080 or <server ip>:32443 or http://localhost:8001/api/v1/namespaces/default/services/traefik:80/proxy/
- Traefik dashboard: `make traefikDashboard` then http://localhost:9000/dashboard/
- Mailhog: http://localhost:8001/api/v1/namespaces/default/services/mailhog:8025/proxy/


## Initializing kubernetes
1. Run `make init`

## Running the ThesisFair software
To deploy run `make up`.

To remove the deployment run `make down`

To seed the database for stress testing run `make seed`. Config for this can be found in `kubernetes/dbInit.yaml`.
