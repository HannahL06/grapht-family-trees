import client from './client'

/** All people and relationships of a tree: { nodes: [{id, name}], edges: [{source, target, type, divorced, ...}] } */
export async function getGraph(treeId) {
  const { data } = await client.get(`/trees/${treeId}/graph`)
  return data
}
