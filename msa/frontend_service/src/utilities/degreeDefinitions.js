export const degrees = {
  ai: {
    id: 'MScAI',
    tag: 'MSc AI',
    tooltip: 'Master Artificial Intelligence',
  },
  cs: {
    id: 'MScCS',
    tag: 'MSc CS',
    tooltip: 'Master Computer Science',
  },
  cls: {
    id: 'MScCLSJD',
    tag: 'MSc CLSJD',
    tooltip: 'Master Computational Science',
  },
  is: {
    id: 'MScISIS',
    tag: 'MSc IS - IS',
    tooltip: 'Master Information Studies - Information Systems',
  },
  isds: {
    id: 'MScISDS',
    tag: 'MSc IS - DS',
    tooltip: 'Master Information Studies - Data Science',
  },
  logic: {
    id: 'MScLogic',
    tag: 'MSc Logic',
    tooltip: 'Master Logic',
  },
  se: {
    id: 'MScSE',
    tag: 'MSc SE',
    tooltip: 'Master Software Engineering',
  },
}

export const degreeIds = Object.values(degrees).map(({ id }) => id)
export const degreeTags = Object.values(degrees).map(({ tag }) => tag)
export const degreeTagById = Object.fromEntries(Object.values(degrees).map(({ id, tag }) => [id, tag]))
export const degreeById = Object.fromEntries(
  Object.values(degrees).map(({ id, tag, tooltip }) => [id, { id, tag, tooltip }])
)
