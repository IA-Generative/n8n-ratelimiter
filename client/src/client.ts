import process from 'node:process'
import Bull from 'bull'

// Configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = process.env.REDIS_PORT || 6379 // Connect to proxy by default
const OPERATIONS_PER_MINUTE = Number.parseInt(process.env.OPS_PER_MINUTE as string) || 10
const DURATION_SECONDS = Number.parseInt(process.env.DURATION_SECONDS as string) || 60
const JOB_QUEUE_NAME = 'COUCOU'
// Redis connection configuration for Bull
const redisConnection = {
  host: REDIS_HOST,
  port: +REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
}

// Random data generators
function randomString(length = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
let i = 0

// Bull operations
const operations = [
  // Add a job to a queue
  async (queue: Bull.Queue) => {
    const jobData = {
      workflowId: `wf_${randomString(10)}`,
      executionId: randomString(15),
      loadStaticData: !!true,
      pushRef: 'main',
      streamingEnabled: true,
    }

    const jobOptions = {
      priority: Math.floor(100 + (++i % 100)),
      removeOnComplete: true,
      removeOnFail: true,
    }
    console.log(`New job priority: ${jobOptions.priority}`)
    await queue.add(JOB_QUEUE_NAME, jobData, jobOptions)
    return `ADD JOB workflow:${jobData.workflowId}`
  },
]

// Statistics
const stats = {
  total: 0,
  success: 0,
  errors: 0,
  startTime: Date.now(),
}

// Execute random operation
async function executeRandomOperation(queue: Bull.Queue): Promise<string | void> {
  const operation = operations[Math.floor(Math.random() * operations.length)]

  try {
    const description = await operation(queue)
    stats.success++
    stats.total++

    if (stats.total % 100 === 0) {
      const elapsed = (Date.now() - stats.startTime) / 1000
      const rate = stats.total / elapsed
      console.log(`[${new Date().toISOString()}] Operations: ${stats.total} | Success: ${stats.success} | Errors: ${stats.errors} | Rate: ${rate.toFixed(2)} ops/s`)
    }

    return description
  }
  catch (error: unknown) {
    stats.errors++
    stats.total++
    console.error(`Error: ${(error as Error).message}`)
  }
}

// Main function
async function main(): Promise<void> {
  console.log('=== Bull Load Tester ===')
  console.log(`Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}`)
  console.log(`Target rate: ${OPERATIONS_PER_MINUTE} ops/min`)
  console.log(`Duration: ${DURATION_SECONDS} seconds`)
  console.log('')

  // Create Bull Queue
  const queue = new Bull(JOB_QUEUE_NAME, {
    redis: redisConnection,
  })

  // // Create a worker to process jobs
  // queue.process(JOB_QUEUE_NAME, async (job) => {
  //   // Simulate job processing
  //   console.log(`Processing job ${job.id}: ${job.name}`)

  //   // Simulate some work (random delay between 100ms and 500ms)
  //   await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400))

  //   return { processed: true, jobId: job.id, data: job.data }
  // })

  // Queue events
  queue.on('completed', (_job, _result) => {
    // console.log(`Job ${job.id} completed with result:`, result);
  })

  queue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed: ${err.message}`)
  })

  queue.on('error', (err) => {
    console.error('Queue error:', err)
  })

  console.log('Connected to Redis via Bull')
  console.log('Starting load test...\n')

  // Calculate interval
  const _intervalMs = 60000 / OPERATIONS_PER_MINUTE
  const _endTime = Date.now() + (DURATION_SECONDS * 1000)

  // Run operations
  const interval = setInterval(async () => {
    if (Date.now() >= _endTime) {
      clearInterval(interval)

      // Print final statistics
      const elapsed = (Date.now() - stats.startTime) / 1000
      const rate = stats.total / elapsed

      console.log('\n=== Final Statistics ===')
      console.log(`Total Operations: ${stats.total}`)
      console.log(`Successful: ${stats.success}`)
      console.log(`Errors: ${stats.errors}`)
      console.log(`Duration: ${elapsed.toFixed(2)}s`)
      console.log(`Average Rate: ${rate.toFixed(2)} ops/s`)
      console.log(`Success Rate: ${((stats.success / stats.total) * 100).toFixed(2)}%`)

      // Cleanup
      await queue.close()
      // process.exit(0)
    }

    executeRandomOperation(queue)
  }, _intervalMs)
}

// Start the load tester
main().catch(console.error)

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down...')
  process.exit(0)
})
