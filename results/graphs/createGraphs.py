from io import TextIOWrapper
import os
import requests
from datetime import datetime
import matplotlib.pyplot as plt
import numpy as np
from typing import List

prometheus_server = 'http://localhost:8001/api/v1/namespaces/monitoring/services/prometheus-server:80/proxy/api/v1'
service = 'default-service-api-gateway-80@kubernetes'
node = '192.168.1.120:9100'

def getRange(query: str, start: datetime, end: datetime, step: str = '20s'):
  result = requests.get(f'{prometheus_server}/query_range', {
    'query': query,
    'start': start.timestamp(),
    'end': end.timestamp(),
    'step': step,
  }).json()

  if result['status'] != 'success':
    print(result)
    raise BaseException(f'Prometheus status was not succes but was {result["status"]}')

  return result['data']

def makeGraph(query: str, start: datetime, end: datetime, name: str = 'out.jpg', ylabel: str = '', xlabel: str = '', legend: bool = True, line_labels: List[str] = [], gen_metric_name: callable = None, average_line: bool = False, process_data: callable = None, process_value: callable = None, averages_file: TextIOWrapper = None):
  data = getRange(query, start, end)
  result = data['result']
  if process_data:
    result = process_data(result)

  plt.figure()
  for i, result in enumerate(result):
    datapoints = np.array(result['values'], object)
    timestamps = datapoints[:, 0].astype(int) - start.timestamp()
    values = datapoints[:, 1].astype(float)

    if process_value:
      values = process_value(values)

    label = ''
    if legend:
      label = line_labels[i] if line_labels else gen_metric_name(result['metric'])
    plt.plot(timestamps, values, label=label)
    if averages_file:
      print(f'{name.split("/")[-1]} average value for {label}: {values.mean()}', file=averages_file)

    if average_line:
      plt.hlines(y=values.mean(), linestyles='dotted', xmin=0, xmax=timestamps[-1], color='orange', label='Average') #! Question: Shoul I do this ana?

  if label:
    plt.legend()
  plt.ylabel(ylabel)
  plt.xlabel(xlabel)
  plt.savefig(name)
  plt.close()

def makeRamGraph(experiment_name, start, end, averages_file: TextIOWrapper = None):
  used = getRange(f'node_memory_MemTotal_bytes{{instance="{node}"}} - node_memory_MemFree_bytes{{instance="{node}"}} - (node_memory_Cached_bytes{{instance="{node}"}} + node_memory_Buffers_bytes{{instance="{node}"}} + node_memory_SReclaimable_bytes{{instance="{node}"}})', start, end)['result'][0]
  cached = getRange(f'node_memory_Cached_bytes{{instance="{node}"}} + node_memory_Buffers_bytes{{instance="{node}"}} + node_memory_SReclaimable_bytes{{instance="{node}"}}', start, end)['result'][0]
  free = getRange(f'node_memory_MemFree_bytes{{instance="{node}"}}', start, end)['result'][0]

  plt.figure()
  colors = ['orange', 'blue', 'green']
  labels = ['Used', 'Cache + Buffer', 'Free']
  fill = []
  for i, result in enumerate([used, cached, free]):
    datapoints = np.array(result['values'], object)
    timestamps = datapoints[:, 0].astype(int) - start.timestamp()
    values = datapoints[:, 1].astype(float) * 9.31322575e-10
    if averages_file:
      print(f'RAM_usage.jpg average value for {labels[i]}: {values.mean()}', file=averages_file)

    if i == 0:
      prefValues = values
    else:
      values = prefValues + values
      prefValues = values


    fill.append([timestamps, values])
    plt.plot(timestamps, values, color=colors[i], label=labels[i])

  fill.reverse()
  for i, [timestamps, values] in enumerate(fill):
    plt.fill_between(timestamps, values, alpha=0.3, color=colors[len(colors) - i - 1])

  plt.ylabel('Ram usage (GiB)')
  plt.xlabel('Time since experiment start (seconds)')
  plt.legend(loc='lower right')
  plt.savefig(f'{experiment_name}/RAM_usage.jpg')
  plt.close()

