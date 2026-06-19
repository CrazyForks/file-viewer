function typeOf(value) {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  if (Number.isInteger(value)) {
    return 'integer'
  }
  return typeof value
}

function jsonPointerDecode(value) {
  return value.replace(/~1/g, '/').replace(/~0/g, '~')
}

function resolveRef(rootSchema, ref) {
  if (!ref.startsWith('#/')) {
    throw new Error(`Unsupported schema ref: ${ref}`)
  }

  return ref
    .slice(2)
    .split('/')
    .map(jsonPointerDecode)
    .reduce((node, key) => {
      if (!node || typeof node !== 'object' || !(key in node)) {
        throw new Error(`Missing schema ref: ${ref}`)
      }
      return node[key]
    }, rootSchema)
}

function pathFor(path, key) {
  return `${path}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`
}

function validateNode(value, schema, rootSchema, path, failures) {
  if (!schema || typeof schema !== 'object') {
    return
  }

  if (schema.$ref) {
    validateNode(value, resolveRef(rootSchema, schema.$ref), rootSchema, path, failures)
    return
  }

  if ('const' in schema && value !== schema.const) {
    failures.push(`${path} must equal ${JSON.stringify(schema.const)}`)
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    failures.push(`${path} must be one of ${schema.enum.map(item => JSON.stringify(item)).join(', ')}`)
  }

  if (schema.type) {
    const accepted = Array.isArray(schema.type) ? schema.type : [schema.type]
    const actual = typeOf(value)
    const ok = accepted.includes(actual) || (actual === 'integer' && accepted.includes('number'))
    if (!ok) {
      failures.push(`${path} type ${actual} is not ${accepted.join('|')}`)
      return
    }
  }

  if (schema.type === 'object' || (!schema.type && value && typeof value === 'object' && !Array.isArray(value))) {
    const objectValue = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    for (const requiredKey of schema.required || []) {
      if (!(requiredKey in objectValue)) {
        failures.push(`${path} missing required property ${requiredKey}`)
      }
    }

    const properties = schema.properties || {}
    for (const [key, childValue] of Object.entries(objectValue)) {
      if (properties[key]) {
        validateNode(childValue, properties[key], rootSchema, pathFor(path, key), failures)
      } else if (schema.additionalProperties === false) {
        failures.push(`${path} has unexpected property ${key}`)
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        validateNode(childValue, schema.additionalProperties, rootSchema, pathFor(path, key), failures)
      }
    }
  }

  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    value.forEach((item, index) => {
      validateNode(item, schema.items, rootSchema, pathFor(path, index), failures)
    })
  }
}

export function validateJsonSchema(value, schema) {
  const failures = []
  validateNode(value, schema, schema, '#', failures)
  return failures
}
