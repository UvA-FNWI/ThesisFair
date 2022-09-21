import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Table, Button, Container } from 'react-bootstrap';
import api from '../../api';


class Events extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      events: [],
    };
  }

  async componentDidMount() {
    const events = await api.event.getAll().exec();

    this.setState({ events });
  }

  setEnabled = async (evid, enabled) => {
    await api.event.update({ evid, enabled: !enabled }).exec();
  }

  tableRow = ({ evid, name, description, start, enabled }) => {
    return (
      <tr key={evid}>
        <td>{name}</td>
        <td>{description}</td>
        <td>{new Date(start).toLocaleString('NL-nl')}</td>
        <td>{enabled ? 'Enabled' : 'Hidden'}</td>
        <td><Link to={`event/${evid}`}><Button>More info</Button></Link></td>
      </tr>
    );
  }

  render() {
    return (
      <Container className='mt-2'>
        <h1>Events</h1>


        <Table bordered hover>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Start</th>
              <th>Enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {this.state.events.map(this.tableRow)}
          </tbody>
        </Table>

      </Container>
    );
  }
}

export default Events
