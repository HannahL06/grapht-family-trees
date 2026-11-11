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

export async function getRelatives(treeId, personId) {
  const { data } = await client.get(`/trees/${treeId}/people/${personId}/relatives`)
  return data
}
