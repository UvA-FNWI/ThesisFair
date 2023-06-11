import React from 'react'
import { Container, Table } from 'react-bootstrap'
import { useParams } from 'react-router-dom'
import api from '../../api'

class Schedule extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      event: {},
      schedule: [],
    }
  }

  async componentDidMount() {
    const [event, schedule] = await Promise.all([
      api.event.get(this.props.params.evid).exec(),
      api.schedule.student.get(api.getApiTokenData().uid, this.props.params.evid).exec(),
    ])
    if (!schedule) {
      this.setState({ event, schedule })
      return
    }

    const entities = await api.entity
      .getMultiple(
        schedule.map(s => s.enid),
        { enid: true, name: true, location: true }
      )
      .exec()
    for (const appointment of schedule) {
      const entity = entities.find(entity => entity.enid === appointment.enid)
      if (!entity) {
        console.error(`Could not find entity with enid ${appointment.enid}`)
        continue
      }

      appointment.entityName = entity.name
      appointment.entityLocation = entity.location
    }

    schedule.sort((a, b) => (a.slot > b.slot ? 1 : -1))
    this.setState({ event, schedule })
  }

  schedule = () => {
    if (this.state.schedule === null) {
      return (
        <h6>
          <em>No schedule has been generated yet</em>
        </h6>
      )
    }

    if (this.state.schedule.length === 0) {
      return (
        <h6>
          <em>You are not scheduled for any meetings</em>
        </h6>
      )
    }

    return (
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Time</th>
            <th>Organisation</th>
            <th>Place</th>
          </tr>
        </thead>
        <tbody>
          {this.state.schedule.map(({ slot, entityName, entityLocation }) => (
            <tr key={slot}>
              <td>{slot}</td>
              <td>{entityName}</td>
              <td>{entityLocation}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    )
  }

  render() {
    return (
      <Container className='mt-2'>
        <div className='mb-4'>
          <h1>Your Schedule on {new Date(this.state.event.start).toLocaleString('NL-nl').split(' ')[0]}</h1>
        </div>

        {this.schedule()}
      </Container>
    )
  }
}

function ScheduleWithParams(props) {
  const params = useParams()

  return <Schedule {...props} params={params} />
}

export default ScheduleWithParams
