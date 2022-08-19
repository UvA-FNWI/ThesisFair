import React from 'react';
import { Container, Table } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import api from '../../api';


class Schedule extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      event: {},
    };
  }

  async componentDidMount() {
    const event = await api.event.get(this.props.params.evid).exec();

    this.setState({ event });
  }

  render() {
    return (
      <Container className='mt-2'>
        <h1>Your Schedule</h1>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Time</th>
              <th>Organisation</th>
              <th>Place</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>9:00</td>
              <td>ASML</td>
              <td>1b</td>
            </tr>
            <tr>
              <td>10:00</td>
              <td>UvA Software Engineering</td>
              <td>1c</td>
            </tr>
            <tr>
              <td>12:00</td>
              <td>UvA bioengineering</td>
              <td>10a</td>
            </tr>
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
