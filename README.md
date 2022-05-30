# Docker compose
The docker-files in the different service folders should be executed from the git root.

The following environment variables should be used within the docker-compose files:
- `NODE_ENV` -> Set as `NODE_ENV` during building
- `NODE_CMD` -> Command to execute to start the container, either `start` for development with automatic restarting or `production` for production.

# Shared libraries
Are in the libraries folder. The folder name should match their package name on npm so that during build the code can be rewritten to make regex pattern `(\.\./)*libraries/amqpmessaging/index.js` -> `@amicopo/amqpmessaging/index.js`

# Shared databases
In production each service should have their own database. In the docker-compose.yml files every service has their own mongodb service. However, because these all have the same name only one will be created and all services will communicate with the same mongodb database.


# Cluster urls
- Dashboard http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
- Prometheus: http://localhost:8001/api/v1/namespaces/monitoring/services/prometheus-server:80/proxy/
- Grafana: `make grafanaDashboard` then http://localhost:3000/login
- RabbitMQ: `make rabbitmqDashboard` then http://localhost:15672/#/
- Traefik http: <server ip>:32080 or <server ip>:32443 or http://localhost:8001/api/v1/namespaces/default/services/traefik:80/proxy/
- Traefik dashboard: `make traefikDashboard` then http://localhost:9000/dashboard/


# Installation

## Installing the OS
1. On the host pc run `cd server/install/ && python Arch-installer/serve.py config.sh`
1. On the server, boot into the archlinux live iso
1. Download the installer by doing `curl <host pc ip>:8000/dl.sh | sh`
1. Start the installer: `./install.sh`
1. Follow the install instructions

## Installing kubernetes
Execute `init.sh` on the server. This can be done by doing:
1. `scp server/install/init.sh <server ip>:~/init.sh`
1. `ssh <server ip>`
1. - `chmod +x init.sh`
1. - `./init.sh`
1. Download kube config to local machine: `scp <server ip>:~/.kube/config ~/.kube/config`

## Initializing kubernetes
1. Point the ssh command in `server/initKubernetes/build.sh`(line 12) to your server.
1. Run `make init`

## Configuring kubernetes
To monitor the RabbitMQ instance the ThesisFair software will use, it needs to be added to the prometheus scrape config. To edit the prometheus configuration run:
```
kubectl edit cm prometheus-server -n monitoring -o yaml
```

Add the config below to the "scrape_configs" section.
```
    - job_name: RabbitMQ
      scrape_interval: 10s
      static_configs:
      - targets:
        - rabbitmq.default.svc.cluster.local:15692
    - job_name: Traefik
      scrape_interval: 10s
      static_configs:
      - targets:
        - traefik.default.svc.cluster.local:9100
```

## Running the ThesisFair software
To deploy run `make up`.

To remove the deployment run `make down`

To seed the database for stress testing run `make seed`. Config for this can be found in `kubernetes/dbInit.yaml`.
