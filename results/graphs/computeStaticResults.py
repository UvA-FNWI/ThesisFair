import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

def service_usage():
  service_names = ['Entity', 'Event', 'Project', 'User', 'Vote']
  service_usage = [3.33, 8.32, 37.03, 36.47, 14.84]

  fig, ax = plt.subplots()
  bars = ax.bar(service_names, service_usage)
  ax.bar_label(bars, fmt='%g%%')
  ax.set_xlabel('Service')
  ax.set_ylabel('Percentage of requests to the service')

  ax.yaxis.set_major_formatter(ticker.FormatStrFormatter('%g%%'))

  fig.savefig('./serviceUsage.png')
  plt.close()

if __name__ == '__main__':
  service_usage()
