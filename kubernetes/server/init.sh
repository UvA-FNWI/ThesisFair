sudo sed -i 's/--cni-bin-dir=\/usr\/lib\/cni//g' /etc/kubernetes/kubelet.env # Remove --cni-bin-dir

sudo sed -i 's/# unqualified-search-registries = .*/unqualified-search-registries = ["docker.io"]/g' /etc/containers/registries.conf
# sudo sed -i 's/# cgroup_manager = .*/cgroup_manager = "cgroupfs"/g' /etc/crio/crio.conf
# sudo sed -i 's/# conmon_cgroup = .*/conmon_cgroup = "pod"/g' /etc/crio/crio.conf
sudo systemctl restart crio

sudo systemctl enable kubelet
sudo kubeadm init --pod-network-cidr='10.244.0.0/16' --cri-socket='unix:///run/crio/crio.sock'
#--control-plane-endpoint kubernetes.home.qrcsoftware.nl

mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

hostname=$(cat /etc/hostname)
kubectl taint node $hostname node-role.kubernetes.io/control-plane:NoSchedule-
kubectl taint node $hostname node-role.kubernetes.io/master:NoSchedule-

# Flannel
# mkdir -p /opt/bin/
# wget https://github.com/flannel-io/flannel/releases/download/v0.18.0/flanneld-amd64 --output-document /opt/bin/flanneld
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
# kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml

kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.5.0/aio/deploy/recommended.yaml


kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"
