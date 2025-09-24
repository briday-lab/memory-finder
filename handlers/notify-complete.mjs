export const handler = async (event) => {
  console.log('Notify complete', JSON.stringify(event))
  return { notified: true }
}
