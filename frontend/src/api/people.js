import client from './client'
import { updateMarriage } from './relationships'

export async function listPeople(treeId, search) {
  const { data } = await client.get(`/trees/${treeId}/people`, {
    params: search ? { search } : {},
  })
  return data
}

export async function getPerson(treeId, personId) {
  const { data } = await client.get(`/trees/${treeId}/people/${personId}`)
  return data
}

export async function createPerson(treeId, fields) {
  const { data } = await client.post(`/trees/${treeId}/people`, fields)
  return data
}

export async function updatePerson(treeId, personId, fields) {
  const { data } = await client.patch(`/trees/${treeId}/people/${personId}`, fields)
  return data
}

/**
 * Save the Edit form: the person's own fields, then any marriage whose year or
 * divorce details changed. `spouses` is the person's spouse list as loaded
 * (from getRelatives); `values` is what MemberFormDialog submits.
 */
export async function saveMemberEdit(treeId, personId, spouses, values) {
  await updatePerson(treeId, personId, values.person)
  for (const s of spouses) {
    const now = values.marriages[s.relationship_id]
    if (!now) continue
    // send only what changed
    const changes = {}
    if (now.marriage_year !== (s.marriage_year ?? null)) changes.marriage_year = now.marriage_year
    if (now.divorced !== Boolean(s.divorced)) changes.divorced = now.divorced
    if (now.divorce_year !== (s.divorce_year ?? null)) changes.divorce_year = now.divorce_year
    if (Object.keys(changes).length) await updateMarriage(treeId, s.relationship_id, changes)
  }
}

export async function deletePerson(treeId, personId) {
  await client.delete(`/trees/${treeId}/people/${personId}`)
}

export async function getRelatives(treeId, personId) {
  const { data } = await client.get(`/trees/${treeId}/people/${personId}/relatives`)
  return data
}
