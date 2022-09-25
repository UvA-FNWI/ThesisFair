ansible:
	ansible-playbook -i ./hosts install.yml

sync:
	scp -r ./compose thesisfairDev:~/
	scp -r ./.env thesisfairDev:~/compose/.env

syncProd:
	rsync -r --rsync-path="sudo rsync" ./compose thesisfairProd:/opt/thesisfair/
	rsync --rsync-path="sudo rsync" ./.env.prod thesisfairProd:/opt/thesisfair/compose/.env
