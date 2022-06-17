import os
import requests
from datetime import datetime
import matplotlib.pyplot as plt
import numpy as np
from scipy.stats import ttest_ind

prometheus_server = 'http://localhost:8001/api/v1/namespaces/monitoring/services/prometheus-server:80/proxy/api/v1'
service = 'default-service-api-gateway-80@kubernetes'
node = '192.168.1.120:9100'
line_styles = ['-.', '-', ':', '--']

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

def makeGraph(query, experiments, output_dir: str= 'out', filename: str = 'out.jpg', ylabel: str = '', xlabel: str = '', process_data: callable = None, process_value: callable = None):
  averages_file = open(os.path.join(output_dir, 'averages.txt'), 'a')
  print(f'\n\n{filename}', file=averages_file)
  averages = {}
  plt.figure()

  for exp_id, experiment_name in enumerate(experiments):
    start = experiments[experiment_name]['start']
    end = experiments[experiment_name]['end']
    name = experiments[experiment_name]['name']

    data = getRange(query, start, end)
    result = data['result']
    if process_data:
      result = process_data(result)

    datapoint_values = []
    for i, result in enumerate(result):
      datapoints = np.array(result['values'], object)
      timestamps = datapoints[:, 0].astype(int) - start.timestamp()
      values = datapoints[:, 1].astype(float)

      if process_value:
        values = process_value(values)

      datapoint_values.append(values)

    if len(result) == 0:
      raise BaseException(f'No data found for experiment {experiment_name}  {name} {start} {end}')

    datapoint_values = np.array(datapoint_values).sum(axis=0)
    plt.plot(timestamps, datapoint_values, line_styles[exp_id], label=name)

    instances = np.array(getRange('count(kube_pod_container_status_ready{ namespace="default", container=~"api-gateway|.+-service" }) by (container)', start, end)['result'][0]['values'], object)[:, 1].astype(float)[:datapoint_values.shape[0]]
    datapoint_values_per_instance = datapoint_values / instances

    averages[name] = {
      'mean': datapoint_values.mean(),
      'std': datapoint_values.std(),
      'significance': ttest_ind(base, datapoint_values) if name != 'base' else None,
      'mean_per_instance': datapoint_values_per_instance.mean(),
      'std_per_instance': datapoint_values_per_instance.std(),
      'significance_per_instance': ttest_ind(base_per_instance, datapoint_values_per_instance) if name != 'base' else None
    }

    if name == 'base':
      base = datapoint_values
      base_per_instance = datapoint_values_per_instance


  plt.legend()
  plt.ylabel(ylabel)
  plt.xlabel(xlabel)
  plt.savefig(os.path.join(output_dir, filename))
  plt.close()
  return averages

