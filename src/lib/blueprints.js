export const totalPoints = (blueprints) =>
  blueprints.reduce((total, { points }) => total + (points?.length ?? 0), 0)

export const sortByName = (blueprints) =>
  [...blueprints].sort((first, second) => first.name.localeCompare(second.name))

export const isSameBlueprint = (first, second) =>
  Boolean(first && second) && first.author === second.author && first.name === second.name
