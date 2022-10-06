import React from 'react';
import { Container, Table } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import api from '../../api';


class Schedule extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      event: {},
      entity: {},
      schedule: false,
    };
  }

  async componentDidMount() {
    const [event, entity, schedule] = await Promise.all([
      api.event.get(this.props.params.evid, { start: true }).exec(),
      api.entity.get(api.getApiTokenData().enid, { location: true }).exec(),
      api.schedule.representative.get(api.getApiTokenData().enid, this.props.params.evid).exec(),
    ]);
    if (!schedule) {
      this.setState({ event, entity, schedule });
      return;
    }

    const students = await api.user.getMultiple(schedule.map((s) => s.uid), { uid: true, firstname: true, lastname: true }).exec();
    for (const appointment of schedule) {
      appointment.votes = [];
      const student = students.find((student) => student.uid === appointment.uid);
      if (!student) {
        appointment.studentName = 'Student revoked access';
        continue;
      }

      appointment.studentName = student.firstname || student.lastname ? student.firstname + ' ' + student.lastname : 'Not yet logged in';
    }

    const votes = await api.votes.getOfEntity(api.getApiTokenData().enid, this.props.params.evid).exec();
    for (const { uid, pid } of votes) {
      const s = schedule.find((s) => s.uid === uid);
      if (!s) { continue; }

      const project = await api.project.get(pid, { name: true }).exec();
      s.votes.push(project.name);
    }

    this.setState({ event, entity, schedule });
  }

  schedule = () => {
    if (this.state.schedule === false) {
      return (<h6><em>Loading schedule...</em></h6>)
    }

    if (this.state.schedule === null) {
      return (<h6><em>No schedule has been generated yet</em></h6>);
    }

    if (this.state.schedule.length === 0) {
      return (<h6><em>You are not scheduled for any meetings</em></h6>);
    }

    return (
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Time</th>
            <th>Student</th>
            <th>Projects voted for</th>
          </tr>
        </thead>
        <tbody>
          {
            this.state.schedule.map(({ slot, studentName, votes }, i) => (
              <tr key={i}>
                <td>{slot}</td>
                <td>{studentName}</td>
                <td>
                  <ul className='mb-0'>
                    {votes.map((project) => (
                      <li key={project}>{project}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))
          }
        </tbody>
      </Table>
    )

  }

  render() {
    return (
      <Container className='mt-2'>
        <div className='mb-4'>
          <h1>Your Schedule on {new Date(this.state.event.start).toLocaleString('NL-nl').split(' ')[0]} at {this.state.entity.location}</h1>
        </div>

        {this.schedule()}

      </Container>
    );
  }
}

function ScheduleWithParams(props) {
  const params = useParams();

  return <Schedule {...props} params={params} />
};

export default ScheduleWithParams
