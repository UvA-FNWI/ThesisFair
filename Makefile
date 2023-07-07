ci:
	./scripts/runCmd.sh ./msa "npm ci"

install:
	./scripts/runCmd.sh ./msa "npm install"

pushProduction:
	./scripts/build-push.sh production .

pushDevelop:
	./scripts/build-push.sh .

generateJWTSecret:
	openssl rand -base64 512

npmInstall:
	./scripts/npmInstall.sh ./msa
