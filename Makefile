ci:
	./scripts/runCmd.sh ./msa "npm ci"

install:
	./scripts/runCmd.sh ./msa "npm install"

update:
	./scripts/updateContainerRepo.sh ./msa

generateJWTSecret:
	openssl rand -base64 512

npmInstall:
	./scripts/npmInstall.sh ./msa
