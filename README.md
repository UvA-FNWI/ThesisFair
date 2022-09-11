# Thesis Fair Platform
The Thesis Fair Platform is currently beign developed to be used for the Thesis Fairs at the UvA. **The version of the platform that was used for the Bachalor Thesis** can be found in the "thesis" branch.

# Running the platform
## Initializing kubernetes
1. Run `make init`

## Configure environment variables
TODO
### Environment variables
- `JWT_SECRET` - Is the signing key for the JSON web tokens. The API gateway and user service need this token. It can be generated using the command `openssl rand -base64 512`.

#### OpenID variables
These should be supplied to the API gateway.
- `OPENID_ISSUER_URL` - The URL of the openID instance.
- `OPENID_CLIENT_ID` - The Client ID that identifies this application to the openID server.
- `OPENID_CLIENT_SECRET` - The Client Secret to validate that this application is actually this application.
- `OPENID_REDIRECT_URL` - The URL to which should be redirected afterwards. Should have the form `https://<root>/sso/loggedin`
- `OPENID_RESOURCE` - Should have the form `https://<root>`.

## Running the ThesisFair software
### Kubernetes
To deploy run `make up`.

To remove the deployment run `make down`

## Initializing the database
### Testing
To seed the database for testing run `make seed`. Config for this can be found in `kubernetes/dbInit.yaml`.

The default logins are: `student`, `rep`, `repAdmin` and `admin`. Where the password is their username.

### Production
TODO


# Automated imports
All communication is handled over GraphQL and JSON. The GraphQL endpoint is located at `/api/graphql`.

## Sending requests:
- URL: https://thesisfair.qrcsoftware.nl/api/graphql
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
- - `entities` - Structured data of type EntityImport

The EntityImport type has the following fields:
- `ID` - A unique numeric identifier from the system that is sending the data
- `name` - The name of the organisation
- `admins` - Array of `AdminAccount` objects which have the keys `firstname`, `lastname` and `email`.
- `enabled` - When false the organisation will be deleted, otherwise it will be upserted.


Example Payload:
```
[
  {
    "ID": 10101,
    "name": "UvA",
    "admins": [
      {
        "firstname": "Quinten",
        "lastname": "Coltof",
        "email": "quinten.coltof@uva.nl",
      },
      {
        "firstname": "Yvanka",
        "lastname": "van Dijk",
        "email": "yvanka.van.dijk@uva.nl",
      },
    ],
    "enabled": true
  },
  {
    "ID": 20202,
    "name": "ASML",
    "admins": [
      {
        "firstname": "Lucas",
        "lastname": "van Dijk",
        "email": "lucas.van.dijk@uva.nl",
      },
      {
        "firstname": "Yvonne",
        "lastname": "van Dijk",
        "email": "yvonne.van.dijk@uva.nl",
      },
    ],
    "enabled": true
  }
]
```

## Project import
- GraphQL path: `project.import`
- Parameters:
- - `projects` - Structured data of type ProjectImport
- - `evid` - The event ID from the ThesisFair Platform

The ProjectImport type has the following fields:
- `ID` - A unique numeric identifier of the project
- `entityID` - The unique numeric identifier of the entity the project is linked to
- `name` - Name of the project
- `description` - The description of the project
- `datanoseLink` - The link to datanose (Complete url)
- `enabled` - When false the project will be deleted, otherwise it will be upserted.

Example payload:
```
[
  {
    "ID": 10101,
    "entityID": 0,
    "name": "Test Project",
    "description": "This is a test project",
    "datanoseLink": "https://datanose.nl/project/test",
    "enabled": true,
  },
  {
    "ID": 20202,
    "entityID": 0,
    "name": "UvA Project",
    "description": "You will be doing reserach at the UvA",
    "datanoseLink": "https://datanose.nl/project/UvAResearch",
    "enabled": true,
  },
]
```

## Vote import
- GraphQL path: `vote.import`
- Parameters:
- - `votes` - Structured data of type VoteImport
- - `evid` - The event ID from the ThesisFair Platform

The VoteImport type has the following fields:
- `studentnumber` - The student its studentnumber
- `projectID` - The unique numeric identifier of the project which has previously been supplied as ID parameter while importing the project
- `enabled` - When false the vote will be deleted, otherwise it will be upserted

Example payload:
```
[
  {
    studentnumber: 22245678,
    projectID: 0,
    enabled: true,
  },
  {
    studentnumber: 22245678,
    projectID: 2,
    enabled: true,
  },
]
```

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
- Traefik `http://<server ip>:32080` or `https://<server ip>:32443` or http://localhost:8001/api/v1/namespaces/default/services/traefik:80/proxy/
- Traefik dashboard: `make traefikDashboard` then http://localhost:9000/dashboard/
- Mailhog: http://localhost:8001/api/v1/namespaces/default/services/mailhog:8025/proxy/

## Authenticating the browser
When the `NODE_ENV` is set to `development`, it is possible to authenticate get requests send directly from the browser by adding an authorization query parameter.
This way it is possible to access the graphqli interface via the url: http://localhost:3000/api/graphql?authorization=%7B%22type%22%3A%22a%22%7D


