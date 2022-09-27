ansible:
	ansible-playbook -i ./hosts install.yml

sync:
	scp -r ./compose thesisfairDev:~/
	scp -r ./docker-compose.yml thesisfairDev:~/compose/docker-compose.yml

syncProd:
	rsync -r --rsync-path="sudo rsync" --delete ./composeProd/ thesisfairProd:/opt/thesisfair/compose
	rsync --rsync-path="sudo rsync" ./docker-compose.yml thesisfairProd:/opt/thesisfair/compose/docker-compose.yml
