# Thesis Fair Platform

Is the companion site for the thesis fairs hosted by the University of Amsterdam.
A thesis fair is an event where students and companies meet each other to find interesting thesis projects and students respectively.

# For developers

To run the platform locally in development mode (e.g. with automatic updating of microservices in response to edited code), it is presumed
that you have access to a local kubernetes cluster set up using minikube.
Minikube requires some certain settings for this (see code below).

You will be running the helm chart in development mode, which at a minimum requires setting `dev.enabled` to `true` in your `values.yaml`. You will also want to have a container repository running locally to push the containers to, which will be pulled by the helm chart to run the platform.

## From repo root

In `dev-values.yaml`:

```yaml
dev_mode: true

msa:
  API_gateway:
    env:
      JWT_SECRET: # Fill in
      OPENID_ISSUER_URL: # Fill in
      OPENID_CLIENT_ID: # Fill in
      OPENID_CLIENT_SECRET: # Fill in
      OPENID_REDIRECT_URL: # Fill in
      OPENID_RESOURCE: # Fill in
  user_service:
    env:
      jwtKey: # Fill in
      OVERRIDEMAIL: # Fill in
      MAILHOST: # Fill in
      MAILPORT: # Fill in
      MAILUSER: # Fill in
      MAILPASS: # Fill in
```

Run:

```sh
minikube start --mount --mount-string="${location of repository on your machine}:/home/docker/thesisfair"
minikube addons enable ingress
make pushDevelop # Will run a local container repository for you and push the containers there
helm install thesisfair chart --values dev-values.yaml # Run the helm chart in dev mode
kubectl port-forward svc/database 27017:27017 # Give your local machine access to the database in minikube
node test/test/db.js run # Populate the database with test values
xdg-open http://$(minikube ip) # Go to the platform
```

or alternatively, simply run `make dev` to start the dev environment.

# Microservices architecture

![Microservices architecture!](architecture.svg 'The microservices architecture')

# Database architecture

![Database architecture!](database.svg 'The database architecture')

# For operators

## Environment variables

- `JWT_SECRET` - Is the signing key for the JSON web tokens. The API gateway and user service need this token. It can be generated using the command `openssl rand -base64 512`.
- `FS_ROOT` - The root path of the project on the filesystem. Used to mount the data directories into the containers. (For example `/opt/thesisfair/`)
- `URL` - The url of the website(For example `thesisfair.ivi.uva.nl`).

### OpenID variables

These should be supplied to the API gateway.

- `OPENID_ISSUER_URL` - The URL of the openID instance.
- `OPENID_CLIENT_ID` - The Client ID that identifies this application to the openID server.
- `OPENID_CLIENT_SECRET` - The Client Secret to validate that this application is actually this application.
- `OPENID_REDIRECT_URL` - The URL to which should be redirected afterwards. Should have the form `https://<YRK>/sso/loggedin`
- `OPENID_RESOURCE` - Should have the form `https://<URL>`.

### Email variables

These are used by the user service to send emails regarding representative accounts.

- `OVERRIDEMAIL` - All emails that the system will send will be sent to this email address instead of the "correct" email address.
- `MAILHOST` - The SMTP host.
- `MAILPORT` - The port to use for SMTP.
- `MAILUSER` - The username to authenticate this application to the SMTP server.
- `MAILPASS` - The password to authenticate this application to the SMTP server.

## Build and push container images

Run `make pushProduction` in the root of the project. Make sure you are logged into the fnwi CR.

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

# Development notes

## Initializing dev environment

1. Duplicate the file `/msa/.env.examle`, name it `/msa/.env` and fill in the blanks.
1. Run `make ci` or `make install` in the root of the project to run `npm ci` or `npm install` respectively for each microservice.

## /scripts/runCmd.sh

This is a simple utility script which allows you to run the same command in every microservice folder.

```
Usage: runCmd.sh <root> <command>
```

So from the root of the project running `npm ci` is:

```sh
./scripts/runCmd.sh ./msa "npm ci"
```

## Docker compose

The docker-files in the different service folders should be executed from `/msa`.

The following environment variables should be used within the docker-compose files:

- `NODE_ENV` -> Set as `NODE_ENV` during building
- `NODE_CMD` -> Command to execute to start the container, either `start` for development with automatic restarting or `production` for production.

## Shared libraries

All shared libraries are in the `/msa/libraries` folder. The folder name should match their package name on npm so that during building the code can be rewritten using the regex `(\.\./)*libraries` -> `@amicopo`

## Authenticating the browser

When the `NODE_ENV` is set to `development`, it is possible to authenticate get requests sent directly from the browser by adding an authorization query parameter.
This way it is possible to access the graphqli interface via the URL: [http://localhost:3000/api/graphql?authorization={"type":"a"}](http://localhost:3000/api/graphql?authorization=%7B%22type%22%3A%22a%22%7D)
