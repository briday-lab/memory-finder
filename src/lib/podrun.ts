interface RunPodJob {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  result?: unknown
  error?: string
}

export class RunPodClient {
  private apiKey: string
  private endpoint: string

  constructor() {
    this.apiKey = process.env.RUNPOD_API_KEY!
    this.endpoint = process.env.RUNPOD_ENDPOINT!
  }

  async createVideoProcessingJob(
    videoUrl: string,
    audioUrl?: string,
    searchQuery?: string
  ): Promise<RunPodJob> {
    const response = await fetch(`${this.endpoint}/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation RunPod($input: RunPodInput!) {
            runPod(input: $input) {
              id
              status
            }
          }
        `,
        variables: {
          input: {
            name: "video-processing",
            input: {
              video_url: videoUrl,
              audio_url: audioUrl,
              search_query: searchQuery,
            },
          },
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`RunPod API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data.runPod
  }

  async getJobStatus(jobId: string): Promise<RunPodJob> {
    const response = await fetch(`${this.endpoint}/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query GetPodStatus($id: String!) {
            pod(id: $id) {
              id
              status
              result
              error
            }
          }
        `,
        variables: {
          id: jobId,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`RunPod API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data.pod
  }

  async searchVideoMoment(
    videoUrl: string,
    searchQuery: string
  ): Promise<{ startTime: number; endTime: number; confidence: number }[]> {
    const response = await fetch(`${this.endpoint}/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation SearchVideo($input: RunPodInput!) {
            runPod(input: $input) {
              id
              status
              result
            }
          }
        `,
        variables: {
          input: {
            name: "video-search",
            input: {
              video_url: videoUrl,
              query: searchQuery,
            },
          },
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`RunPod API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data.runPod.result || []
  }
}

export const runpodClient = new RunPodClient()
