import { SchemaComposer, TypeMapper } from 'graphql-compose'
import { readFileSync } from 'fs'
import { globSync } from 'glob'


/* Takes in an InputTypeComposer, ScalarTypeComposer, EnumTypeComposer,
 * UnionTypeComposer, or InterfaceTypeComposer and returns the type as a
 * simplified string (i.e. input, scalar, enum, union, interface) */
function typeComposerVariant(tc) {
  if (tc.constructor.name == 'Object') {
    return false
  }

  return tc.constructor.name.replace(/TypeComposer$/, '').toLowerCase()
}

/* Takes a TypeComposer (InputTypeComposer, EnumTypeComposer,
 * InterfaceTypeComposer or ObjectTypeComposer and returns the field names of
 * this typecomposer. If a field's value is another TypeComposer, the fields of
 * this child composer are included individually, prefixed by "{its name}."
 * if a field is inherited from another type, it is included, prefixed by
 * "{the original type}:" */
function expandedFieldNames(tc) {
  if (typeComposerVariant(tc) === 'union') {
    return [... new Set([].concat(
      ...tc.getTypes().map(
        t => expandedFieldNames(t).map(
          name => name.includes(':') ? name : `${t.getTypeName()}:${name}`
        )
      )
    ))]
  }

  // Map from interface name (e.g. userBase) to list of the interface's fields 
  const ifaces = Object.fromEntries(
    tc.getInterfaces().map(i => [i.getTypeName(), i.getFieldNames()])
  )

  const names = []

  for (const name of tc.getFieldNames()) {
    const field = tc.getFieldTC(name)
    const iface = Object.keys(ifaces).find(
      ifaceName => ifaces[ifaceName].includes(name)
    )

    if (iface) {
      // Inherited fields
      names.push(`${iface}:${name}`)
    } else if (typeComposerVariant(field) !== 'object') {
      // Plain fields
      names.push(name)
    } else {
      // Nested fields (object type has other children)
      names.push(...expandedFieldNames(field).map(childName => `${name}.${childName}`))
    }
  }

  return names
}

/* Takes in a graphql schema as a string and returns a mapping from types to
 * their field names, only outputs fields for enums, interfaces and objects,
 * not for compound, scalar or input types */
function schemaToFields(schema) {
  const relevantVariants = ['object', 'enum', 'interface', 'union']
  
  const tm = new TypeMapper(new SchemaComposer)
  const types = tm.parseTypesFromString(schema)
  
  // A list of relevant types (e.g. EntityContactInfo) as TypeComposer objects
  // representing these types
  const relevantTypes = [...types.values()].filter(v => relevantVariants.includes(typeComposerVariant(v)))

  const fields = Object.fromEntries(relevantTypes.map(type => [type.getTypeName(), expandedFieldNames(type)]))

  return fields
}

// Generate a mapping of fields from GraphQL schema files
const schema = globSync('../../**/schema.graphql').map(path => readFileSync(path).toString()).join()
const fields = schemaToFields(schema)

// Write result to json file
// writeFileSync('graphqlFields.json', JSON.stringify(fields))
console.log("export default " + JSON.stringify(fields, null, '\t'))
