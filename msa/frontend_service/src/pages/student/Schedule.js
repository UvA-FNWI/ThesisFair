import React from 'react';
import { Container, Table } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import api from '../../api';


class Schedule extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      event: {},
      schedule: [],
    };
  }

  async componentDidMount() {
    const [event, schedule] = await Promise.all([
      api.event.get(this.props.params.evid).exec(),
      api.schedule.student.get(api.getApiTokenData().uid, this.props.params.evid).exec(),
    ]);

    const names = await api.entity.getMultiple(schedule.map((s) => s.enid), { name: true, location: true }).exec();
    for (let i = 0; i < schedule.length; i++) {
      schedule[i].entityName = names[i].name;
      schedule[i].entityLocation = names[i].location;
    }

    this.setState({ event, schedule });
  }

  render() {
    return (
      <Container className='mt-2'>
        <div className='mb-4'>
          <h1>Your Schedule on {new Date(this.state.event.start).toLocaleString('NL-nl').split(' ')[0]}</h1>
        </div>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Time</th>
              <th>Organisation</th>
              <th>Place</th>
            </tr>
          </thead>
          <tbody>
            {
              this.state.schedule.map(({ slot, entityName, entityLocation }) => (
                <tr>
                  <td>{slot}</td>
                  <td>{entityName}</td>
                  <td>{entityLocation}</td>
                </tr>
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
