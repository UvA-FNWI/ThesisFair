import { connect as connectUser, disconnect as disconnectUser, Student } from '../msa/user_service/src/database.js'
import { connect as connectVote, disconnect as disconnectVote, Vote } from '../msa/vote_service/src/database.js'
import {
  connect as connectSchedule,
  disconnect as disconnectSchedule,
  Schedule,
} from '../msa/schedule_service/src/database.js'

async function main() {
  await connectUser('mongodb://localhost/user_service')
  await connectVote('mongodb://localhost/vote_service')
  await connectSchedule('mongodb://localhost/schedule_service')

  console.log('Fixing based on votes...')
  for (const { uid, evid, votes } of await Vote.find()) {
    const student = await Student.findById(uid)
    for (const { enid, pid } of votes) {
      if (!student.share.includes(enid)) {
        student.share.push(enid)
      }
    }

    await student.save()
  }

  console.log('Fixing based on schedule...')
  for (const { uid, enid } of await Schedule.find()) {
    await Student.findByIdAndUpdate(uid, { $push: { share: enid } })
  }

  console.log('Done')

  await disconnectUser()
  await disconnectVote()
  await disconnectSchedule()
  return 0
}

main().then(exitCode => {
  process.exitCode = exitCode
})
