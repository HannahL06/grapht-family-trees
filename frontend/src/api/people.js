import client from './client'

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

export async function deletePerson(treeId, personId) {
  await client.delete(`/trees/${treeId}/people/${personId}`)
}

export async function getRelatives(treeId, personId) {
  const { data } = await client.get(`/trees/${treeId}/people/${personId}/relatives`)
  return data
}
