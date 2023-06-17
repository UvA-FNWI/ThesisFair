//@preval

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
 * this child composer are included individually, prefixed by "{its name}." */
function expandedFieldNames(tc) {
  const fieldNames = []

  for (let [name, field] of Object.entries(tc.getFields())) {
    // Remove list, nonnull, etc. wrappers
    while (field.type || field.ofType) {
      if (field.type) {
        field = field.type
      }

      if (field.ofType) {
        field = field.ofType
      }
    }

    if (typeComposerVariant(field) !== 'object') {
      fieldNames.push(name)
    } else {
      fieldNames.push(...expandedFieldNames(field).map(childName => `${name}.${childName}`))
    }
  }

  return fieldNames
}

/* Takes in a graphql schema as a string and returns a mapping from types to
 * their field names, only outputs fields for enums, interfaces and objects,
 * not for compound, scalar or input types */
function schemaToFields(schema) {
  const relevantVariants = ['object', 'enum', 'interface']
  
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
console.log(JSON.stringify(fields, null, '\t'))
