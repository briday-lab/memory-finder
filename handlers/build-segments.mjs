export const handler = async (event) => {
  // TODO: fuse audio/visual into segment rows
  console.log('BuildSegments input', JSON.stringify(event))
  return { segments: [] }
}
