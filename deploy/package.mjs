// Poskladá priečinok release/ na skopírovanie na NAS: dist + nginx.conf + docker-compose.yml.
import { cpSync, rmSync } from 'node:fs'

rmSync('release', { recursive: true, force: true })
cpSync('dist', 'release/dist', { recursive: true })
cpSync('deploy/nginx.conf', 'release/nginx.conf')
cpSync('deploy/docker-compose.nas.yml', 'release/docker-compose.yml')
console.log('Hotovo: priečinok release/ skopíruj na NAS a spusti v ňom `docker compose up -d`.')
