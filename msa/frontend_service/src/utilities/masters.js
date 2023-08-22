import React from 'react'

import { degreeById } from './degreeDefinitions'

export const getMasterTag = (Tag, masterId, attributes) => {
  const { tag, tooltip } = degreeById[masterId]

  return <Tag label={tag} tooltip={tooltip} {...attributes} />
}
