import client from './client'

export async function getTrees() {
  const { data } = await client.get('/trees')
  return data
}

export async function getTree(id) {
  const { data } = await client.get(`/trees/${id}`)
  return data
}

export async function createTree(name) {
  const { data } = await client.post('/trees', { name })
  return data
}
