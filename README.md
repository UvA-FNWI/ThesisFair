# Thesis Fair Platform

Is the companion site for the thesis fairs hosted by the University of Amsterdam.
A thesis fair is an event where students and companies meet each other to find interesting thesis projects and students respectively.

# Microservices architecture

![Microservices architecture!](architecture.svg 'The microservices architecture')

# Database architecture

![Database architecture!](database.svg 'The database architecture')

# Running the platform

## Initializing the server

The server is initialized via the `/deploy/install.yml` ansible playbook.
This is run by adding the server to the `thesisfair` group and executing the ansible playbook.

### Server requirements

For staging a 1 vCPU and 2 GB ram server can be used (Standard B1ms in Azure cloud) without the monitoring stack.
For production 2 vCPU and 4 GB ram (Standard B2s in Azure cloud) seem to be enough with the monitoring stack.

## Configure environment variables

Copy and paste the template below to `/deploy/compose/.env` for staging environment and `/deploy/composeProd/.env` for production environment.

```
JWT_SECRET=

OPENID_ISSUER_URL=
OPENID_CLIENT_ID=
OPENID_CLIENT_SECRET=
OPENID_REDIRECT_URL=
OPENID_RESOURCE=

FS_ROOT=
URL=

OVERRIDEMAIL=
MAILHOST=
MAILPORT=
MAILUSER=
MAILPASS=
```

### Environment variables

- `JWT_SECRET` - Is the signing key for the JSON web tokens. The API gateway and user service need this token. It can be generated using the command `openssl rand -base64 512`.
- `FS_ROOT` - The root path of the project on the filesystem. Used to mount the data directories into the containers. (For example `/opt/thesisfair/`)
- `URL` - The url of the website(For example `thesisfair.qrcsoftware.nl`).

#### OpenID variables

These should be supplied to the API gateway.

- `OPENID_ISSUER_URL` - The URL of the openID instance.
- `OPENID_CLIENT_ID` - The Client ID that identifies this application to the openID server.
- `OPENID_CLIENT_SECRET` - The Client Secret to validate that this application is actually this application.
- `OPENID_REDIRECT_URL` - The URL to which should be redirected afterwards. Should have the form `https://<YRK>/sso/loggedin`
- `OPENID_RESOURCE` - Should have the form `https://<URL>`.

#### Email variables

These are used by the user service to send emails regarding representative accounts.

- `OVERRIDEMAIL` - All emails that the system will send will be sent to this email address instead of the "correct" email address.
- `MAILHOST` - The SMTP host.
- `MAILPORT` - The port to use for SMTP.
- `MAILUSER` - The username to authenticate this application to the SMTP server.
- `MAILPASS` - The password to authenticate this application to the SMTP server.

## Build and push container images

Run `make update` in the root of the project.

## Push deploy scripts

Add the staging server to your ssh config as `thesisfairDev` and production server as `thesisfairProd`.

Run `make sync` and `make syncProd` to sync the deploy files to the staging and production server respectively.

## Starting the ThesisFair Platform

SSH to the server and run `docker compose up -d` to start up the architecture.

# Configuring monitoring

All monitoring related configuration can be found in `/deploy/monitoring/`.

## Set the monitoring environment variables

Copy the template below to `/deploy/monitoring/.env` and `/deploy/monitoring/.env.prod` for staging and production environment respectively.

- `URL` - The same URL value as the other environment file.
- `WHITELISTED_IPS` - A comma separated list of all the IPs that are allowed to reach the Grafana dashboard.

```
URL=
WHITELISTED_IPS=
```

## Configure alert manager

Duplicate `/deploy/monitoring/alertmanager.template.yml` to `/deploy/monitoring/alertmanager.yml` and configure alertmanager to your liking.

## Run the monitoring

SSH to the server and run `docker compose up -d` in the monitoring directory to start the monitoring stack.

## Accessing monitoring

- Prometheus runs on port 9090
- Alert manager runs on port 9093
- Grafana runs on `https://{URL}/grafana` for whitelisted IPs

# Initializing the database

## Testing

Run `node test/test/db.js run` to initialize the database for testing.

The default logins are: `student`, `rep`, `repAdmin` and `admin`. Where the password is their username.

## Production

All data is automatically imported from an external system. Documentation for this is below.

The only manual database change that needs to be made is the creation of administrator accounts.

### Administrators

Administrators can be created by adding an entry in the `users` collection with a field email of type string and a field admin of type boolean and value true. Afterwards, the user can log in via single sign-on on the supplied email address.

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

There are two levels of errors. An **internal server error**, will be indicated by the presence of the error key in the response. In this case nothing has been imported.
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
- `representatives` - The number of representatives from this organisation, filled in by the event managers.
- `admins` - Array of `AdminAccount` objects which have the keys `firstname`, `lastname` and `email`.
- `enabled` - When false the organisation will be deleted, otherwise it will be upserted.

Example Payload:

```
[
  {
    "ID": 10101,
    "name": "UvA",
    "representatives": 2,
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
    "representatives": 2,
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

## Event import

- GraphQL path: `event.import`
- Parameters:
- - `events` - Structured data of type EventImport

The EventImport type has the following fields:

- `ID` - A unique numeric identifier of the project
- `name` - Name of the event
- `description` - Description of the event
- `start` - Start date of the event (timestamp)
- `location` - The address where the event is hosted
- `entities` - An array of the unique numeric identifiers of the entities that are present on this event
- `enabled` - When false the project will be deleted, otherwise it will be upserted.

Example payload:

```
[
  {
    "ID": 10101,
    "name": "Test event",
    "description": "This is a test event",
    "start": 1664110555634,
    "location": "Schience Park 904",
    "entities": [0, 1],
    "enabled": true,
  },
  {
    "ID": 20202,
    "name": "Test event 2",
    "description": "This is a test event 2",
    "start": 1664110565634,
    "location": "RoutersEiland",
    "entities": [1, 3],
    "enabled": true,
  },
]
```

## Project import

- GraphQL path: `project.import`
- Parameters:
- - `projects` - Structured data of type ProjectImport

The ProjectImport type has the following fields:

- `ID` - A unique numeric identifier of the project
- `entityID` - The unique numeric identifier of the entity the project is linked to
- `evids` - An array of the unique numeric identifiers of the events this project linked to
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
    "evids": [0, 1],
    "name": "Test Project",
    "description": "This is a test project",
    "datanoseLink": "https://datanose.nl/project/test",
    "enabled": true,
  },
  {
    "ID": 20202,
    "entityID": 0,
    "evids": [0, 1],
    "name": "UvA Project",
    "description": "You will be doing research at the UvA",
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

All shared libraries are in the `/msa/libraries` folder. The folder name should match their package name on npm so that during building the code can be rewritten using the regex `(\.\./)*libraries` -> `@amicopo`

## Shared databases

In the docker-compose.yml files, every service has its private MongoDB service. However, because these all have the same name only one will be created and all services will communicate with the same MongoDB database.

## Authenticating the browser

When the `NODE_ENV` is set to `development`, it is possible to authenticate get requests sent directly from the browser by adding an authorization query parameter.
This way it is possible to access the graphqli interface via the URL: [http://localhost:3000/api/graphql?authorization={"type":"a"}](http://localhost:3000/api/graphql?authorization=%7B%22type%22%3A%22a%22%7D)

## Automatic testing

Automatic testing is done using [mocha](https://mochajs.org/) and [chai](https://www.chaijs.com/) by running `npm run test` in the `/test` directory.