def makeResults(experiments, output_dir: str = 'out'):
  if not os.path.isdir(f'./{output_dir}'):
    os.mkdir(f'./{output_dir}')

  if os.path.isfile(os.path.join(output_dir, 'averages.txt')):
    os.remove(os.path.join(output_dir, 'averages.txt'))

  averages = {}

  # Traefik
  averages['Requests per second'] = makeGraph('sum(rate(traefik_service_requests_total{ code="200" }[20s]))', experiments,
    ylabel = 'Requests per second',
    xlabel='Time since experiment start (seconds)',
    filename = 'requests_per_second.jpg',
    output_dir= output_dir
  )

  averages['Errors'] = makeGraph('sum(increase(traefik_service_requests_total{ code!="200" }[20s]))', experiments,
    ylabel = 'Errors over time',
    xlabel='Time since experiment start (seconds)',
    filename = 'errors.jpg',
    output_dir= output_dir
  )

  # makeGraph(f'sum(traefik_service_request_duration_seconds_bucket{{service="{service}"}}) by (le) / scalar(sum(traefik_service_request_duration_seconds_count{{service="{service}"}}) by (service))', experiments,
  #   ylabel = 'Percentage of requests',
  #   xlabel='Time since experiment start (seconds)',
  #   filename = 'response_time.jpg',
  #   process_data= lambda data: [datapoints for datapoints in data if datapoints['metric']['le'] != '+Inf'],
  #   process_value= lambda values: values * 100,
  # )

  averages['API Response time (ms)'] = makeGraph(f'sum(traefik_service_request_duration_seconds_sum{{service="{service}"}}) / sum(traefik_service_requests_total{{service="{service}"}}) * 1000', experiments,
    ylabel = 'API Response time (ms)',
    xlabel='Time since experiment start (seconds)',
    filename = 'API_response_time.jpg',
    output_dir= output_dir
  )


  # # Kubernetes
  averages['Service instances'] = makeGraph('count(kube_pod_container_status_ready{ namespace="default", container=~"api-gateway|.+-service" }) by (container)', experiments,
    ylabel = 'Service instances',
    xlabel='Time since experiment start (seconds)',
    filename = 'service_instences_per_service.jpg',
    output_dir= output_dir
  )


  # # Node
  averages['CPU usage'] = makeGraph(f'sum by (instance)(rate(node_cpu_seconds_total{{ mode="idle", instance="{node}"}}[20s])) * 100', experiments,
    ylabel = 'CPU usage percentage',
    xlabel='Time since experiment start (seconds)',
    filename = 'CPU_usage.jpg',
    process_value= lambda values: 100 - values / 8,
    output_dir= output_dir
  ) # Calculate average performance gain per extra CPU

  averages['Memory usage'] = makeGraph(f'node_memory_MemTotal_bytes{{instance="{node}"}} - node_memory_MemFree_bytes{{instance="{node}"}}', experiments,
    ylabel = 'Memory usage (GiB)',
    xlabel='Time since experiment start (seconds)',
    filename = 'RAM_usage.jpg',
    process_value= lambda values: values * 9.31322575e-10,
    output_dir= output_dir
  )

  # # RabbitMQ
  rabbitmq_experiments = {}
  for exp in experiments:
    if experiments[exp]['rabbitmq']:
      rabbitmq_experiments[exp] = experiments[exp]
  makeGraph('sum(rabbitmq_queue_messages_ready * on(instance) group_left(rabbitmq_cluster, rabbitmq_node) rabbitmq_identity_info{rabbitmq_cluster="rabbitmq", namespace="default"}) by(rabbitmq_node)',
    rabbitmq_experiments,
    ylabel = 'Queued messages',
    xlabel='Time since experiment start (seconds)',
    filename = 'RabbitMQ_queue.jpg',
    output_dir= output_dir
  )

  return averages

def makeCSV(table_columns, loads, loads_names, sep, file, per_instance=False, end = '\n', sectionSep=''):
  mean = 'mean_per_instance' if per_instance else 'mean'
  std = 'std_per_instance' if per_instance else 'std'
  significance = 'significance_per_instance' if per_instance else 'significance'

  print('', *table_columns, sep=sep, end=end + sectionSep, file=file)
  for dataType in loads[0]:
    for load_index, load in enumerate(loads):
      print(dataType + loads_names[load_index], end=sep, file=file)
      for column in table_columns:
        data = load[dataType][column]
        if column == 'base':
          print(f"{np.round(data[mean], 2)} ({np.round(data[std], 2)})", end=sep, file=file)
          base = data
        else:
          # pstr = "{:.2f}".format(data[significance].pvalue)
          cellData = f"{np.round(data[mean]/base[mean] * 100-100, 2)}\\% ({np.round(data[std], 2)})"
          if data[significance].pvalue > 0.05:
            cellData = '\\textcolor{gray}{' + cellData + '}'
          elif data[significance].pvalue < 0.001:
            cellData = '\\textbf{' + cellData + '}'

          print(cellData, end=(sep if column != table_columns[-1] else ''), file=file)
      print(end=end, file=file)
    print(end=sectionSep, file=file)


