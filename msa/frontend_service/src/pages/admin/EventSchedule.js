import React from 'react';
import { useParams } from 'react-router-dom';
import { Container, Table, Form } from 'react-bootstrap';
import EditIcon from 'bootstrap-icons/icons/pencil-square.svg';
import SaveIcon from 'bootstrap-icons/icons/check-lg.svg';
import api from '../../api';

class TableRow extends React.Component {
  constructor(props) {
    super(props);


    this.state = {
      enid: this.props.appointment.enid,
      entityLocation: this.props.appointment.entityLocation,
      entityName: this.props.appointment.entityName,
      uid: this.props.appointment.uid,
      name: this.props.appointment.name,
      slot: this.props.appointment.slot,

      editing: false,
    }
  }

  toggleEditing = async () => {
    if (!this.state.editing) {
      this.setState({ editing: true });
      return;
    }

    await api.schedule.update({
      sid: this.props.appointment.sid,
      uid: this.state.uid,
      enid: this.state.enid,
      slot: this.state.slot,
    }).exec();

    const entity = this.props.entities.find((entity) => entity.enid === this.state.enid);
    const student = this.props.students.find((student) => student.uid === this.state.uid);
    this.setState({
      name: `${student.firstname} ${student.lastname}`,
      entityLocation: entity.location,
      entityName: entity.name,
      editing: false,
    });
  }

  render() {
    if (this.state.editing) {
      return (
        <tr>
          <td><Form.Control value={this.state.slot} onChange={(e) => this.setState({ slot: e.target.value })} /></td>
          <td>
            <Form.Select value={this.state.uid} onChange={(e) => this.setState({ uid: e.target.value })}>
              {this.props.students.map((student) => <option key={student.uid} value={student.uid}>{student.firstname} {student.lastname}</option>)}
            </Form.Select>
          </td>
          <td>
            <Form.Select value={this.state.enid} onChange={(e) => this.setState({ enid: e.target.value })}>
              {this.props.entities.map((entity) => <option key={entity.enid} value={entity.enid}>{entity.name}</option>)}
            </Form.Select>
          </td>
          <td>{this.state.entityLocation}</td>
          <td><img src={SaveIcon} alt='save' onClick={this.toggleEditing} /></td>
        </tr>
      )
    }

    return (
      <tr>
        <td>{this.state.slot}</td>
        <td>{this.state.name}</td>
        <td>{this.state.entityName}</td>
        <td>{this.state.entityLocation}</td>
        <td><img src={EditIcon} alt='edit' onClick={this.toggleEditing} /></td>
      </tr>
    )
  }
}

class Schedule extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      event: {},
      schedule: [],
      entities: [],
      students: [],
    };
  }

  async componentDidMount() {
    const [event, schedule] = await Promise.all([
      api.event.get(this.props.params.evid).exec(),
      api.schedule.getAll(this.props.params.evid).exec(),
    ]);

    const [entities, students] = await Promise.all([
      api.entity.getMultiple(event.entities, { enid: true, name: true, location: true }).exec(),
      api.user.getAll('student', { uid: true, firstname: true, lastname: true }).exec(),
    ]);
    for (let i = 0; i < schedule.length; i++) {
      const entity = entities.find((entity) => entity.enid === schedule[i].enid);
      schedule[i].entityName = entity.name;
      schedule[i].entityLocation = entity.location;

      const student = students.find((student) => student.uid === schedule[i].uid);
      if (!student) {
        schedule[i].name = 'Error retrieving name';
        continue;
      }

      schedule[i].name = student.firstname + ' ' + student.lastname;
    }

    this.setState({ event, schedule, entities, students });
  }

  render() {
    return (
      <Container className='mt-2'>
        <div className='mb-4'>
          <h1>Schedule on {new Date(this.state.event.start).toLocaleString('NL-nl').split(' ')[0]}</h1>
        </div>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Time</th>
              <th>Student</th>
              <th>Organisation</th>
              <th>Place</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {
              this.state.schedule.map((appointment) => (
                <TableRow key={appointment.uid + appointment.slot} appointment={appointment} entities={this.state.entities} students={this.state.students} />
              ))
            }
          </tbody>
        </Table>
      </Container>
    );
  }
}

function ScheduleWithParams(props) {
  const params = useParams();

  return <Schedule {...props} params={params} />
};

export default ScheduleWithParams
