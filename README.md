# Thesis Fair Platform
The Thesis Fair Platform is currently beign developed to be used for the Thesis Fairs at the UvA. **The version of the platform that was used for the Bachalor Thesis** can be found in the "thesis" branch.

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
All communication is handled over GraphQL and JSON. The GraphQL endpoint is located at `/api/graphql`.

## Sending requests:
- URL: https://thesisfair.softwareify.nl/api/graphql
- Method: POST
- Headers:
- - `Content-Type: application/json`
- - `Authorization: Bearer <apiToken>`
- Payload: JSON encoding of query and variables

Example payload:
```
{
  query: "
    mutation importEntity($file: String!) {
      entity {
        import(file: $file) {
          error
        }
      }
    }
  ",
  variables: {
    file: "
      Name,ID,Admin names,Admin emails,Enabled
      UvA,1,Quinten Coltof;Yvanka van Dijk,quinten.coltof@uva.nl;yvanka.van.dijk@uva.nl,1
      ASML,2,Lucas van Dijk;Yvonne van Dijk,Lucas@asml.nl;Yvonne@asml.nl,0
    "
  }
}
```

## Reponse handling
There are two level of errors. An **internal server error**, which will be indicated by the precense of the error key in the response. In this case nothing has been imported.
The other type is an **import error** which signals that something is wrong with a specific line in the import file. Each row in the CSV will have a status object in the result array, below this has the JSON path `data.entity.import`. Import errors are returned by having a non-null error value in the status object.

Example response:
```
{
  "data": {
    "entity": {
      "import": [
        {
          "error": null
        },
        {
          "error": null
        }
      ]
    }
  }
}
```

Example internal server error response:
```
{
  "errors": [
    {
      "message": "Invalid Record Length: columns length is 5, got 4 on line 2",
      "path": [
        "entity",
        "import"
      ]
    }
  ],
  "data": {
    "entity": null
  }
}
```

## Entity import
- GraphQL path: `entity.import`
- Parameters:
- - `file` - The contents of the CSV export

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
- GraphQL path: `project.import`
- Parameters:
- - `file` - The contents of the CSV export
- - `evid` - The event ID from the ThesisFair Platform

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

## Vote import
- GraphQL path: `vote.import`
- Parameters:
- - `file` - The contents of the CSV export
- - `evid` - The event ID from the ThesisFair Platform

The first row of the CSV file should be a header containing column names. The case sensitive column names should be:
- `Studentnumber` - The student its studentnumber
- `Project_ID` - The unique numeric identifier of the project which has previously been supplied as ID parameter while importing the project
- `Enabled` - When `0` the vote will be deleted, otherwise it will be upserted.

Example CSV:
```
Studentnumber,Project_ID,Enabled
22245678,0,1
22245678,2,1
```
