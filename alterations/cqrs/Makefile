update:
	../scripts/updateContainerRepo.sh ./msa

up:
	cd kubernetes && ./build.sh
	kubectl apply -f ./kubernetes/build/

seed:
	kubectl apply -f kubernetes/dbInit.yaml

down:
	kubectl delete -f ./kubernetes/build/
	kubectl delete -f kubernetes/dbInit.yaml
