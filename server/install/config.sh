# Note: grub, sudo and openssh are assumed to be installed
packages="base linux-lts linux-lts-headers linux-firmware grub efibootmgr networkmanager openssh sudo nano wget kubeadm kubelet cri-o kubectl"
services=("NetworkManager" "sshd" "crio")
defaultHostname="thesisfairserver"

userGroups="wheel"
