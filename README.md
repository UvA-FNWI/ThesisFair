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


# Imports
## Entity import
GraphQL path: `entity.import`
Supply a CSV file as the `file` parameter.

The first row of the CSV file should be a header containing column names. The case sensitive column names should be:
- `Name` - The name of the organisation
- `ID` - A unique numeric identifier from the system that is sending the data
- `Admin names` - The names of the administrators, separated by a `;` within the field.
- `Admin emails` - The email addresses of the organisation administrators, separated by a `;` within the field.
- `Enabled` - When `0` the organisation will be deleted, otherwise it will be upserted.


Example CSV:
```
Name,ID,Admin names,Admin emails,Enabled
UvA,1,Quinten Coltof;Yvanka van Dijk,quinten.coltof@uva.nl;yvanka.van.dijk@uva.nl,1
ASML,2,Lucas van Dijk;Yvonne van Dijk,Lucas@asml.nl;Yvonne@asml.nl,0
```

## Project import
GraphQL path: `project.import`
Supply a CSV file as the `file` parameter and the event ID from the ThesisFair Platform as the `evid` parameter.

The first row of the CSV file should be a header containing column names. The case sensitive column names should be:
- `Name` - Name of the project
- `enid` - The unique numeric identifier of the entity the project is linked to
- `ID` - A unique numeric identifier of the project
- `Description` - The description of the project
- `Datanose link` - The link to datanose (Complete url)
- `Enabled` - When `0` the project will be deleted, otherwise it will be upserted.

Example CSV:
```
Name,enid,ID,Description,Datanose link,Enabled
Test project,0,10101,This is a test project,https://datanose.nl/project/test,1
UvA Project,0,20202,You will be doing research at the UvA,https://datanose.nl/project/UvAResearch,1
```
