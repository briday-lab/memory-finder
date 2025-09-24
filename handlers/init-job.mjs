export const handler = async (event) => {
  console.log('InitJob event', JSON.stringify(event))
  return { ok: true, input: event }
}