if __name__ == '__main__':
  baseLoad = { # 1 4 50 2 2 8
    'ThesisFair BaseArchitectureScalabilityImproved': {
      'start': datetime(2022, 6, 7, 10, 26, 00),
      'end': datetime(2022, 6, 7, 10, 56, 00),
      'rabbitmq': True,
      'name': 'base'
    },
    'ThesisFair sidecarCommunication': {
      'start': datetime(2022, 6, 17, 15, 37, 00),
      'end': datetime(2022, 6, 17, 16, 7, 00),
      'rabbitmq': True,
      'name': 'sidecar'
    },
    'ThesisFair httpCommunication1x': {
      'start': datetime(2022, 6, 7, 13, 36, 00),
      'end': datetime(2022, 6, 7, 14, 6, 00),
      'rabbitmq': False,
      'name': 'http'
    },
    'ThesisFair clienCaching': {
      'start': datetime(2022, 6, 8, 20, 10, 00),
      'end': datetime(2022, 6, 8, 20, 40, 00),
      'rabbitmq': True,
      'name': 'client caching'
    },
  }

  twoLoad = { # 1 4 100 4 2 8
    'ThesisFair BaseArchitectureScalabilityImproved2x': {
      'start': datetime(2022, 6, 7, 11, 28, 00),
      'end': datetime(2022, 6, 7, 11, 58, 00),
      'rabbitmq': True,
      'name': 'base'
    },
    'ThesisFair sidecarCommunication': {
      'start': datetime(2022, 6, 17, 11, 27, 00),
      'end': datetime(2022, 6, 17, 11, 57, 00),
      'rabbitmq': True,
      'name': 'sidecar'
    },
    'ThesisFair httpCommunication2x': {
      'start': datetime(2022, 6, 7, 14, 29, 50),
      'end': datetime(2022, 6, 7, 14, 59, 50),
      'rabbitmq': False,
      'name': 'http'
    },
    'ThesisFair clienCaching': {
      'start': datetime(2022, 6, 8, 20, 48, 00),
      'end': datetime(2022, 6, 8, 21, 18, 00),
      'rabbitmq': True,
      'name': 'client caching'
    },
  }

  threeLoad = { # 1 4 150 6 2 8
    'ThesisFair BaseArchitectureScalabilityImproved3x': {
      'start': datetime(2022, 6, 7, 12, 25, 00),
      'end': datetime(2022, 6, 7, 12, 55, 00),
      'rabbitmq': True,
      'name': 'base'
    },
    'ThesisFair sidecarCommunication': {
      'start': datetime(2022, 6, 17, 12, 29, 00),
      'end': datetime(2022, 6, 17, 12, 59, 00),
      'rabbitmq': True,
      'name': 'sidecar'
    },
    'ThesisFair httpCommunication3x': {
      'start': datetime(2022, 6, 7, 15, 4, 50),
      'end': datetime(2022, 6, 7, 15, 34, 50),
      'rabbitmq': False,
      'name': 'http'
    },
    'ThesisFair clienCaching': {
      'start': datetime(2022, 6, 8, 21, 25, 00),
      'end': datetime(2022, 6, 8, 21, 55, 00),
      'rabbitmq': True,
      'name': 'client caching'
    },
  }

  averages_1xload = makeResults(baseLoad, '1xLoad')
  averages_2xload = makeResults(twoLoad, '2xLoad')
  averages_3xload = makeResults(threeLoad, '3xLoad')

  with open('averages.txt', 'w') as file:
    print('\\hline', file=file)
    makeCSV(
      table_columns = ['base', 'http', 'sidecar', 'client caching'],
      loads_names = [' 1x load', ' 2x load', ' 3x load'],
      loads = [averages_1xload, averages_2xload, averages_3xload],
      sep = '&',
      file=file,
      end='\\\\ \\hline\n',
      sectionSep='\hline\n'
    )
    print('\n\\hline', file=file)
    makeCSV(
      table_columns = ['base', 'http', 'sidecar', 'client caching'],
      loads_names = [' 1x load', ' 2x load', ' 3x load'],
      loads = [averages_1xload, averages_2xload, averages_3xload],
      sep = '&',
      file=file,
      per_instance=True,
      end='\\\\ \\hline\n',
      sectionSep='\hline\n'
    )
