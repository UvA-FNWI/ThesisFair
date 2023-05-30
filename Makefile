update:
	./scripts/updateContainerRepo.sh ./msa

generateJWTSecret:
	openssl rand -base64 512

npmInstall:
	./scripts/npmInstall.sh ./msa
