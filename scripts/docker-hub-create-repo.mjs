import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
const image = process.env.DOCKER_IMAGE || 'flyfishdev/file-viewer'
const [namespace, repository] = image.split('/')
const username = process.env.DOCKERHUB_USERNAME || process.env.DOCKER_HUB_USERNAME
const token = process.env.DOCKERHUB_TOKEN || process.env.DOCKER_HUB_TOKEN
const bearerToken = process.env.DOCKERHUB_BEARER_TOKEN || process.env.DOCKER_HUB_BEARER_TOKEN

if (!namespace || !repository) {
  console.error('[docker-hub] DOCKER_IMAGE must use namespace/repository format.')
  process.exit(1)
}

const hubFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  })
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { response, body }
}

const formatErrorBody = body => {
  if (!body) {
    return ''
  }
  if (typeof body === 'string') {
    return body.slice(0, 500)
  }
  return JSON.stringify(body).slice(0, 500)
}

const getBearerToken = async () => {
  if (bearerToken) {
    return bearerToken
  }
  if (!username || !token) {
    console.error('[docker-hub] Missing DOCKERHUB_USERNAME and DOCKERHUB_TOKEN. Use a Docker Hub PAT with repository write/admin permission.')
    process.exit(1)
  }

  const { response, body } = await hubFetch('https://hub.docker.com/v2/auth/token', {
    method: 'POST',
    body: JSON.stringify({
      identifier: username,
      secret: token
    })
  })

  if (!response.ok || !body?.access_token) {
    console.error(`[docker-hub] Failed to create auth token: HTTP ${response.status} ${formatErrorBody(body)}`)
    process.exit(1)
  }

  return body.access_token
}

const authToken = await getBearerToken()
const authorization = { authorization: `Bearer ${authToken}` }
const repositoryUrl = `https://hub.docker.com/v2/namespaces/${namespace}/repositories/${repository}`

const existing = await hubFetch(repositoryUrl, { headers: authorization })
if (existing.response.ok) {
  console.log(`[docker-hub] Repository already exists: ${namespace}/${repository}`)
  process.exit(0)
}

if (existing.response.status !== 404) {
  console.error(`[docker-hub] Repository check failed: HTTP ${existing.response.status} ${formatErrorBody(existing.body)}`)
  process.exit(1)
}

const description = process.env.DOCKERHUB_DESCRIPTION || 'Pure web multi-format file viewer demo.'
const fullDescription = process.env.DOCKERHUB_FULL_DESCRIPTION ||
  `Flyfish Viewer ${packageJson.version}: static Docker image for the demo and document compare page.`

const created = await hubFetch(`https://hub.docker.com/v2/namespaces/${namespace}/repositories`, {
  method: 'POST',
  headers: authorization,
  body: JSON.stringify({
    name: repository,
    namespace,
    description,
    full_description: fullDescription,
    registry: 'docker.io',
    is_private: false
  })
})

if (!created.response.ok) {
  console.error(`[docker-hub] Repository create failed: HTTP ${created.response.status} ${formatErrorBody(created.body)}`)
  process.exit(1)
}

console.log(`[docker-hub] Repository created: ${namespace}/${repository}`)
