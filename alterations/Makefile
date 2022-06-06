update:
	../scripts/updateContainerRepo.sh ./msa

up:
	cd kubernetes && ./build.sh
	kubectl apply -f ./kubernetes/build/

init:
	cd server/initKubernetes && ./init.sh

seed:
	kubectl apply -f kubernetes/dbInit.yaml

down:
	kubectl delete -f ./kubernetes/build/
	kubectl delete -f kubernetes/dbInit.yaml
