import client from './client'

/**
 * PARENT_OF is directed (person A is the parent of person B).
 * MARRIED_TO has no direction. For marriages, `extra` may hold
 * { marriage_year, divorced, divorce_year } (all optional).
 */
export async function createRelationship(treeId, personAId, personBId, type, extra = {}) {
  const body = { person_a_id: personAId, person_b_id: personBId, type }
  for (const [key, value] of Object.entries(extra)) {
    if (value !== null && value !== undefined && value !== false) body[key] = value
  }
  const { data } = await client.post(`/trees/${treeId}/relationships`, body)
  return data
}

/** Change a marriage. `fields` may hold marriage_year, divorced, divorce_year;
 *  only the fields you include are changed. */
export async function updateMarriage(treeId, relationshipId, fields) {
  const { data } = await client.patch(`/trees/${treeId}/relationships/${relationshipId}`, fields)
  return data
}
