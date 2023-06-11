import React from 'react'
import { useParams } from 'react-router-dom'
import { Container, Table, Form, Button } from 'react-bootstrap'
import EditIcon from 'bootstrap-icons/icons/pencil-square.svg'
import SaveIcon from 'bootstrap-icons/icons/check-lg.svg'
import api, { getFileContent } from '../../api'

const getStudentName = student =>
  student.firstname || student.lastname ? (student.firstname || '') + ' ' + (student.lastname || '') : null

class TableRow extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      enid: this.props.appointment.enid,
      entityLocation: this.props.appointment.entityLocation,
      entityName: this.props.appointment.entityName,
      uid: this.props.appointment.uid,
      name: this.props.appointment.name,
      studentnumber: this.props.appointment.studentnumber,
      slot: this.props.appointment.slot,

      editing: false,
    }
  }

  toggleEditing = async () => {
    if (!this.state.editing) {
      this.setState({ editing: true })
      return
    }

    await api.schedule
      .update({
        sid: this.props.appointment.sid,
        uid: this.state.uid,
        enid: this.state.enid,
        slot: this.state.slot,
      })
      .exec()

    const entity = this.props.entities.find(entity => entity.enid === this.state.enid)
    const student = this.props.students.find(student => student.uid === this.state.uid)
    this.setState({
      name: getStudentName(student) || 'Unkown',
      studentnumber: student.studentnumber,
      entityLocation: entity.location,
      entityName: entity.name,
      editing: false,
    })
  }

  render() {
    if (this.state.editing) {
      return (
        <tr>
          <td>
            <Form.Control value={this.state.slot} onChange={e => this.setState({ slot: e.target.value })} />
          </td>
          <td>
            <Form.Select value={this.state.uid} onChange={e => this.setState({ uid: e.target.value })}>
              {this.props.students.map((student, i) => (
                <option key={i} value={student.uid}>
                  {getStudentName(student) || student.studentnumber}
                </option>
              ))}
            </Form.Select>
          </td>
          <td></td>
          <td>
            <Form.Select value={this.state.enid} onChange={e => this.setState({ enid: e.target.value })}>
              {this.props.entities.map(entity => (
                <option key={entity.enid} value={entity.enid}>
                  {entity.name}
                </option>
              ))}
            </Form.Select>
          </td>
          <td>{this.state.entityLocation}</td>
          <td>
            <img src={SaveIcon} alt='save' onClick={this.toggleEditing} />
          </td>
        </tr>
      )
    }

    return (
      <tr>
        <td>{this.state.slot}</td>
        <td>{this.state.studentnumber}</td>
        <td>{this.state.name}</td>
        <td>{this.state.entityName}</td>
        <td>{this.state.entityLocation}</td>
        <td>
          <img src={EditIcon} alt='edit' onClick={this.toggleEditing} />
        </td>
      </tr>
    )
  }
}

class Schedule extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      event: {},
      schedule: [],
      entities: [],
      students: [],
      loading: true,

      uploadingCSV: false,
    }
  }

  async componentDidMount() {
    const event = await api.event.get(this.props.params.evid).exec()
    if (!event) {
      window.location = '/'
      return
    }

    const [entities, students] = await Promise.all([
      api.entity.getMultiple(event.entities, { enid: true, name: true, location: true }).exec(),
      api.user.getAll('student', { uid: true, firstname: true, lastname: true, studentnumber: true }).exec(),
    ])

    this.setState({ event, entities, students }, this.loadSchedule)
  }

  loadSchedule = async () => {
    const schedule = await api.schedule.getAll(this.props.params.evid).exec()

    for (let i = 0; i < schedule.length; i++) {
      const entity = this.state.entities.find(entity => entity.enid === schedule[i].enid)
      schedule[i].entityName = entity.name
      schedule[i].entityLocation = entity.location

      const student = this.state.students.find(student => student.uid === schedule[i].uid)
      if (!student) {
        schedule[i].name = 'Error retrieving name'
        continue
      }

      schedule[i].name = getStudentName(student) || 'Unkown'
      schedule[i].studentnumber = student.studentnumber
    }

    schedule.sort((a, b) => (a.slot > b.slot ? 1 : -1))
    this.setState({ schedule, loading: false })
  }

  generateSchedule = async () => {
    await api.schedule.generate(this.props.params.evid).exec()
    await this.loadSchedule()
  }

  importSchedule = async () => {
    if (this.state.uploadingCSV) {
      return
    }

    this.setState({ uploadingCSV: true })
    const file = await getFileContent(true)
    if (!file) {
      this.setState({ uploadingCSV: false })
      return
    }

    const error = await api.schedule.import(this.props.params.evid, file).exec()
    this.setState({ uploadingCSV: false, errorCSV: error })
    await this.loadSchedule()
  }

  render() {
    return (
      <Container className='mt-2'>
        <div className='mb-4'>
          <h1>Schedule on {new Date(this.state.event.start).toLocaleString('NL-nl').split(' ')[0]}</h1>
        </div>
        {this.state.loading ? (
          <p>Loading schedule</p>
        ) : this.state.schedule.length > 0 ? (
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Time</th>
                <th>StudentID</th>
                <th>Student Name</th>
                <th>Organisation</th>
                <th>Place</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {this.state.schedule.map((appointment, i) => (
                <TableRow
                  key={i}
                  appointment={appointment}
                  entities={this.state.entities}
                  students={this.state.students}
                />
              ))}
            </tbody>
          </Table>
        ) : (
          <div>
            <p>No schedule has been generated or imported yet.</p>
            <Button onClick={this.generateSchedule}>Generate schedule</Button>
            <span className='ps-2 pe-2'>OR</span>
            <Button onClick={this.importSchedule}>
              {this.state.uploadingCSV ? 'Importing CSV, this might take a while...' : 'Import schedule'}
            </Button>
            {this.state.errorCSV ? <p style={{ color: 'red' }}>{this.state.errorCSV}</p> : null}
          </div>
        )}
      </Container>
    )
  }
}

function ScheduleWithParams(props) {
  const params = useParams()

  return <Schedule {...props} params={params} />
}

export default ScheduleWithParams