def makeResults(experiment_name: str, start: datetime, end: datetime, rabbitMQ: bool = True):
  if os.path.isdir(f'./{experiment_name}'):
    print(f'Graphs for {experiment_name} alreay exist. Not recreating.')
    return

  os.mkdir(f'./{experiment_name}')
  averages_file = open(f'{experiment_name}/averages.txt', 'w')

  # Traefik
  makeGraph('sum(rate(traefik_service_requests_total{ code="200" }[20s]))', start, end,
    ylabel = 'Requests per second',
    xlabel='Time since experiment start (seconds)',
    line_labels=['Req/s to API gateway'],
    average_line=True,
    name = f'{experiment_name}/requests_per_second.jpg',
    averages_file=averages_file,
  )

  makeGraph('sum(rate(traefik_service_requests_total{ code!="200" }[20s]))', start, end,
    ylabel = 'Errors per second',
    xlabel='Time since experiment start (seconds)',
    name = f'{experiment_name}/errors_per_second.jpg',
    legend= False,
    averages_file=averages_file,
  )

  makeGraph(f'sum(traefik_service_request_duration_seconds_bucket{{service="{service}"}}) by (le) / scalar(sum(traefik_service_request_duration_seconds_count{{service="{service}"}}) by (service))', start, end,
    ylabel = 'Percentage of requests',
    xlabel='Time since experiment start (seconds)',
    name = f'{experiment_name}/response_time.jpg',
    gen_metric_name= lambda metric: f"Response within {metric['le']} ms",
    process_data= lambda data: [datapoints for datapoints in data if datapoints['metric']['le'] != '+Inf'],
    process_value= lambda values: values * 100,
    averages_file=averages_file,
  )

  makeGraph(f'sum(traefik_service_request_duration_seconds_sum{{service="{service}"}}) / sum(traefik_service_requests_total{{service="{service}"}}) * 1000', start, end,
    ylabel = 'API Response time (ms)',
    xlabel='Time since experiment start (seconds)',
    name = f'{experiment_name}/API_response_time.jpg',
    legend= False,
    averages_file=averages_file,
  )


  # Kubernetes
  makeGraph('count(kube_pod_container_status_ready{ namespace="default", container=~"api-gateway|.+-service" }) by (container)', start, end,
    ylabel = 'Service instances',
    xlabel='Time since experiment start (seconds)',
    name = f'{experiment_name}/service_instences_per_service.jpg',
    gen_metric_name= lambda metric: metric['container'],
    averages_file=averages_file,
  )


  # Node
  makeGraph(f'sum by (instance)(rate(node_cpu_seconds_total{{ mode="idle", instance="{node}"}}[20s])) * 100', start, end,
    ylabel = 'CPU usage percentage',
    xlabel='Time since experiment start (seconds)',
    name = f'{experiment_name}/CPU_usage.jpg',
    process_value= lambda values: 100 - values / 8,
    legend= False,
    averages_file=averages_file,
  )

  makeRamGraph(experiment_name, start, end, averages_file = averages_file)

  # RabbitMQ
  if rabbitMQ:
    makeGraph('sum(rabbitmq_queue_messages_ready * on(instance) group_left(rabbitmq_cluster, rabbitmq_node) rabbitmq_identity_info{rabbitmq_cluster="rabbitmq", namespace="default"}) by(rabbitmq_node)', start, end,
      ylabel = 'Queued messages',
      xlabel='Time since experiment start (seconds)',
      name = f'{experiment_name}/RabbitMQ_queue.jpg',
      legend= False,
      averages_file=averages_file,
    )

  averages_file.close()

if __name__ == '__main__':
  makeResults('BaseArchitectureScalabilityImproved - 1 4 50 2 2 8', datetime(2022, 6, 7, 10, 26, 00), datetime(2022, 6, 7, 10, 56, 00))
  makeResults('ThesisFair BaseArchitectureScalabilityImproved2x - 1 4 100 4 2 8', datetime(2022, 6, 7, 11, 28, 00), datetime(2022, 6, 7, 11, 58, 00))
  makeResults('ThesisFair BaseArchitectureScalabilityImproved3x - 1 4 150 6 2 8', datetime(2022, 6, 7, 12, 25, 00), datetime(2022, 6, 7, 12, 55, 00))
  makeResults('ThesisFair BaseArchitectureScalabilityImproved4x - 1 4 200 8 2 8', datetime(2022, 6, 7, 12, 5, 00), datetime(2022, 6, 7, 12, 15, 00))
  makeResults('ThesisFair httpCommunication1x - 1 4 50 2 2 8', datetime(2022, 6, 7, 13, 36, 00), datetime(2022, 6, 7, 14, 6, 00), rabbitMQ=False)
  makeResults('ThesisFair httpCommunication2x - 1 4 100 4 2 8', datetime(2022, 6, 7, 14, 30, 00), datetime(2022, 6, 7, 15, 00, 00), rabbitMQ=False)
  makeResults('ThesisFair httpCommunication3x - 1 4 150 6 2 8', datetime(2022, 6, 7, 15, 5, 00), datetime(2022, 6, 7, 15, 35, 00), rabbitMQ=False)
