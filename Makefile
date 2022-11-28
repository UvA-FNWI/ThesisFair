update:
	./scripts/updateContainerRepo.sh ./msa

generateJWTSecret:
	openssl rand -base64 512
